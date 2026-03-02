using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Services;

public interface IBomCalculator
{
    BomResponse Calculate(Design design);
}

public class BomCalculator : IBomCalculator
{
    private readonly IMeasurementHelper _measurement;

    public BomCalculator(IMeasurementHelper measurement)
    {
        _measurement = measurement;
    }

    public BomResponse Calculate(Design design)
    {
        var items = new List<BomItem>();
        var widthInches = _measurement.ToTotalInches(design.WidthFeet, design.WidthInches);
        var depthInches = _measurement.ToTotalInches(design.DepthFeet, design.DepthInches);
        var heightInches = _measurement.ToTotalInches(design.HeightFeet, design.HeightInches);
        var roofPitch = (double)design.RoofPitch;

        items.AddRange(CalculateFloor(widthInches, depthInches));
        items.AddRange(CalculateWalls(widthInches, depthInches, heightInches, design.Openings));
        items.AddRange(CalculateRoof(widthInches, depthInches, roofPitch, design.RoofType, (double)design.RoofOverhangInches));
        items.AddRange(CalculateHardware(widthInches, depthInches, heightInches, design.RoofType));
        items.AddRange(CalculateOpenings(design.Openings));

        return new BomResponse
        {
            DesignId = design.Id,
            Items = items
        };
    }

    private List<BomItem> CalculateFloor(double widthIn, double depthIn)
    {
        var items = new List<BomItem>();

        // Floor joists: 2x6 at 16" OC spanning the width
        var joistCount = (int)Math.Ceiling(depthIn / 16.0) + 1;
        items.Add(new BomItem
        {
            Material = "Pressure-treated lumber",
            Dimensions = $"2×6 × {LengthLabel(widthIn)}",
            Quantity = joistCount,
            Unit = "pieces",
            Category = "Floor"
        });

        // Rim joists (2 along depth)
        items.Add(new BomItem
        {
            Material = "Pressure-treated lumber",
            Dimensions = $"2×6 × {LengthLabel(depthIn)}",
            Quantity = 2,
            Unit = "pieces",
            Category = "Floor"
        });

        // 3/4" plywood sheathing
        var floorSqFt = (widthIn * depthIn) / 144.0;
        var plywoodSheets = (int)Math.Ceiling(floorSqFt / 32.0); // 4x8 sheet = 32 sq ft
        items.Add(new BomItem
        {
            Material = "Plywood sheathing",
            Dimensions = "3/4\" × 4' × 8'",
            Quantity = plywoodSheets,
            Unit = "sheets",
            Category = "Floor"
        });

        return items;
    }

    private List<BomItem> CalculateWalls(double widthIn, double depthIn, double heightIn, List<Opening> openings)
    {
        var items = new List<BomItem>();

        // Wall studs at 16" OC for all 4 walls
        var widthStudCount = (int)Math.Ceiling(widthIn / 16.0) + 1;
        var depthStudCount = (int)Math.Ceiling(depthIn / 16.0) + 1;
        var totalStuds = (widthStudCount * 2) + (depthStudCount * 2);

        items.Add(new BomItem
        {
            Material = "Framing lumber",
            Dimensions = $"2×4 × {LengthLabel(heightIn)}",
            Quantity = totalStuds,
            Unit = "pieces",
            Category = "Walls"
        });

        // Top plates (double) and bottom plate (single) for width walls
        items.Add(new BomItem
        {
            Material = "Framing lumber",
            Dimensions = $"2×4 × {LengthLabel(widthIn)}",
            Quantity = 6, // 2 walls × (2 top + 1 bottom)
            Unit = "pieces",
            Category = "Walls"
        });

        // Top plates (double) and bottom plate (single) for depth walls
        items.Add(new BomItem
        {
            Material = "Framing lumber",
            Dimensions = $"2×4 × {LengthLabel(depthIn)}",
            Quantity = 6, // 2 walls × (2 top + 1 bottom)
            Unit = "pieces",
            Category = "Walls"
        });

        // 7/16" OSB wall sheathing (subtract openings)
        var openingArea = openings.Sum(o => (double)o.WidthInches * o.HeightInches) / 144.0;
        var wallArea = 2 * (widthIn + depthIn) * heightIn / 144.0 - openingArea;
        var osbSheets = (int)Math.Ceiling(Math.Max(wallArea, 0) / 32.0);
        items.Add(new BomItem
        {
            Material = "OSB sheathing",
            Dimensions = "7/16\" × 4' × 8'",
            Quantity = osbSheets,
            Unit = "sheets",
            Category = "Walls"
        });

        return items;
    }

