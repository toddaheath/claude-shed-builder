using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Services;

public interface IStlExporter
{
    byte[] Export(Design design);
}

public class StlExporter : IStlExporter
{
    private readonly IMeasurementHelper _measurement;

    public StlExporter(IMeasurementHelper measurement)
    {
        _measurement = measurement;
    }

    public byte[] Export(Design design)
    {
        var triangles = new List<Triangle>();
        var width = (float)_measurement.ToTotalInches(design.WidthFeet, design.WidthInches);
        var depth = (float)_measurement.ToTotalInches(design.DepthFeet, design.DepthInches);
        var height = (float)_measurement.ToTotalInches(design.HeightFeet, design.HeightInches);
        var pitch = (float)design.RoofPitch;

        // Floor
        triangles.AddRange(MakeQuad(
            new Vec3(0, 0, 0), new Vec3(width, 0, 0),
            new Vec3(width, 0, depth), new Vec3(0, 0, depth),
            new Vec3(0, -1, 0)));

        // Walls
        // Front wall (z=0)
        triangles.AddRange(MakeQuad(
            new Vec3(0, 0, 0), new Vec3(width, 0, 0),
            new Vec3(width, height, 0), new Vec3(0, height, 0),
            new Vec3(0, 0, -1)));

        // Back wall (z=depth)
        triangles.AddRange(MakeQuad(
            new Vec3(width, 0, depth), new Vec3(0, 0, depth),
            new Vec3(0, height, depth), new Vec3(width, height, depth),
            new Vec3(0, 0, 1)));

        // Left wall (x=0)
        triangles.AddRange(MakeQuad(
            new Vec3(0, 0, depth), new Vec3(0, 0, 0),
            new Vec3(0, height, 0), new Vec3(0, height, depth),
            new Vec3(-1, 0, 0)));

        // Right wall (x=width)
        triangles.AddRange(MakeQuad(
            new Vec3(width, 0, 0), new Vec3(width, 0, depth),
            new Vec3(width, height, depth), new Vec3(width, height, 0),
            new Vec3(1, 0, 0)));

        // Roof
        if (design.RoofType == RoofType.Gable)
        {
            var rise = width / 2f * pitch / 12f;
            var ridgeY = height + rise;
            var ridgeX = width / 2f;

            // Left roof slope
            triangles.AddRange(MakeQuad(
                new Vec3(0, height, 0), new Vec3(ridgeX, ridgeY, 0),
                new Vec3(ridgeX, ridgeY, depth), new Vec3(0, height, depth),
                ComputeNormal(new Vec3(0, height, 0), new Vec3(ridgeX, ridgeY, 0), new Vec3(ridgeX, ridgeY, depth))));

            // Right roof slope
            triangles.AddRange(MakeQuad(
                new Vec3(ridgeX, ridgeY, 0), new Vec3(width, height, 0),
                new Vec3(width, height, depth), new Vec3(ridgeX, ridgeY, depth),
                ComputeNormal(new Vec3(ridgeX, ridgeY, 0), new Vec3(width, height, 0), new Vec3(width, height, depth))));

            // Front gable triangle
            triangles.Add(new Triangle(
                ComputeNormal(new Vec3(0, height, 0), new Vec3(width, height, 0), new Vec3(ridgeX, ridgeY, 0)),
                new Vec3(0, height, 0), new Vec3(width, height, 0), new Vec3(ridgeX, ridgeY, 0)));

            // Back gable triangle
            triangles.Add(new Triangle(
                ComputeNormal(new Vec3(width, height, depth), new Vec3(0, height, depth), new Vec3(ridgeX, ridgeY, depth)),
                new Vec3(width, height, depth), new Vec3(0, height, depth), new Vec3(ridgeX, ridgeY, depth)));
        }
        else // LeanTo
        {
            var rise = width * pitch / 12f;
            var highY = height + rise;

            // Single slope from left (high) to right (low at wall height)
            triangles.AddRange(MakeQuad(
                new Vec3(0, highY, 0), new Vec3(width, height, 0),
                new Vec3(width, height, depth), new Vec3(0, highY, depth),
                ComputeNormal(new Vec3(0, highY, 0), new Vec3(width, height, 0), new Vec3(width, height, depth))));

            // Front triangle fill
            triangles.Add(new Triangle(
                new Vec3(0, 0, -1),
                new Vec3(0, height, 0), new Vec3(0, highY, 0), new Vec3(width, height, 0)));

            // Back triangle fill (note: this is a simplification)
            triangles.Add(new Triangle(
                new Vec3(0, 0, 1),
                new Vec3(width, height, depth), new Vec3(0, highY, depth), new Vec3(0, height, depth)));
        }

        return WriteBinaryStl(triangles);
    }

    private static List<Triangle> MakeQuad(Vec3 a, Vec3 b, Vec3 c, Vec3 d, Vec3 normal)
    {
        return new List<Triangle>
        {
            new(normal, a, b, c),
            new(normal, a, c, d)
        };
    }

    private static Vec3 ComputeNormal(Vec3 a, Vec3 b, Vec3 c)
    {
        var u = new Vec3(b.X - a.X, b.Y - a.Y, b.Z - a.Z);
        var v = new Vec3(c.X - a.X, c.Y - a.Y, c.Z - a.Z);
        var nx = u.Y * v.Z - u.Z * v.Y;
        var ny = u.Z * v.X - u.X * v.Z;
        var nz = u.X * v.Y - u.Y * v.X;
        var len = MathF.Sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 0)
        {
            nx /= len;
            ny /= len;
            nz /= len;
        }
        return new Vec3(nx, ny, nz);
    }

    private static byte[] WriteBinaryStl(List<Triangle> triangles)
    {
        using var ms = new MemoryStream();
        using var bw = new BinaryWriter(ms);

        // 80-byte header
        bw.Write(new byte[80]);
        // Triangle count
        bw.Write((uint)triangles.Count);

        foreach (var tri in triangles)
        {
            bw.Write(tri.Normal.X);
            bw.Write(tri.Normal.Y);
            bw.Write(tri.Normal.Z);
            bw.Write(tri.V1.X);
            bw.Write(tri.V1.Y);
            bw.Write(tri.V1.Z);
            bw.Write(tri.V2.X);
            bw.Write(tri.V2.Y);
            bw.Write(tri.V2.Z);
            bw.Write(tri.V3.X);
            bw.Write(tri.V3.Y);
            bw.Write(tri.V3.Z);
            bw.Write((ushort)0); // attribute byte count
        }

        return ms.ToArray();
    }

    internal record struct Vec3(float X, float Y, float Z);
    internal record struct Triangle(Vec3 Normal, Vec3 V1, Vec3 V2, Vec3 V3);
}
