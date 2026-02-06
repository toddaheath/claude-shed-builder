using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Tests.Integration;

public class CustomWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ShedDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<ShedDbContext>(options =>
                options.UseInMemoryDatabase("IntegrationTest"));
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

    [Fact]
    public async Task CreateAndGetDesign_RoundTrip()
    {
        var create = new CreateDesignRequest
        {
            Name = "Integration Shed",
            WidthFeet = 10,
            DepthFeet = 12,
            HeightFeet = 8,
            RoofPitch = 4,
            RoofType = RoofType.Gable,
        };

        var createResponse = await _client.PostAsJsonAsync("/api/designs", create, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var design = await ReadJson<DesignResponse>(createResponse.Content);
        Assert.NotNull(design);
        Assert.Equal("Integration Shed", design.Name);

        var getResponse = await _client.GetAsync($"/api/designs/{design.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var fetched = await ReadJson<DesignResponse>(getResponse.Content);
        Assert.Equal(design.Id, fetched!.Id);
    }

    [Fact]
    public async Task UpdateDesign_ReturnsUpdated()
    {
        var create = new CreateDesignRequest { Name = "Update Test" };
        var createResponse = await _client.PostAsJsonAsync("/api/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var update = new UpdateDesignRequest { Name = "Updated Name", WidthFeet = 15 };
        var updateResponse = await _client.PutAsJsonAsync($"/api/designs/{design!.Id}", update, JsonOptions);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updated = await ReadJson<DesignResponse>(updateResponse.Content);
        Assert.Equal("Updated Name", updated!.Name);
        Assert.Equal(15, updated.WidthFeet);
    }

    [Fact]
    public async Task DeleteDesign_ReturnsNoContent()
    {
        var create = new CreateDesignRequest { Name = "Delete Me" };
        var createResponse = await _client.PostAsJsonAsync("/api/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var deleteResponse = await _client.DeleteAsync($"/api/designs/{design!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await _client.GetAsync($"/api/designs/{design.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task GetBom_ReturnsBom()
    {
        var create = new CreateDesignRequest
        {
            Name = "BOM Test",
            WidthFeet = 10,
            DepthFeet = 12,
            HeightFeet = 8,
            RoofPitch = 4,
            RoofType = RoofType.Gable,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var bomResponse = await _client.GetAsync($"/api/designs/{design!.Id}/bom");
        Assert.Equal(HttpStatusCode.OK, bomResponse.StatusCode);

        var bom = await ReadJson<BomResponse>(bomResponse.Content);
        Assert.NotNull(bom);
        Assert.NotEmpty(bom.Items);
    }

    [Fact]
    public async Task GetStl_ReturnsFile()
    {
        var create = new CreateDesignRequest
        {
            Name = "STL Test",
            WidthFeet = 8,
            DepthFeet = 10,
            HeightFeet = 8,
            RoofPitch = 4,
        };
        var createResponse = await _client.PostAsJsonAsync("/api/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);

        var stlResponse = await _client.GetAsync($"/api/designs/{design!.Id}/stl");
        Assert.Equal(HttpStatusCode.OK, stlResponse.StatusCode);
        Assert.Equal("application/octet-stream", stlResponse.Content.Headers.ContentType!.MediaType);

        var bytes = await stlResponse.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 84);
    }

    [Fact]
    public async Task Versions_CreateListRestore()
    {
        var create = new CreateDesignRequest { Name = "Version Test", WidthFeet = 8 };
        var createResponse = await _client.PostAsJsonAsync("/api/designs", create, JsonOptions);
        var design = await ReadJson<DesignResponse>(createResponse.Content);
        var id = design!.Id;

        var saveResponse = await _client.PostAsJsonAsync($"/api/designs/{id}/versions",
            new CreateVersionRequest { Label = "Initial" }, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, saveResponse.StatusCode);

        await _client.PutAsJsonAsync($"/api/designs/{id}", new UpdateDesignRequest { WidthFeet = 20 }, JsonOptions);

        var listResponse = await _client.GetAsync($"/api/designs/{id}/versions");
        var versions = await ReadJson<List<VersionResponse>>(listResponse.Content);
        Assert.Single(versions!);
        Assert.Equal("Initial", versions[0].Label);

        var restoreResponse = await _client.PostAsync($"/api/designs/{id}/versions/{versions[0].Id}/restore", null);
        Assert.Equal(HttpStatusCode.OK, restoreResponse.StatusCode);

        var restored = await ReadJson<DesignResponse>(restoreResponse.Content);
        Assert.Equal(8, restored!.WidthFeet);
    }

    [Fact]
    public async Task GetNonExistentDesign_Returns404()
    {
        var response = await _client.GetAsync($"/api/designs/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ListDesigns_ReturnsAll()
    {
        await _client.PostAsJsonAsync("/api/designs", new CreateDesignRequest { Name = "ListA" }, JsonOptions);
        await _client.PostAsJsonAsync("/api/designs", new CreateDesignRequest { Name = "ListB" }, JsonOptions);

        var response = await _client.GetAsync("/api/designs");
        var designs = await ReadJson<List<DesignResponse>>(response.Content);
        Assert.True(designs!.Count >= 2);
    }
}
