using ShedBuilder.Api.Models;
using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Tests.Services;

public class BomCalculatorTests
{
    private readonly BomCalculator _calculator;

    public BomCalculatorTests()
    {
        _calculator = new BomCalculator(new MeasurementHelper());
    }

    private static Design CreateDesign(
        int widthFeet = 8, int widthInches = 0,
        int depthFeet = 10, int depthInches = 0,
        int heightFeet = 8, int heightInches = 0,
        decimal roofPitch = 4m,
        RoofType roofType = RoofType.Gable)
    {
        return new Design
        {
            Id = Guid.NewGuid(),
            Name = "Test Shed",
            WidthFeet = widthFeet,
            WidthInches = widthInches,
            DepthFeet = depthFeet,
            DepthInches = depthInches,
            HeightFeet = heightFeet,
            HeightInches = heightInches,
            RoofPitch = roofPitch,
            RoofType = roofType,
        };
    }

    [Fact]
    public void Calculate_Gable_ReturnsAllCategories()
    {
        var design = CreateDesign();
        var result = _calculator.Calculate(design);

        Assert.Equal(design.Id, result.DesignId);
        Assert.Contains(result.Items, i => i.Category == "Floor");
        Assert.Contains(result.Items, i => i.Category == "Walls");
        Assert.Contains(result.Items, i => i.Category == "Roof");
        Assert.Contains(result.Items, i => i.Category == "Hardware");
    }

    [Fact]
    public void Calculate_LeanTo_ReturnsAllCategories()
    {
        var design = CreateDesign(roofType: RoofType.LeanTo);
        var result = _calculator.Calculate(design);

        Assert.Contains(result.Items, i => i.Category == "Floor");
        Assert.Contains(result.Items, i => i.Category == "Walls");
        Assert.Contains(result.Items, i => i.Category == "Roof");
        Assert.Contains(result.Items, i => i.Category == "Hardware");
    }

    [Fact]
    public void Calculate_Floor_HasJoistsAndPlywood()
    {
        var design = CreateDesign();
        var result = _calculator.Calculate(design);

        var floorItems = result.Items.Where(i => i.Category == "Floor").ToList();
        Assert.Contains(floorItems, i => i.Dimensions.Contains("2×6"));
        Assert.Contains(floorItems, i => i.Dimensions.Contains("3/4\""));
    }

    [Fact]
    public void Calculate_Walls_HasStudsPlatesAndSheathing()
    {
        var design = CreateDesign();
        var result = _calculator.Calculate(design);

        var wallItems = result.Items.Where(i => i.Category == "Walls").ToList();
        Assert.Contains(wallItems, i => i.Dimensions.Contains("2×4") && i.Material == "Framing lumber");
        Assert.Contains(wallItems, i => i.Material == "OSB sheathing");
    }

    [Fact]
    public void Calculate_GableRoof_HasRaftersRidgeShingles()
    {
        var design = CreateDesign(roofType: RoofType.Gable);
        var result = _calculator.Calculate(design);

        var roofItems = result.Items.Where(i => i.Category == "Roof").ToList();
        Assert.Contains(roofItems, i => i.Dimensions.Contains("2×6")); // rafters
        Assert.Contains(roofItems, i => i.Dimensions.Contains("2×8")); // ridge
        Assert.Contains(roofItems, i => i.Material == "Asphalt shingles");
        Assert.Contains(roofItems, i => i.Dimensions.Contains("1/2\""));  // sheathing
    }

    [Fact]
    public void Calculate_LeanToRoof_HasNoRidgeBoard()
    {
        var design = CreateDesign(roofType: RoofType.LeanTo);
        var result = _calculator.Calculate(design);

        var roofItems = result.Items.Where(i => i.Category == "Roof").ToList();
        Assert.DoesNotContain(roofItems, i => i.Dimensions.Contains("2×8"));
        Assert.Contains(roofItems, i => i.Dimensions.Contains("2×6")); // rafters
        Assert.Contains(roofItems, i => i.Material == "Asphalt shingles");
    }

    [Fact]
    public void Calculate_Hardware_HasHangersAndTies()
    {
        var design = CreateDesign();
        var result = _calculator.Calculate(design);

        var hw = result.Items.Where(i => i.Category == "Hardware").ToList();
        Assert.Contains(hw, i => i.Material == "Joist hangers");
        Assert.Contains(hw, i => i.Material == "Hurricane ties");
        Assert.Contains(hw, i => i.Material == "Framing nails");
        Assert.Contains(hw, i => i.Material == "Structural screws");
    }

