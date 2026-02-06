using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using ShedBuilder.Api.Controllers;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Models;
using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Tests.Controllers;

public class DesignsControllerTests : IDisposable
{
    private readonly ShedDbContext _db;
    private readonly Mock<IBomCalculator> _bomMock;
    private readonly Mock<IStlExporter> _stlMock;
    private readonly DesignsController _controller;

    public DesignsControllerTests()
    {
        var options = new DbContextOptionsBuilder<ShedDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new ShedDbContext(options);
        _bomMock = new Mock<IBomCalculator>();
        _stlMock = new Mock<IStlExporter>();
        _controller = new DesignsController(_db, _bomMock.Object, _stlMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    private static CreateDesignRequest DefaultCreateRequest() => new()
    {
        Name = "My Shed",
        WidthFeet = 8,
        DepthFeet = 10,
        HeightFeet = 8,
        RoofPitch = 4,
        RoofType = RoofType.Gable,
    };

    [Fact]
    public async Task List_ReturnsEmptyList()
    {
        var result = await _controller.List();
        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task Create_ReturnsCreatedDesign()
    {
        var result = await _controller.Create(DefaultCreateRequest());
        var created = (result.Result as CreatedAtActionResult)!;
        var design = (created.Value as DesignResponse)!;

        Assert.Equal("My Shed", design.Name);
        Assert.Equal(8, design.WidthFeet);
        Assert.Equal(10, design.DepthFeet);
    }

    [Fact]
    public async Task Get_ExistingDesign_ReturnsDesign()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var getResult = await _controller.Get(id);
        Assert.Equal("My Shed", getResult.Value!.Name);
    }

    [Fact]
    public async Task Get_NonExistent_ReturnsNotFound()
    {
        var result = await _controller.Get(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Update_ChangesFields()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var updateResult = await _controller.Update(id, new UpdateDesignRequest
        {
            Name = "Updated",
            WidthFeet = 12,
        });

        Assert.Equal("Updated", updateResult.Value!.Name);
        Assert.Equal(12, updateResult.Value!.WidthFeet);
        Assert.Equal(10, updateResult.Value!.DepthFeet); // unchanged
    }

    [Fact]
    public async Task Update_NonExistent_ReturnsNotFound()
    {
        var result = await _controller.Update(Guid.NewGuid(), new UpdateDesignRequest { Name = "X" });
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_RemovesDesign()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var deleteResult = await _controller.Delete(id);
        Assert.IsType<NoContentResult>(deleteResult);

        var getResult = await _controller.Get(id);
        Assert.IsType<NotFoundResult>(getResult.Result);
    }

    [Fact]
    public async Task Delete_NonExistent_ReturnsNotFound()
    {
        var result = await _controller.Delete(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetBom_CallsBomCalculator()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var expectedBom = new BomResponse
        {
            DesignId = id,
            Items = new List<BomItem> { new() { Material = "Wood", Dimensions = "2x4", Quantity = 10, Unit = "pieces", Category = "Walls" } }
        };
        _bomMock.Setup(b => b.Calculate(It.IsAny<Design>())).Returns(expectedBom);

        var result = await _controller.GetBom(id);
        Assert.Equal(id, result.Value!.DesignId);
        Assert.Single(result.Value!.Items);
    }

    [Fact]
    public async Task GetBom_NonExistent_ReturnsNotFound()
    {
        var result = await _controller.GetBom(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetStl_ReturnsFile()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        _stlMock.Setup(s => s.Export(It.IsAny<Design>())).Returns(new byte[] { 1, 2, 3 });

        var result = await _controller.GetStl(id);
        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/octet-stream", fileResult.ContentType);
        Assert.Equal(3, fileResult.FileContents.Length);
    }

    [Fact]
    public async Task GetStl_NonExistent_ReturnsNotFound()
    {
        var result = await _controller.GetStl(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ListVersions_Empty()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var result = await _controller.ListVersions(id);
        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task ListVersions_NonExistent_ReturnsNotFound()
    {
        var result = await _controller.ListVersions(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task CreateVersion_SavesSnapshot()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var versionResult = await _controller.CreateVersion(id, new CreateVersionRequest { Label = "v1" });
        var version = ((versionResult.Result as CreatedAtActionResult)!.Value as VersionResponse)!;

        Assert.Equal("v1", version.Label);
        Assert.Equal(1, version.VersionNumber);
        Assert.Equal(8, version.WidthFeet);
    }

    [Fact]
    public async Task CreateVersion_IncrementsVersionNumber()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        await _controller.CreateVersion(id, new CreateVersionRequest { Label = "v1" });
        var v2Result = await _controller.CreateVersion(id, new CreateVersionRequest { Label = "v2" });
        var v2 = ((v2Result.Result as CreatedAtActionResult)!.Value as VersionResponse)!;

        Assert.Equal(2, v2.VersionNumber);
    }

    [Fact]
    public async Task GetVersion_ReturnsVersion()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var versionResult = await _controller.CreateVersion(id, new CreateVersionRequest { Label = "v1" });
        var vid = ((versionResult.Result as CreatedAtActionResult)!.Value as VersionResponse)!.Id;

        var getResult = await _controller.GetVersion(id, vid);
        Assert.Equal("v1", getResult.Value!.Label);
    }

    [Fact]
    public async Task GetVersion_WrongDesign_ReturnsNotFound()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var versionResult = await _controller.CreateVersion(id, new CreateVersionRequest { Label = "v1" });
        var vid = ((versionResult.Result as CreatedAtActionResult)!.Value as VersionResponse)!.Id;

        var result = await _controller.GetVersion(Guid.NewGuid(), vid);
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task RestoreVersion_RestoresDimensions()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        // Save version
        var versionResult = await _controller.CreateVersion(id, new CreateVersionRequest { Label = "original" });
        var vid = ((versionResult.Result as CreatedAtActionResult)!.Value as VersionResponse)!.Id;

        // Modify design
        await _controller.Update(id, new UpdateDesignRequest { WidthFeet = 20 });

        // Verify changed
        var modified = await _controller.Get(id);
        Assert.Equal(20, modified.Value!.WidthFeet);

        // Restore
        var restored = await _controller.RestoreVersion(id, vid);
        Assert.Equal(8, restored.Value!.WidthFeet);
    }

    [Fact]
    public async Task RestoreVersion_NonExistentDesign_ReturnsNotFound()
    {
        var result = await _controller.RestoreVersion(Guid.NewGuid(), Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task RestoreVersion_NonExistentVersion_ReturnsNotFound()
    {
        var createResult = await _controller.Create(DefaultCreateRequest());
        var id = ((createResult.Result as CreatedAtActionResult)!.Value as DesignResponse)!.Id;

        var result = await _controller.RestoreVersion(id, Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task List_OrdersByUpdatedAtDescending()
    {
        await _controller.Create(new CreateDesignRequest { Name = "First" });
        await _controller.Create(new CreateDesignRequest { Name = "Second" });

        var result = await _controller.List();
        Assert.Equal("Second", result.Value![0].Name);
    }
}
