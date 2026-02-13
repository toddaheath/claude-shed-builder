using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Tests.Services;

public class PriceServiceTests
{
    private readonly PriceService _service = new();

    [Theory]
    [InlineData("Framing lumber", 5.50)]
    [InlineData("Pressure-treated lumber", 8.50)]
    [InlineData("Plywood sheathing", 42.00)]
    [InlineData("OSB sheathing", 28.00)]
    [InlineData("Asphalt shingles", 35.00)]
    [InlineData("Pre-hung door", 185.00)]
    [InlineData("Window unit", 125.00)]
    public void GetUnitPrice_KnownMaterial_ReturnsPrice(string material, decimal expectedPrice)
    {
        var price = _service.GetUnitPrice(material, "any");
        Assert.Equal(expectedPrice, price);
    }

    [Fact]
    public void GetUnitPrice_UnknownMaterial_ReturnsZero()
    {
        var price = _service.GetUnitPrice("Unknown material", "any");
        Assert.Equal(0m, price);
    }

    [Fact]
    public void GetUnitPrice_CaseInsensitive()
    {
        var price = _service.GetUnitPrice("FRAMING LUMBER", "any");
        Assert.Equal(5.50m, price);
    }
}