    private List<BomItem> CalculateRoof(double widthIn, double depthIn, double roofPitch, RoofType roofType, double overhangIn)
    {
        var items = new List<BomItem>();

        if (roofType == RoofType.Gable)
        {
            // Gable roof: ridge runs along depth, rafters span half the width + overhang
            var halfSpan = widthIn / 2.0;
            var rise = halfSpan * roofPitch / 12.0;
            var rafterSpan = halfSpan + overhangIn;
            var rafterRise = rafterSpan * roofPitch / 12.0;
            var rafterLength = Math.Sqrt(rafterSpan * rafterSpan + rafterRise * rafterRise);

            // Rafters at 16" OC on each side
            var roofDepth = depthIn + 2 * overhangIn;
            var raftersPerSide = (int)Math.Ceiling(roofDepth / 16.0) + 1;
            items.Add(new BomItem
            {
                Material = "Framing lumber",
                Dimensions = $"2×6 × {LengthLabel(rafterLength)}",
                Quantity = raftersPerSide * 2,
                Unit = "pieces",
                Category = "Roof"
            });

            // Ridge board
            items.Add(new BomItem
            {
                Material = "Framing lumber",
                Dimensions = $"2×8 × {LengthLabel(roofDepth)}",
                Quantity = 1,
                Unit = "pieces",
                Category = "Roof"
            });

            // Roof sheathing (both sides)
            var roofSqFtPerSide = (rafterLength * roofDepth) / 144.0;
            var roofSheets = (int)Math.Ceiling(roofSqFtPerSide * 2 / 32.0);
            items.Add(new BomItem
            {
                Material = "Plywood sheathing",
                Dimensions = "1/2\" × 4' × 8'",
                Quantity = roofSheets,
                Unit = "sheets",
                Category = "Roof"
            });

            // Asphalt shingles (3 bundles per 100 sq ft)
            var totalRoofSqFt = roofSqFtPerSide * 2;
            var shingleBundles = (int)Math.Ceiling(totalRoofSqFt / 100.0 * 3);
            items.Add(new BomItem
            {
                Material = "Asphalt shingles",
                Dimensions = "3-tab",
                Quantity = shingleBundles,
                Unit = "bundles",
                Category = "Roof"
            });
        }
        else // LeanTo
        {
            // Lean-to: single slope from high side to low side across width + overhang
            var rafterSpan = widthIn + overhangIn;
            var rafterRise = rafterSpan * roofPitch / 12.0;
            var rafterLength = Math.Sqrt(rafterSpan * rafterSpan + rafterRise * rafterRise);

            var roofDepth = depthIn + 2 * overhangIn;
            var rafterCount = (int)Math.Ceiling(roofDepth / 16.0) + 1;
            items.Add(new BomItem
            {
                Material = "Framing lumber",
                Dimensions = $"2×6 × {LengthLabel(rafterLength)}",
                Quantity = rafterCount,
                Unit = "pieces",
                Category = "Roof"
            });

            // Roof sheathing
            var roofSqFt = (rafterLength * roofDepth) / 144.0;
            var roofSheets = (int)Math.Ceiling(roofSqFt / 32.0);
            items.Add(new BomItem
            {
                Material = "Plywood sheathing",
                Dimensions = "1/2\" × 4' × 8'",
                Quantity = roofSheets,
                Unit = "sheets",
                Category = "Roof"
            });

            // Asphalt shingles
            var shingleBundles = (int)Math.Ceiling(roofSqFt / 100.0 * 3);
            items.Add(new BomItem
            {
                Material = "Asphalt shingles",
                Dimensions = "3-tab",
                Quantity = shingleBundles,
                Unit = "bundles",
                Category = "Roof"
            });
        }

        return items;
    }

    private List<BomItem> CalculateHardware(double widthIn, double depthIn, double heightIn, RoofType roofType)
    {
        var items = new List<BomItem>();

        // Joist hangers for floor joists
        var joistCount = (int)Math.Ceiling(depthIn / 16.0) + 1;
        items.Add(new BomItem
        {
            Material = "Joist hangers",
            Dimensions = "2×6",
            Quantity = joistCount * 2,
            Unit = "pieces",
            Category = "Hardware"
        });

        // Hurricane ties for rafters
        var rafterCount = roofType == RoofType.Gable
            ? ((int)Math.Ceiling(depthIn / 16.0) + 1) * 2
            : (int)Math.Ceiling(depthIn / 16.0) + 1;
        items.Add(new BomItem
        {
            Material = "Hurricane ties",
            Dimensions = "Rafter-to-plate",
            Quantity = rafterCount,
            Unit = "pieces",
            Category = "Hardware"
        });

        // Nails (16d framing)
        var lbsOfNails = (int)Math.Ceiling((widthIn + depthIn + heightIn) / 100.0 * 5);
        items.Add(new BomItem
        {
            Material = "Framing nails",
            Dimensions = "16d × 3-1/2\"",
            Quantity = Math.Max(lbsOfNails, 5),
            Unit = "lbs",
            Category = "Hardware"
        });

        // Screws (structural)
        items.Add(new BomItem
        {
            Material = "Structural screws",
            Dimensions = "#10 × 3\"",
            Quantity = Math.Max(lbsOfNails, 5),
            Unit = "lbs",
            Category = "Hardware"
        });

        return items;
    }

    private List<BomItem> CalculateOpenings(List<Opening> openings)
    {
        var items = new List<BomItem>();
        if (openings.Count == 0) return items;

        // Group doors by dimensions so each distinct size gets its own line
        var doorGroups = openings
            .Where(o => o.Type == OpeningType.Door)
            .GroupBy(o => (o.WidthInches, o.HeightInches));

        foreach (var group in doorGroups)
        {
            items.Add(new BomItem
            {
                Material = "Pre-hung door",
                Dimensions = $"{group.Key.WidthInches}\" × {group.Key.HeightInches}\"",
                Quantity = group.Count(),
                Unit = "units",
                Category = "Openings"
            });
        }

        // Group windows by dimensions
        var windowGroups = openings
            .Where(o => o.Type == OpeningType.Window)
            .GroupBy(o => (o.WidthInches, o.HeightInches));

        foreach (var group in windowGroups)
        {
            items.Add(new BomItem
            {
                Material = "Window unit",
                Dimensions = $"{group.Key.WidthInches}\" × {group.Key.HeightInches}\"",
                Quantity = group.Count(),
                Unit = "units",
                Category = "Openings"
            });
        }

        // Headers for each opening
        items.Add(new BomItem
        {
            Material = "Header lumber",
            Dimensions = "2×8",
            Quantity = openings.Count * 2,
            Unit = "pieces",
            Category = "Openings"
        });

        return items;
    }

    private static string LengthLabel(double inches)
    {
        var feet = (int)(inches / 12);
        var remaining = (int)Math.Round(inches % 12);
        if (remaining == 0)
            return $"{feet}'";
        return $"{feet}'-{remaining}\"";
    }
}
