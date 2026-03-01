using ShedBuilder.Api.Models;
using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Tests.Services;

public class PdfExporterTests
{
    public PdfExporterTests()
    {
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }

    private static Design CreateTestDesign(RoofType roofType = RoofType.Gable) => new()
    {
        Id = Guid.NewGuid(),
        Name = "Test Shed",
        WidthFeet = 10,
        DepthFeet = 12,
        HeightFeet = 8,
        RoofPitch = 4,
        RoofType = roofType,
        Openings = new List<Opening>
        {
            new() { Type = OpeningType.Door, Wall = WallSide.Front, WidthInches = 36, HeightInches = 80, OffsetInches = 24 },
        },
    };

    private static CostResponse CreateTestCost(Guid designId) => new()
    {
        DesignId = designId,
        Items = new List<CostBomItem>
        {
            new() { Material = "Framing lumber", Dimensions = "2x4", Quantity = 10, Unit = "pieces", Category = "Walls", UnitPrice = 5.50m, TotalPrice = 55m },
            new() { Material = "Pre-hung door", Dimensions = "36x80", Quantity = 1, Unit = "units", Category = "Openings", UnitPrice = 185m, TotalPrice = 185m },
        },
        GrandTotal = 240m,
    };

    [Fact]
    public void Export_GeneratesNonEmptyPdf()
    {
        var exporter = new PdfExporter();
        var design = CreateTestDesign();
        var costResponse = CreateTestCost(design.Id);

        var pdf = exporter.Export(design, costResponse);
        Assert.NotNull(pdf);
        Assert.True(pdf.Length > 100);
        Assert.Equal((byte)'%', pdf[0]);
        Assert.Equal((byte)'P', pdf[1]);
        Assert.Equal((byte)'D', pdf[2]);
        Assert.Equal((byte)'F', pdf[3]);
    }

    [Fact]
    public void Export_LeanToRoof_GeneratesValidPdf()
    {
        var exporter = new PdfExporter();
        var design = CreateTestDesign(RoofType.LeanTo);
        var costResponse = CreateTestCost(design.Id);

        var pdf = exporter.Export(design, costResponse);
        Assert.NotNull(pdf);
        Assert.True(pdf.Length > 100);
    }

    [Fact]
    public void Export_NoOpenings_GeneratesValidPdf()
    {
        var exporter = new PdfExporter();
        var design = CreateTestDesign();
        design.Openings.Clear();
        var costResponse = CreateTestCost(design.Id);

        var pdf = exporter.Export(design, costResponse);
        Assert.NotNull(pdf);
        Assert.True(pdf.Length > 100);
    }

    [Fact]
    public void Export_EmptyCostItems_GeneratesValidPdf()
    {
        var exporter = new PdfExporter();
        var design = CreateTestDesign();
        var costResponse = new CostResponse
        {
            DesignId = design.Id,
            Items = new List<CostBomItem>(),
            GrandTotal = 0m,
        };

        var pdf = exporter.Export(design, costResponse);
        Assert.NotNull(pdf);
        Assert.True(pdf.Length > 100);
    }
}
