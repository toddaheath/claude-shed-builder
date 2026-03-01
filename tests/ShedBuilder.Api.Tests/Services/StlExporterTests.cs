using ShedBuilder.Api.Models;
using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Tests.Services;

public class StlExporterTests
{
    private readonly StlExporter _exporter;

    public StlExporterTests()
    {
        _exporter = new StlExporter(new MeasurementHelper());
    }

    private static Design CreateDesign(RoofType roofType = RoofType.Gable)
    {
        return new Design
        {
            Id = Guid.NewGuid(),
            Name = "Test Shed",
            WidthFeet = 8,
            WidthInches = 0,
            DepthFeet = 10,
            DepthInches = 0,
            HeightFeet = 8,
            HeightInches = 0,
            RoofPitch = 4,
            RoofType = roofType,
        };
    }

    [Fact]
    public void Export_ReturnsNonEmptyBytes()
    {
        var design = CreateDesign();
        var result = _exporter.Export(design);
        Assert.NotNull(result);
        Assert.True(result.Length > 0);
    }

    [Fact]
    public void Export_HasValidBinaryStlHeader()
    {
        var design = CreateDesign();
        var result = _exporter.Export(design);

        // Binary STL: 80-byte header + 4-byte triangle count + N * 50 bytes
        Assert.True(result.Length >= 84);
    }

    [Fact]
    public void Export_TriangleCountMatchesData()
    {
        var design = CreateDesign();
        var result = _exporter.Export(design);

        var triangleCount = BitConverter.ToUInt32(result, 80);
        var expectedLength = 84 + triangleCount * 50;
        Assert.Equal(expectedLength, (uint)result.Length);
    }

    [Fact]
    public void Export_Gable_HasExpectedTriangles()
    {
        var design = CreateDesign(RoofType.Gable);
        var result = _exporter.Export(design);

        var triangleCount = BitConverter.ToUInt32(result, 80);
        // Floor: 2, 4 walls: 8, 2 roof slopes: 4, 2 gable triangles: 2 = 16
        Assert.Equal(16u, triangleCount);
    }

    [Fact]
    public void Export_LeanTo_HasExpectedTriangles()
    {
        var design = CreateDesign(RoofType.LeanTo);
        var result = _exporter.Export(design);

        var triangleCount = BitConverter.ToUInt32(result, 80);
        // Floor: 2, 4 walls: 8, 1 roof slope: 2, 2 triangles: 2 = 14
        Assert.Equal(14u, triangleCount);
    }

    [Fact]
    public void Export_DifferentDimensions_DifferentOutput()
    {
        var small = CreateDesign();
        var large = new Design
        {
            Id = Guid.NewGuid(),
            Name = "Big Shed",
            WidthFeet = 16,
            WidthInches = 0,
            DepthFeet = 20,
            DepthInches = 0,
            HeightFeet = 10,
            HeightInches = 0,
            RoofPitch = 6,
            RoofType = RoofType.Gable,
        };

        var smallResult = _exporter.Export(small);
        var largeResult = _exporter.Export(large);

        // Same triangle count but different vertex data
        Assert.Equal(smallResult.Length, largeResult.Length);
        Assert.False(smallResult.SequenceEqual(largeResult));
    }

    [Fact]
    public void Export_NormalsAreValid()
    {
        var design = CreateDesign();
        var result = _exporter.Export(design);

        var triangleCount = BitConverter.ToUInt32(result, 80);
        for (uint i = 0; i < triangleCount; i++)
        {
            var offset = 84 + i * 50;
            var nx = BitConverter.ToSingle(result, (int)offset);
            var ny = BitConverter.ToSingle(result, (int)offset + 4);
            var nz = BitConverter.ToSingle(result, (int)offset + 8);

            // Normal should not be NaN or infinity
            Assert.False(float.IsNaN(nx), $"Triangle {i} has NaN normal X");
            Assert.False(float.IsNaN(ny), $"Triangle {i} has NaN normal Y");
            Assert.False(float.IsNaN(nz), $"Triangle {i} has NaN normal Z");
            Assert.False(float.IsInfinity(nx));
            Assert.False(float.IsInfinity(ny));
            Assert.False(float.IsInfinity(nz));
        }
    }

    [Fact]
    public void Export_WithInches_ProducesValidStl()
    {
        var design = new Design
        {
            Id = Guid.NewGuid(),
            Name = "Inches Shed",
            WidthFeet = 8,
            WidthInches = 6,
            DepthFeet = 10,
            DepthInches = 3,
            HeightFeet = 8,
            HeightInches = 0,
            RoofPitch = 4,
            RoofType = RoofType.Gable,
        };

        var result = _exporter.Export(design);
        var triangleCount = BitConverter.ToUInt32(result, 80);
        var expectedLength = 84 + triangleCount * 50;
        Assert.Equal(expectedLength, (uint)result.Length);
    }

    [Fact]
    public void Export_SteepPitch_ProducesValidStl()
    {
        var design = new Design
        {
            Id = Guid.NewGuid(),
            Name = "Steep Shed",
            WidthFeet = 8,
            WidthInches = 0,
            DepthFeet = 10,
            DepthInches = 0,
            HeightFeet = 8,
            HeightInches = 0,
            RoofPitch = 12,
            RoofType = RoofType.Gable,
        };

        var result = _exporter.Export(design);
        Assert.True(result.Length >= 84);

        // All normals should be finite
        var triangleCount = BitConverter.ToUInt32(result, 80);
        for (uint i = 0; i < triangleCount; i++)
        {
            var offset = 84 + i * 50;
            for (int c = 0; c < 3; c++)
            {
                var n = BitConverter.ToSingle(result, (int)offset + c * 4);
                Assert.False(float.IsNaN(n) || float.IsInfinity(n));
            }
        }
    }

    [Fact]
    public void Export_VerticesAreFinite()
    {
        var design = CreateDesign();
        var result = _exporter.Export(design);

        var triangleCount = BitConverter.ToUInt32(result, 80);
        for (uint i = 0; i < triangleCount; i++)
        {
            var offset = 84 + i * 50;
            for (int v = 0; v < 9; v++) // 3 vertices × 3 floats
            {
                var value = BitConverter.ToSingle(result, (int)offset + 12 + v * 4);
                Assert.False(float.IsNaN(value), $"Triangle {i} vertex component {v} is NaN");
                Assert.False(float.IsInfinity(value), $"Triangle {i} vertex component {v} is Infinity");
            }
        }
    }
}
