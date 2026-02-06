using System.ComponentModel.DataAnnotations;

namespace ShedBuilder.Api.Models;

public record CreateDesignRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; init; } = string.Empty;
    public int WidthFeet { get; init; } = 8;
    public int WidthInches { get; init; }
    public int DepthFeet { get; init; } = 10;
    public int DepthInches { get; init; }
    public int HeightFeet { get; init; } = 8;
    public int HeightInches { get; init; }
    public decimal RoofPitch { get; init; } = 4m;
    public RoofType RoofType { get; init; } = RoofType.Gable;
}

public record UpdateDesignRequest
{
    [MaxLength(200)]
    public string? Name { get; init; }
    public int? WidthFeet { get; init; }
    public int? WidthInches { get; init; }
    public int? DepthFeet { get; init; }
    public int? DepthInches { get; init; }
    public int? HeightFeet { get; init; }
    public int? HeightInches { get; init; }
    public decimal? RoofPitch { get; init; }
    public RoofType? RoofType { get; init; }
}

public record DesignResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int WidthFeet { get; init; }
    public int WidthInches { get; init; }
    public int DepthFeet { get; init; }
    public int DepthInches { get; init; }
    public int HeightFeet { get; init; }
    public int HeightInches { get; init; }
    public decimal RoofPitch { get; init; }
    public RoofType RoofType { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateVersionRequest
{
    [Required]
    [MaxLength(200)]
    public string Label { get; init; } = string.Empty;
}

public record VersionResponse
{
    public Guid Id { get; init; }
    public Guid DesignId { get; init; }
    public int VersionNumber { get; init; }
    public string Label { get; init; } = string.Empty;
    public int WidthFeet { get; init; }
    public int WidthInches { get; init; }
    public int DepthFeet { get; init; }
    public int DepthInches { get; init; }
    public int HeightFeet { get; init; }
    public int HeightInches { get; init; }
    public decimal RoofPitch { get; init; }
    public RoofType RoofType { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record BomItem
{
    public string Material { get; init; } = string.Empty;
    public string Dimensions { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public string Unit { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
}

public record BomResponse
{
    public Guid DesignId { get; init; }
    public List<BomItem> Items { get; init; } = new();
}
