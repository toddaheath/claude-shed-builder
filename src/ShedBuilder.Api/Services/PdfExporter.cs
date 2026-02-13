using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Services;

public interface IPdfExporter
{
    byte[] Export(Design design, CostResponse costResponse);
}

public class PdfExporter : IPdfExporter
{
    public byte[] Export(Design design, CostResponse costResponse)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(40);

                page.Header().Column(col =>
                {
                    col.Item().Text("Shed Builder — Design Report")
                        .FontSize(20).Bold().FontColor(Colors.Brown.Medium);
                    col.Item().PaddingTop(5).Text(design.Name)
                        .FontSize(14).SemiBold();
                    col.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                });

                page.Content().PaddingTop(15).Column(col =>
                {
                    // Dimensions section
                    col.Item().Text("Dimensions").FontSize(14).Bold();
                    col.Item().PaddingTop(5).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn();
                            cols.RelativeColumn();
                        });

                        table.Cell().Text("Width:").SemiBold();
                        table.Cell().Text($"{design.WidthFeet}' {design.WidthInches}\"");
                        table.Cell().Text("Depth:").SemiBold();
                        table.Cell().Text($"{design.DepthFeet}' {design.DepthInches}\"");
                        table.Cell().Text("Height:").SemiBold();
                        table.Cell().Text($"{design.HeightFeet}' {design.HeightInches}\"");
                        table.Cell().Text("Roof Pitch:").SemiBold();
                        table.Cell().Text($"{design.RoofPitch}/12");
                        table.Cell().Text("Roof Type:").SemiBold();
                        table.Cell().Text(design.RoofType.ToString());
                    });

                    // Openings
                    if (design.Openings.Count > 0)
                    {
                        col.Item().PaddingTop(15).Text("Openings").FontSize(14).Bold();
                        foreach (var opening in design.Openings)
                        {
                            col.Item().PaddingLeft(10).Text(
                                $"{opening.Type} on {opening.Wall} wall — " +
                                $"{opening.WidthInches}\"W × {opening.HeightInches}\"H");
                        }
                    }

                    // BOM with costs
                    col.Item().PaddingTop(15).Text("Bill of Materials").FontSize(14).Bold();
                    col.Item().PaddingTop(5).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(3);
                            cols.RelativeColumn(2);
                            cols.ConstantColumn(40);
                            cols.ConstantColumn(40);
                            cols.ConstantColumn(60);
                            cols.ConstantColumn(70);
                        });

                        // Header
                        table.Header(header =>
                        {
                            header.Cell().Text("Material").SemiBold();
                            header.Cell().Text("Dimensions").SemiBold();
                            header.Cell().AlignRight().Text("Qty").SemiBold();
                            header.Cell().Text("Unit").SemiBold();
                            header.Cell().AlignRight().Text("Unit $").SemiBold();
                            header.Cell().AlignRight().Text("Total $").SemiBold();
                        });

                        foreach (var item in costResponse.Items)
                        {
                            table.Cell().Text(item.Material);
                            table.Cell().Text(item.Dimensions);
                            table.Cell().AlignRight().Text(item.Quantity.ToString());
                            table.Cell().Text(item.Unit);
                            table.Cell().AlignRight().Text(item.UnitPrice.ToString("C0"));
                            table.Cell().AlignRight().Text(item.TotalPrice.ToString("C0"));
                        }
                    });

                    col.Item().PaddingTop(10).AlignRight()
                        .Text($"Grand Total: {costResponse.GrandTotal:C2}")
                        .FontSize(14).Bold().FontColor(Colors.Brown.Medium);
                });

                page.Footer().AlignCenter()
                    .Text(t =>
                    {
                        t.Span("Generated by Shed Builder — ");
                        t.Span(DateTime.UtcNow.ToString("yyyy-MM-dd"));
                    });
            });
        });

        return document.GeneratePdf();
    }
}