    [Fact]
    public void Calculate_LargerShed_MoreMaterials()
    {
        var small = CreateDesign(widthFeet: 8, depthFeet: 10);
        var large = CreateDesign(widthFeet: 16, depthFeet: 20);

        var smallResult = _calculator.Calculate(small);
        var largeResult = _calculator.Calculate(large);

        // Larger shed should have more wall studs
        var smallStuds = smallResult.Items.First(i => i.Category == "Walls" && i.Dimensions.Contains("2×4") && i.Material == "Framing lumber" && i.Dimensions.Contains("8'"));
        var largeStuds = largeResult.Items.First(i => i.Category == "Walls" && i.Dimensions.Contains("2×4") && i.Material == "Framing lumber" && i.Dimensions.Contains("8'"));
        Assert.True(largeStuds.Quantity > smallStuds.Quantity);
    }

    [Fact]
    public void Calculate_WithInches_ProducesDifferentResult()
    {
        var even = CreateDesign(widthFeet: 8, widthInches: 0);
        var withInches = CreateDesign(widthFeet: 8, widthInches: 6);

        var evenResult = _calculator.Calculate(even);
        var withInchesResult = _calculator.Calculate(withInches);

        // The floor plywood might be the same but dimensions should differ in some items
        Assert.NotEqual(
            evenResult.Items.Where(i => i.Category == "Floor").First(i => i.Dimensions.Contains("2×6")).Dimensions,
            withInchesResult.Items.Where(i => i.Category == "Floor").First(i => i.Dimensions.Contains("2×6")).Dimensions);
    }

    [Fact]
    public void Calculate_AllQuantitiesPositive()
    {
        var design = CreateDesign();
        var result = _calculator.Calculate(design);

        foreach (var item in result.Items)
        {
            Assert.True(item.Quantity > 0, $"{item.Material} has quantity {item.Quantity}");
        }
    }

    [Fact]
    public void Calculate_SteepPitch_MoreRoofMaterial()
    {
        var low = CreateDesign(roofPitch: 2);
        var steep = CreateDesign(roofPitch: 10);

        var lowResult = _calculator.Calculate(low);
        var steepResult = _calculator.Calculate(steep);

        var lowShingles = lowResult.Items.First(i => i.Material == "Asphalt shingles");
        var steepShingles = steepResult.Items.First(i => i.Material == "Asphalt shingles");
        Assert.True(steepShingles.Quantity >= lowShingles.Quantity);
    }

