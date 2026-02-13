namespace ShedBuilder.Api.Services;

public interface IPriceService
{
    decimal GetUnitPrice(string material, string dimensions);
}

public class PriceService : IPriceService
{
    private static readonly Dictionary<string, decimal> PriceTable = new(StringComparer.OrdinalIgnoreCase)
    {
        // Lumber
        { "Pressure-treated lumber", 8.50m },
        { "Framing lumber", 5.50m },

        // Sheathing
        { "Plywood sheathing", 42.00m },
        { "OSB sheathing", 28.00m },

        // Roofing
        { "Asphalt shingles", 35.00m },

        // Hardware
        { "Joist hangers", 2.50m },
        { "Hurricane ties", 1.75m },
        { "Framing nails", 6.00m },
        { "Structural screws", 8.00m },

        // Openings
        { "Pre-hung door", 185.00m },
        { "Window unit", 125.00m },
        { "Header lumber", 12.00m },
    };

    public decimal GetUnitPrice(string material, string dimensions)
    {
        if (PriceTable.TryGetValue(material, out var price))
            return price;

        return 0m;
    }
}
