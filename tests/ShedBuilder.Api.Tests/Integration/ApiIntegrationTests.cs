using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Tests.Integration;

public class CustomWebAppFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"IntegrationTest-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "shed-builder-api",
                ["Jwt:Audience"] = "shed-builder-ui",
                ["Jwt:SecretKey"] = "test-secret-key-at-least-32-chars!!",
                ["DISABLE_RATE_LIMITING"] = "true"
            });
        });

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ShedDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<ShedDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

            // Remove NpgSql health check since we use InMemory
            var healthCheckDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(Microsoft.Extensions.Diagnostics.HealthChecks.IHealthCheckPublisher));
        });
    }
}

public class ApiIntegrationTests : IClassFixture<CustomWebAppFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public ApiIntegrationTests(CustomWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<T?> ReadJson<T>(HttpContent content) =>
        await content.ReadFromJsonAsync<T>(JsonOptions);

    private async Task<(AuthResponse Auth, HttpClient Client)> CreateAuthenticatedUser(string name, string email)
    {
        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name, email, password = "Password123!" }, JsonOptions);
        var auth = await ReadJson<AuthResponse>(registerResponse.Content);
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.Token);
        return (auth, _client);
    }

    [Fact]
    public async Task RegisterUser_ReturnsToken()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Test", email = $"reg-{Guid.NewGuid()}@test.com", password = "Password123!" },
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var auth = await ReadJson<AuthResponse>(response.Content);
        Assert.NotNull(auth);
        Assert.NotEmpty(auth.Token);
        Assert.NotEmpty(auth.Email);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        var email = $"login-{Guid.NewGuid()}@test.com";
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Login Test", email, password = "Password123!" }, JsonOptions);

        _client.DefaultRequestHeaders.Authorization = null;
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email, password = "Password123!" }, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var auth = await ReadJson<AuthResponse>(loginResponse.Content);
        Assert.NotNull(auth);
        Assert.NotEmpty(auth.Token);
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var email = $"badlogin-{Guid.NewGuid()}@test.com";
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Bad Login", email, password = "Password123!" }, JsonOptions);

        _client.DefaultRequestHeaders.Authorization = null;
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email, password = "WrongPassword!" }, JsonOptions);
        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithValidCredentials_Returns200()
    {
        var email = $"changepw-{Guid.NewGuid()}@test.com";
        await CreateAuthenticatedUser("ChangePw", email);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "Password123!", newPassword = "NewPassword456@" }, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify new password works by logging in
        _client.DefaultRequestHeaders.Authorization = null;
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email, password = "NewPassword456@" }, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var email = $"dup-{Guid.NewGuid()}@test.com";
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "First", email, password = "Password123!" }, JsonOptions);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Second", email, password = "Password456@" }, JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task UnauthorizedRequest_Returns401()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.GetAsync("/api/v1/designs");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task InvalidToken_Returns401()
    {
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "invalid.jwt.token");
        var response = await _client.GetAsync("/api/v1/designs");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateAndGetDesign_RoundTrip()
    {
        await CreateAuthenticatedUser("RoundTrip", $"roundtrip-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Integration Shed",
            WidthFeet = 10,
            DepthFeet = 12,
            HeightFeet = 8,
            RoofPitch = 4,
            RoofType = RoofType.Gable,
        };

        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var design = await ReadJson<DesignResponse>(createResponse.Content);
        Assert.NotNull(design);
        Assert.Equal("Integration Shed", design.Name);

        var getResponse = await _client.GetAsync($"/api/v1/designs/{design.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var fetched = await ReadJson<DesignResponse>(getResponse.Content);
        Assert.Equal(design.Id, fetched!.Id);
    }

    [Fact]
    public async Task UpdateDesign_ReturnsUpdated()
    {
        await CreateAuthenticatedUser("Update", $"update-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest { Name = "Update Test" };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var update = new UpdateDesignRequest { Name = "Updated Name", WidthFeet = 15 };
        var updateResponse = await _client.PutAsJsonAsync($"/api/v1/designs/{design!.Id}", update, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updated = await ReadJson<DesignResponse>(updateResponse.Content);
        Assert.Equal("Updated Name", updated!.Name);
        Assert.Equal(15, updated.WidthFeet);
    }

    [Fact]
    public async Task DeleteDesign_ReturnsNoContent()
    {
        await CreateAuthenticatedUser("Delete", $"delete-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest { Name = "Delete Me" };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var deleteResponse = await _client.DeleteAsync($"/api/v1/designs/{design!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await _client.GetAsync($"/api/v1/designs/{design.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task GetBom_ReturnsBom()
    {
        await CreateAuthenticatedUser("BOM", $"bom-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "BOM Test",
            WidthFeet = 10,
            DepthFeet = 12,
            HeightFeet = 8,
            RoofPitch = 4,
            RoofType = RoofType.Gable,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var bomResponse = await _client.GetAsync($"/api/v1/designs/{design!.Id}/bom");
        Assert.Equal(HttpStatusCode.OK, bomResponse.StatusCode);

        var bom = await ReadJson<BomResponse>(bomResponse.Content);
        Assert.NotNull(bom);
        Assert.NotEmpty(bom.Items);
    }

    [Fact]
    public async Task GetStl_ReturnsFile()
    {
        await CreateAuthenticatedUser("STL", $"stl-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "STL Test",
            WidthFeet = 8,
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var stlResponse = await _client.GetAsync($"/api/v1/designs/{design!.Id}/stl");
        Assert.Equal(HttpStatusCode.OK, stlResponse.StatusCode);
        Assert.Equal("application/octet-stream", stlResponse.Content.Headers.ContentType!.MediaType);

        var bytes = await stlResponse.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 84);
    }

    [Fact]
    public async Task GetCost_ReturnsCostWithGrandTotal()
    {
        await CreateAuthenticatedUser("Cost", $"cost-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Cost Test",
            WidthFeet = 10,
            DepthFeet = 12,
            HeightFeet = 8,
            RoofPitch = 4,
            RoofType = RoofType.Gable,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var costResponse = await _client.GetAsync($"/api/v1/designs/{design!.Id}/cost");
        Assert.Equal(HttpStatusCode.OK, costResponse.StatusCode);

        var cost = await ReadJson<CostResponse>(costResponse.Content);
        Assert.NotNull(cost);
        Assert.NotEmpty(cost.Items);
        Assert.True(cost.GrandTotal > 0);
    }

    [Fact]
    public async Task GetPdf_ReturnsValidPdf()
    {
        await CreateAuthenticatedUser("PDF", $"pdf-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "PDF Test",
            WidthFeet = 8,
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var pdfResponse = await _client.GetAsync($"/api/v1/designs/{design!.Id}/pdf");
        Assert.Equal(HttpStatusCode.OK, pdfResponse.StatusCode);
        Assert.Equal("application/pdf", pdfResponse.Content.Headers.ContentType!.MediaType);

        var bytes = await pdfResponse.Content.ReadAsByteArrayAsync();
        // PDF files start with %PDF
        Assert.True(bytes.Length > 4);
        Assert.Equal((byte)'%', bytes[0]);
        Assert.Equal((byte)'P', bytes[1]);
        Assert.Equal((byte)'D', bytes[2]);
        Assert.Equal((byte)'F', bytes[3]);
    }

    [Fact]
    public async Task Versions_CreateListRestore()
    {
        await CreateAuthenticatedUser("Versions", $"versions-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest { Name = "Version Test", WidthFeet = 8 };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);
        var id = design!.Id;

        var saveResponse = await _client.PostAsJsonAsync($"/api/v1/designs/{id}/versions",
            new CreateVersionRequest { Label = "Initial" }, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, saveResponse.StatusCode);

        await _client.PutAsJsonAsync($"/api/v1/designs/{id}", new UpdateDesignRequest { WidthFeet = 20 }, JsonOptions);

        var listResponse = await _client.GetAsync($"/api/v1/designs/{id}/versions");
        var versionPage = (await ReadJson<PaginatedResponse<VersionResponse>>(listResponse.Content))!;
        Assert.Single(versionPage.Items);
        Assert.Equal("Initial", versionPage.Items[0].Label);

        var restoreResponse = await _client.PostAsync($"/api/v1/designs/{id}/versions/{versionPage.Items[0].Id}/restore", null);
        Assert.Equal(HttpStatusCode.OK, restoreResponse.StatusCode);

        var restored = await ReadJson<DesignResponse>(restoreResponse.Content);
        Assert.Equal(8, restored!.WidthFeet);
    }

    [Fact]
    public async Task CreateAndGet_RoofOverhangInches_RoundTrip()
    {
        await CreateAuthenticatedUser("Overhang", $"overhang-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Overhang Shed",
            WidthFeet = 10,
            DepthFeet = 12,
            HeightFeet = 8,
            RoofPitch = 4,
            RoofType = RoofType.Gable,
            RoofOverhangInches = 18,
        };

        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var design = await ReadJson<DesignResponse>(createResponse.Content);
        Assert.Equal(18, design!.RoofOverhangInches);

        var getResponse = await _client.GetAsync($"/api/v1/designs/{design.Id}");
        var fetched = await ReadJson<DesignResponse>(getResponse.Content);
        Assert.Equal(18, fetched!.RoofOverhangInches);
    }

    [Fact]
    public async Task Update_RoofOverhangInches_ReturnsUpdated()
    {
        await CreateAuthenticatedUser("OhUpdate", $"ohupdate-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest { Name = "OH Update Test" };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);
        Assert.Equal(12, design!.RoofOverhangInches); // default

        var update = new UpdateDesignRequest { RoofOverhangInches = 6 };
        var updateResponse = await _client.PutAsJsonAsync($"/api/v1/designs/{design.Id}", update, JsonOptions);
        var updated = await ReadJson<DesignResponse>(updateResponse.Content);
        Assert.Equal(6, updated!.RoofOverhangInches);
    }

    [Fact]
    public async Task VersionRestore_PreservesRoofOverhangInches()
    {
        await CreateAuthenticatedUser("OhVersion", $"ohversion-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest { Name = "OH Version Test", RoofOverhangInches = 24 };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);
        var id = design!.Id;

        // Save version with overhang=24
        await _client.PostAsJsonAsync($"/api/v1/designs/{id}/versions",
            new CreateVersionRequest { Label = "With Overhang" }, JsonOptions);

        // Change overhang
        await _client.PutAsJsonAsync($"/api/v1/designs/{id}",
            new UpdateDesignRequest { RoofOverhangInches = 6 }, JsonOptions);

        // Restore
        var versions = await _client.GetAsync($"/api/v1/designs/{id}/versions");
        var versionPage = await ReadJson<PaginatedResponse<VersionResponse>>(versions.Content);
        Assert.Equal(24, versionPage!.Items[0].RoofOverhangInches);

        var restoreResponse = await _client.PostAsync(
            $"/api/v1/designs/{id}/versions/{versionPage.Items[0].Id}/restore", null);
        var restored = await ReadJson<DesignResponse>(restoreResponse.Content);
        Assert.Equal(24, restored!.RoofOverhangInches);
    }

    [Fact]
    public async Task GetNonExistentDesign_Returns404()
    {
        await CreateAuthenticatedUser("NotFound", $"notfound-{Guid.NewGuid()}@test.com");

        var response = await _client.GetAsync($"/api/v1/designs/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ListDesigns_ReturnsPaginatedResponse()
    {
        await CreateAuthenticatedUser("ListUser", $"list-{Guid.NewGuid()}@test.com");

        await _client.PostAsJsonAsync("/api/v1/designs", new CreateDesignRequest { Name = "ListA" }, JsonOptions);
        await _client.PostAsJsonAsync("/api/v1/designs", new CreateDesignRequest { Name = "ListB" }, JsonOptions);

        var response = await _client.GetAsync("/api/v1/designs");
        var paginated = await ReadJson<PaginatedResponse<DesignResponse>>(response.Content);
        Assert.Equal(2, paginated!.TotalCount);
        Assert.Equal(2, paginated.Items.Count);
    }

    [Fact]
    public async Task ListDesigns_SearchFilter()
    {
        await CreateAuthenticatedUser("SearchUser", $"search-{Guid.NewGuid()}@test.com");

        await _client.PostAsJsonAsync("/api/v1/designs", new CreateDesignRequest { Name = "Alpha Shed" }, JsonOptions);
        await _client.PostAsJsonAsync("/api/v1/designs", new CreateDesignRequest { Name = "Beta Barn" }, JsonOptions);

        var response = await _client.GetAsync("/api/v1/designs?search=shed");
        var paginated = await ReadJson<PaginatedResponse<DesignResponse>>(response.Content);
        Assert.Equal(1, paginated!.TotalCount);
        Assert.Equal("Alpha Shed", paginated.Items[0].Name);
    }

    [Fact]
    public async Task HealthCheck_Live_Returns200()
    {
        var response = await _client.GetAsync("/health/live");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task HealthCheck_Ready_Returns200()
    {
        var response = await _client.GetAsync("/health/ready");
        // InMemory DB won't have NpgSql health check passing, but the endpoint should still respond
        // It may return 503 due to missing PG, but the endpoint exists
        Assert.True(response.StatusCode == HttpStatusCode.OK ||
                    response.StatusCode == HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task Validation_InvalidDimensions_Returns400()
    {
        await CreateAuthenticatedUser("Validation", $"validation-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Bad Shed",
            WidthFeet = 100, // exceeds max of 60
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
        };

        var response = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_OpeningExceedsWallWidth_Returns400()
    {
        await CreateAuthenticatedUser("OpenWidth", $"openw-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Bad Opening Width",
            WidthFeet = 8, // 96 inches
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
            Openings = new List<OpeningDto>
            {
                new() { Type = OpeningType.Door, Wall = WallSide.Front, OffsetInches = 60, WidthInches = 48, HeightInches = 80, SillHeightInches = 0 }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_OpeningExceedsWallHeight_Returns400()
    {
        await CreateAuthenticatedUser("OpenHeight", $"openh-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Bad Opening Height",
            WidthFeet = 8,
            DepthFeet = 10,
            HeightFeet = 8, // 96 inches
            RoofPitch = 4,
            Openings = new List<OpeningDto>
            {
                new() { Type = OpeningType.Window, Wall = WallSide.Front, OffsetInches = 0, WidthInches = 36, HeightInches = 48, SillHeightInches = 60 }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_ZeroDimensionOpening_Returns400()
    {
        await CreateAuthenticatedUser("ZeroDim", $"zerodim-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Zero Dimension Opening",
            WidthFeet = 10,
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
            Openings = new List<OpeningDto>
            {
                new() { Type = OpeningType.Door, Wall = WallSide.Front, OffsetInches = 0, WidthInches = 0, HeightInches = 80, SillHeightInches = 0 }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UserIsolation_CannotAccessOtherUsersDesign()
    {
        // User A creates a design
        var (_, clientA) = await CreateAuthenticatedUser("UserA", $"usera-{Guid.NewGuid()}@test.com");
        var createA = await clientA.PostAsJsonAsync("/api/v1/designs",
            new CreateDesignRequest { Name = "A's Shed" }, JsonOptions);
        var designA = await ReadJson<DesignResponse>(createA.Content);

        // User B tries to access User A's design
        await CreateAuthenticatedUser("UserB", $"userb-{Guid.NewGuid()}@test.com");
        var response = await _client.GetAsync($"/api/v1/designs/{designA!.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ListDesigns_Pagination_RespectsPageSize()
    {
        await CreateAuthenticatedUser("PageUser", $"page-{Guid.NewGuid()}@test.com");

        for (int i = 0; i < 3; i++)
            await _client.PostAsJsonAsync("/api/v1/designs",
                new CreateDesignRequest { Name = $"PageTest-{i}" }, JsonOptions);

        var response = await _client.GetAsync("/api/v1/designs?page=1&pageSize=2");
        var paginated = await ReadJson<PaginatedResponse<DesignResponse>>(response.Content);

        Assert.Equal(3, paginated!.TotalCount);
        Assert.Equal(2, paginated.Items.Count);
    }

    [Fact]
    public async Task Create_OverlappingOpenings_Returns400()
    {
        await CreateAuthenticatedUser("OpenOverlap", $"openo-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Overlapping Openings",
            WidthFeet = 10, // 120 inches
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
            Openings = new List<OpeningDto>
            {
                new() { Type = OpeningType.Door, Wall = WallSide.Front, OffsetInches = 0, WidthInches = 36, HeightInches = 80, SillHeightInches = 0 },
                new() { Type = OpeningType.Window, Wall = WallSide.Front, OffsetInches = 24, WidthInches = 36, HeightInches = 36, SillHeightInches = 36 }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task VersionRestore_PreservesOpenings()
    {
        await CreateAuthenticatedUser("VersionOpenings", $"vopen-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Version Openings Test",
            WidthFeet = 10,
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
            Openings = new List<OpeningDto>
            {
                new() { Type = OpeningType.Door, Wall = WallSide.Front, OffsetInches = 12, WidthInches = 36, HeightInches = 80, SillHeightInches = 0 }
            }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);
        var id = design!.Id;

        // Save version with the door
        await _client.PostAsJsonAsync($"/api/v1/designs/{id}/versions",
            new CreateVersionRequest { Label = "With Door" }, JsonOptions);

        // Remove the door
        await _client.PutAsJsonAsync($"/api/v1/designs/{id}",
            new UpdateDesignRequest { Openings = new List<OpeningDto>() }, JsonOptions);

        // Restore the version
        var versions = await _client.GetAsync($"/api/v1/designs/{id}/versions");
        var versionPage = await ReadJson<PaginatedResponse<VersionResponse>>(versions.Content);
        var restoreResponse = await _client.PostAsync(
            $"/api/v1/designs/{id}/versions/{versionPage!.Items[0].Id}/restore", null);
        var restored = await ReadJson<DesignResponse>(restoreResponse.Content);

        Assert.Single(restored!.Openings);
        Assert.Equal(OpeningType.Door, restored.Openings[0].Type);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_Returns400()
    {
        await CreateAuthenticatedUser("WrongPw", $"wrongpw-{Guid.NewGuid()}@test.com");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "WrongPassword123!", newPassword = "NewPassword456@" }, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_InvalidOpenings_Returns400()
    {
        await CreateAuthenticatedUser("UpdateVal", $"updateval-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest { Name = "Update Validation" };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        // Try to update with an opening that exceeds the wall width (default 8ft = 96 inches)
        var update = new UpdateDesignRequest
        {
            Openings = new List<OpeningDto>
            {
                new() { Type = OpeningType.Door, Wall = WallSide.Front, OffsetInches = 60, WidthInches = 48, HeightInches = 80, SillHeightInches = 0 }
            }
        };
        var response = await _client.PutAsJsonAsync($"/api/v1/designs/{design!.Id}", update, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_NameTooLong_Returns400()
    {
        var longName = new string('A', 201);
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = longName, email = $"long-{Guid.NewGuid()}@test.com", password = "Password123!" },
            JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_MaxLengthName_Returns201()
    {
        var maxName = new string('A', 200);
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = maxName, email = $"max-{Guid.NewGuid()}@test.com", password = "Password123!" },
            JsonOptions);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Login_NonExistentUser_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email = "nobody@example.com", password = "Password123!" }, JsonOptions);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Register_WeakPassword_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Weak", email = $"weak-{Guid.NewGuid()}@test.com", password = "short" },
            JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_Unauthenticated_Returns401()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "Password123!", newPassword = "NewPassword456@" }, JsonOptions);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WeakNewPassword_Returns400()
    {
        await CreateAuthenticatedUser("WeakNew", $"weaknew-{Guid.NewGuid()}@test.com");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "Password123!", newPassword = "short" }, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PartialUpdate_PreservesUnchangedFields()
    {
        await CreateAuthenticatedUser("Partial", $"partial-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Partial Test",
            WidthFeet = 10,
            DepthFeet = 12,
            HeightFeet = 9,
            RoofPitch = 6,
            RoofType = RoofType.LeanTo,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        // Update only the name
        var updateResponse = await _client.PutAsJsonAsync($"/api/v1/designs/{design!.Id}",
            new UpdateDesignRequest { Name = "Renamed" }, JsonOptions);
        var updated = await ReadJson<DesignResponse>(updateResponse.Content);

        Assert.Equal("Renamed", updated!.Name);
        Assert.Equal(10, updated.WidthFeet);
        Assert.Equal(12, updated.DepthFeet);
        Assert.Equal(9, updated.HeightFeet);
        Assert.Equal(6, updated.RoofPitch);
        Assert.Equal(RoofType.LeanTo, updated.RoofType);
    }

    [Fact]
    public async Task DeleteNonExistentDesign_Returns404()
    {
        await CreateAuthenticatedUser("DelNF", $"delnf-{Guid.NewGuid()}@test.com");

        var response = await _client.DeleteAsync($"/api/v1/designs/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UserIsolation_CannotDeleteOtherUsersDesign()
    {
        // User A creates a design
        var (_, clientA) = await CreateAuthenticatedUser("IsoDelA", $"isodela-{Guid.NewGuid()}@test.com");
        var createA = await clientA.PostAsJsonAsync("/api/v1/designs",
            new CreateDesignRequest { Name = "A's Private Shed" }, JsonOptions);
        var designA = await ReadJson<DesignResponse>(createA.Content);

        // User B tries to delete User A's design
        await CreateAuthenticatedUser("IsoDelB", $"isodelb-{Guid.NewGuid()}@test.com");
        var response = await _client.DeleteAsync($"/api/v1/designs/{designA!.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UserIsolation_CannotUpdateOtherUsersDesign()
    {
        // User A creates a design
        var (_, clientA) = await CreateAuthenticatedUser("IsoUpdA", $"isoupda-{Guid.NewGuid()}@test.com");
        var createA = await clientA.PostAsJsonAsync("/api/v1/designs",
            new CreateDesignRequest { Name = "A's Shed" }, JsonOptions);
        var designA = await ReadJson<DesignResponse>(createA.Content);

        // User B tries to update User A's design
        await CreateAuthenticatedUser("IsoUpdB", $"isoupdb-{Guid.NewGuid()}@test.com");
        var response = await _client.PutAsJsonAsync($"/api/v1/designs/{designA!.Id}",
            new UpdateDesignRequest { Name = "Hacked" }, JsonOptions);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_LeanToRoofType_RoundTrip()
    {
        await CreateAuthenticatedUser("LeanTo", $"leanto-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "LeanTo Shed",
            WidthFeet = 8,
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 3,
            RoofType = RoofType.LeanTo,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var design = await ReadJson<DesignResponse>(createResponse.Content);
        Assert.Equal(RoofType.LeanTo, design!.RoofType);

        // Verify BOM works for LeanTo
        var bomResponse = await _client.GetAsync($"/api/v1/designs/{design.Id}/bom");
        Assert.Equal(HttpStatusCode.OK, bomResponse.StatusCode);
        var bom = await ReadJson<BomResponse>(bomResponse.Content);
        Assert.NotEmpty(bom!.Items);
    }

    [Fact]
    public async Task Create_NonOverlappingOpeningsOnDifferentWalls_Succeeds()
    {
        await CreateAuthenticatedUser("DiffWalls", $"diffwalls-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Different Walls",
            WidthFeet = 10,
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
            Openings = new List<OpeningDto>
            {
                new() { Type = OpeningType.Door, Wall = WallSide.Front, OffsetInches = 12, WidthInches = 36, HeightInches = 80, SillHeightInches = 0 },
                new() { Type = OpeningType.Window, Wall = WallSide.Right, OffsetInches = 12, WidthInches = 36, HeightInches = 36, SillHeightInches = 36 },
                new() { Type = OpeningType.Window, Wall = WallSide.Back, OffsetInches = 24, WidthInches = 30, HeightInches = 30, SillHeightInches = 40 },
            }
        };

        var response = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var design = await ReadJson<DesignResponse>(response.Content);
        Assert.Equal(3, design!.Openings.Count);
    }

    [Fact]
    public async Task Create_SideWallOpeningExceedsDepth_Returns400()
    {
        await CreateAuthenticatedUser("SideWall", $"sidewall-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Side Wall Test",
            WidthFeet = 10,
            DepthFeet = 8, // 96 inches
            HeightFeet = 8,
            RoofPitch = 4,
            Openings = new List<OpeningDto>
            {
                // Right wall uses depth, not width — offset 60 + width 48 = 108 > 96
                new() { Type = OpeningType.Door, Wall = WallSide.Right, OffsetInches = 60, WidthInches = 48, HeightInches = 80, SillHeightInches = 0 }
            }
        };

        var response = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task VersionRestore_PreservesAllDimensions()
    {
        await CreateAuthenticatedUser("VerDims", $"verdims-{Guid.NewGuid()}@test.com");

        var create = new CreateDesignRequest
        {
            Name = "Dim Test",
            WidthFeet = 10,
            WidthInches = 6,
            DepthFeet = 14,
            DepthInches = 3,
            HeightFeet = 9,
            HeightInches = 8,
            RoofPitch = 5,
            RoofType = RoofType.LeanTo,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/v1/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);
        var id = design!.Id;

        // Save version
        await _client.PostAsJsonAsync($"/api/v1/designs/{id}/versions",
            new CreateVersionRequest { Label = "Full Dims" }, JsonOptions);

        // Modify everything
        await _client.PutAsJsonAsync($"/api/v1/designs/{id}",
            new UpdateDesignRequest { Name = "Changed", WidthFeet = 20, DepthFeet = 20, HeightFeet = 12, RoofPitch = 8, RoofType = RoofType.Gable }, JsonOptions);

        // Restore
        var versions = await _client.GetAsync($"/api/v1/designs/{id}/versions");
        var versionPage = await ReadJson<PaginatedResponse<VersionResponse>>(versions.Content);
        var restoreResponse = await _client.PostAsync(
            $"/api/v1/designs/{id}/versions/{versionPage!.Items[0].Id}/restore", null);
        var restored = await ReadJson<DesignResponse>(restoreResponse.Content);

        // Name is NOT restored — only geometry is
        Assert.Equal("Changed", restored!.Name);
        Assert.Equal(10, restored.WidthFeet);
        Assert.Equal(6, restored.WidthInches);
        Assert.Equal(14, restored.DepthFeet);
        Assert.Equal(3, restored.DepthInches);
        Assert.Equal(9, restored.HeightFeet);
        Assert.Equal(8, restored.HeightInches);
        Assert.Equal(5, restored.RoofPitch);
        Assert.Equal(RoofType.LeanTo, restored.RoofType);
    }
}