    [Fact]
    public void Calculate_WithDoor_UsesActualDimensions()
    {
        var design = CreateDesign();
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Door,
            Wall = WallSide.Front,
            WidthInches = 48,
            HeightInches = 84,
            OffsetInches = 12,
            SillHeightInches = 0
        });

        var result = _calculator.Calculate(design);

        var door = result.Items.First(i => i.Material == "Pre-hung door");
        Assert.Equal("48\" × 84\"", door.Dimensions);
        Assert.Equal(1, door.Quantity);
    }

    [Fact]
    public void Calculate_WithWindow_UsesActualDimensions()
    {
        var design = CreateDesign();
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Window,
            Wall = WallSide.Right,
            WidthInches = 30,
            HeightInches = 24,
            OffsetInches = 24,
            SillHeightInches = 48
        });

        var result = _calculator.Calculate(design);

        var window = result.Items.First(i => i.Material == "Window unit");
        Assert.Equal("30\" × 24\"", window.Dimensions);
        Assert.Equal(1, window.Quantity);
    }

    [Fact]
    public void Calculate_WithOpenings_HasOpeningsCategory()
    {
        var design = CreateDesign();
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Door,
            Wall = WallSide.Front,
            WidthInches = 36,
            HeightInches = 80,
            OffsetInches = 12,
            SillHeightInches = 0
        });
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Window,
            Wall = WallSide.Right,
            WidthInches = 36,
            HeightInches = 24,
            OffsetInches = 24,
            SillHeightInches = 48
        });

        var result = _calculator.Calculate(design);

        var openingItems = result.Items.Where(i => i.Category == "Openings").ToList();
        Assert.Contains(openingItems, i => i.Material == "Pre-hung door");
        Assert.Contains(openingItems, i => i.Material == "Window unit");
        Assert.Contains(openingItems, i => i.Material == "Header lumber");
        Assert.Equal(4, openingItems.First(i => i.Material == "Header lumber").Quantity);
    }

    [Fact]
    public void Calculate_MultipleSameSizeDoors_GroupedIntoOneLine()
    {
        var design = CreateDesign();
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Door, Wall = WallSide.Front,
            WidthInches = 36, HeightInches = 80, OffsetInches = 0, SillHeightInches = 0
        });
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Door, Wall = WallSide.Back,
            WidthInches = 36, HeightInches = 80, OffsetInches = 0, SillHeightInches = 0
        });

        var result = _calculator.Calculate(design);

        var doors = result.Items.Where(i => i.Material == "Pre-hung door").ToList();
        Assert.Single(doors);
        Assert.Equal(2, doors[0].Quantity);
    }

    [Fact]
    public void Calculate_DifferentSizeDoors_SeparateLines()
    {
        var design = CreateDesign();
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Door, Wall = WallSide.Front,
            WidthInches = 36, HeightInches = 80, OffsetInches = 0, SillHeightInches = 0
        });
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Door, Wall = WallSide.Back,
            WidthInches = 72, HeightInches = 84, OffsetInches = 0, SillHeightInches = 0
        });

        var result = _calculator.Calculate(design);

        var doors = result.Items.Where(i => i.Material == "Pre-hung door").ToList();
        Assert.Equal(2, doors.Count);
        Assert.Contains(doors, d => d.Dimensions == "36\" × 80\"");
        Assert.Contains(doors, d => d.Dimensions == "72\" × 84\"");
    }

    [Fact]
    public void Calculate_LeanToWithOpenings_ReturnsAllCategories()
    {
        var design = CreateDesign(roofType: RoofType.LeanTo);
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Door, Wall = WallSide.Front,
            WidthInches = 36, HeightInches = 80, OffsetInches = 12, SillHeightInches = 0
        });
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Window, Wall = WallSide.Right,
            WidthInches = 36, HeightInches = 24, OffsetInches = 24, SillHeightInches = 48
        });

        var result = _calculator.Calculate(design);

        Assert.Contains(result.Items, i => i.Category == "Floor");
        Assert.Contains(result.Items, i => i.Category == "Walls");
        Assert.Contains(result.Items, i => i.Category == "Roof");
        Assert.Contains(result.Items, i => i.Category == "Openings");
        Assert.Contains(result.Items, i => i.Material == "Pre-hung door");
        Assert.Contains(result.Items, i => i.Material == "Window unit");
    }

    [Fact]
    public void Calculate_WithOpenings_ReducesOsbSheathing()
    {
        var designNoOpenings = CreateDesign();
        var designWithOpenings = CreateDesign();
        designWithOpenings.Openings.Add(new Opening
        {
            Type = OpeningType.Door, Wall = WallSide.Front,
            WidthInches = 36, HeightInches = 80, OffsetInches = 12, SillHeightInches = 0
        });

        var noOpeningsOsb = _calculator.Calculate(designNoOpenings).Items
            .First(i => i.Material == "OSB sheathing").Quantity;
        var withOpeningsOsb = _calculator.Calculate(designWithOpenings).Items
            .First(i => i.Material == "OSB sheathing").Quantity;

        Assert.True(withOpeningsOsb <= noOpeningsOsb);
    }

    [Fact]
    public void Calculate_SmallShed_AllQuantitiesPositive()
    {
        var design = CreateDesign(widthFeet: 4, depthFeet: 4, heightFeet: 6, roofPitch: 2);
        var result = _calculator.Calculate(design);

        Assert.NotEmpty(result.Items);
        foreach (var item in result.Items)
        {
            Assert.True(item.Quantity > 0, $"{item.Material} has quantity {item.Quantity}");
        }
    }

    [Fact]
    public void Calculate_MultipleSameWindowsGrouped()
    {
        var design = CreateDesign();
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Window, Wall = WallSide.Front,
            WidthInches = 36, HeightInches = 24, OffsetInches = 0, SillHeightInches = 48
        });
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Window, Wall = WallSide.Back,
            WidthInches = 36, HeightInches = 24, OffsetInches = 0, SillHeightInches = 48
        });

        var result = _calculator.Calculate(design);

        var windows = result.Items.Where(i => i.Material == "Window unit").ToList();
        Assert.Single(windows);
        Assert.Equal(2, windows[0].Quantity);
    }

    [Fact]
    public void Calculate_NoOpenings_NoOpeningsCategory()
    {
        var design = CreateDesign();
        var result = _calculator.Calculate(design);

        Assert.DoesNotContain(result.Items, i => i.Category == "Openings");
    }

    [Fact]
    public void Calculate_AllItemsHaveNonEmptyFields()
    {
        var design = CreateDesign();
        design.Openings.Add(new Opening
        {
            Type = OpeningType.Door, Wall = WallSide.Front,
            WidthInches = 36, HeightInches = 80, OffsetInches = 12, SillHeightInches = 0
        });

        var result = _calculator.Calculate(design);

        foreach (var item in result.Items)
        {
            Assert.False(string.IsNullOrWhiteSpace(item.Material), "Material should not be empty");
            Assert.False(string.IsNullOrWhiteSpace(item.Dimensions), "Dimensions should not be empty");
            Assert.False(string.IsNullOrWhiteSpace(item.Unit), "Unit should not be empty");
            Assert.False(string.IsNullOrWhiteSpace(item.Category), "Category should not be empty");
        }
    }
}
