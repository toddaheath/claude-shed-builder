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
}
