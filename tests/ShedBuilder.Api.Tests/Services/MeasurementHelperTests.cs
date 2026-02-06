using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Tests.Services;

public class MeasurementHelperTests
{
    private readonly MeasurementHelper _helper = new();

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(1, 0, 12)]
    [InlineData(0, 6, 6)]
    [InlineData(8, 6, 102)]
    [InlineData(10, 0, 120)]
    [InlineData(12, 11, 155)]
    public void ToTotalInches_ReturnsCorrectValue(int feet, int inches, double expected)
    {
        Assert.Equal(expected, _helper.ToTotalInches(feet, inches));
    }

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(12, 1, 0)]
    [InlineData(6, 0, 6)]
    [InlineData(102, 8, 6)]
    [InlineData(120, 10, 0)]
    [InlineData(155, 12, 11)]
    public void FromTotalInches_ReturnsCorrectValue(double totalInches, int expectedFeet, int expectedInches)
    {
        var (feet, inches) = _helper.FromTotalInches(totalInches);
        Assert.Equal(expectedFeet, feet);
        Assert.Equal(expectedInches, inches);
    }

    [Theory]
    [InlineData(0, 0, 0.0)]
    [InlineData(8, 0, 8.0)]
    [InlineData(8, 6, 8.5)]
    [InlineData(10, 3, 10.25)]
    public void ToFeetDecimal_ReturnsCorrectValue(int feet, int inches, double expected)
    {
        Assert.Equal(expected, _helper.ToFeetDecimal(feet, inches), 4);
    }

    [Fact]
    public void FromTotalInches_RoundsCorrectly()
    {
        var (feet, inches) = _helper.FromTotalInches(12.4);
        Assert.Equal(1, feet);
        Assert.Equal(0, inches);
    }

    [Fact]
    public void FromTotalInches_RoundsUpCorrectly()
    {
        var (feet, inches) = _helper.FromTotalInches(12.6);
        Assert.Equal(1, feet);
        Assert.Equal(1, inches);
    }

    [Fact]
    public void ToTotalInches_LargeValue()
    {
        Assert.Equal(480, _helper.ToTotalInches(40, 0));
    }
}
