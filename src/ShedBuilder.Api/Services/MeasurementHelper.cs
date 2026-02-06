namespace ShedBuilder.Api.Services;

public interface IMeasurementHelper
{
    double ToTotalInches(int feet, int inches);
    (int Feet, int Inches) FromTotalInches(double totalInches);
    double ToFeetDecimal(int feet, int inches);
}

public class MeasurementHelper : IMeasurementHelper
{
    public double ToTotalInches(int feet, int inches)
    {
        return feet * 12.0 + inches;
    }

    public (int Feet, int Inches) FromTotalInches(double totalInches)
    {
        var total = (int)Math.Round(totalInches);
        var feet = total / 12;
        var inches = total % 12;
        return (feet, inches);
    }

    public double ToFeetDecimal(int feet, int inches)
    {
        return feet + inches / 12.0;
    }
}
