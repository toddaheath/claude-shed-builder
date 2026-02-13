using ShedBuilder.Api.Models;
using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Tests.Services;

public class PdfExporterTests
{
    public PdfExporterTests()
    {
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }

    [Fact]
    public void Export_GeneratesNonEmptyPdf()
    {
        var exporter = new PdfExporter();
        var design = new Design
        {
            Id = Guid.NewGuid(),
            Name = "Test Shed",
            WidthFeet = 10,
            DepthFeet = 12,
            HeightFeet = 8,
            RoofPitch = 4,
            RoofType = RoofType.Gable,
            Openings = new List<Opening>
            {
                new() { Type = OpeningType.Door, Wall = WallSide.Front, WidthInches = 36, HeightInches = 80, OffsetInches = 24 },
            },
        };
        var costResponse = new CostResponse
        {
            DesignId = design.Id,
            Items = new List<CostBomItem>
            {
                new() { Material = "Framing lumber", Dimensions = "2x4", Quantity = 10, Unit = "pieces", Category = "Walls", UnitPrice = 5.50m, TotalPrice = 55m },
                new() { Material = "Pre-hung door", Dimensions = "36x80", Quantity = 1, Unit = "units", Category = "Openings", UnitPrice = 185m, TotalPrice = 185m },
            },
            GrandTotal = 240m,
        };

        var pdf = exporter.Export(design, costResponse);
        Assert.NotNull(pdf);
        Assert.True(pdf.Length > 100);
        // Check PDF header
        Assert.Equal((byte)'%', pdf[0]);
        Assert.Equal((byte)'P', pdf[1]);
        Assert.Equal((byte)'D', pdf[2]);
        Assert.Equal((byte)'F', pdf[3]);
    }
}
