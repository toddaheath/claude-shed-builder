using System.ComponentModel.DataAnnotations;

namespace ShedBuilder.Api.Models;

public record CreateDesignRequest : IValidatableObject
{
    [Required]
    [MaxLength(200)]
    public string Name { get; init; } = string.Empty;

    [Range(4, 60)]
    public int WidthFeet { get; init; } = 8;

    [Range(0, 11)]
    public int WidthInches { get; init; }

    [Range(4, 60)]
    public int DepthFeet { get; init; } = 10;

    [Range(0, 11)]
    public int DepthInches { get; init; }

    [Range(6, 20)]
    public int HeightFeet { get; init; } = 8;

    [Range(0, 11)]
    public int HeightInches { get; init; }

    [Range(1, 12)]
    public decimal RoofPitch { get; init; } = 4m;

    public RoofType RoofType { get; init; } = RoofType.Gable;

    public List<OpeningDto>? Openings { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrWhiteSpace(Name) && Name.Trim().Length == 0)
            yield return new ValidationResult("Name cannot be only whitespace.", new[] { nameof(Name) });
    }
}

public record UpdateDesignRequest : IValidatableObject
{
    [MaxLength(200)]
    public string? Name { get; init; }

    [Range(4, 60)]
    public int? WidthFeet { get; init; }

    [Range(0, 11)]
    public int? WidthInches { get; init; }

    [Range(4, 60)]
    public int? DepthFeet { get; init; }

    [Range(0, 11)]
    public int? DepthInches { get; init; }

    [Range(6, 20)]
    public int? HeightFeet { get; init; }

    [Range(0, 11)]
    public int? HeightInches { get; init; }

    [Range(1, 12)]
    public decimal? RoofPitch { get; init; }

    public RoofType? RoofType { get; init; }

    public List<OpeningDto>? Openings { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Name != null && Name.Trim().Length == 0)
            yield return new ValidationResult("Name cannot be empty or whitespace.", new[] { nameof(Name) });
    }
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
    public List<OpeningDto> Openings { get; init; } = new();
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record OpeningDto
{
    public OpeningType Type { get; init; }
    public WallSide Wall { get; init; }
    [Range(0, 720)]
    public int OffsetInches { get; init; }
    [Range(12, 120)]
    public int WidthInches { get; init; }
    [Range(12, 120)]
    public int HeightInches { get; init; }
    [Range(0, 240)]
    public int SillHeightInches { get; init; }
}

public record CostResponse
{
    public Guid DesignId { get; init; }
    public List<CostBomItem> Items { get; init; } = new();
    public decimal GrandTotal { get; init; }
}

public record CostBomItem
{
    public string Material { get; init; } = string.Empty;
    public string Dimensions { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public string Unit { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public decimal UnitPrice { get; init; }
    public decimal TotalPrice { get; init; }
}

public record PaginatedResponse<T>
{
    public List<T> Items { get; init; } = new();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}

public record RegisterRequest(
    [Required, MaxLength(200)] string Name,
    [Required, EmailAddress] string Email,
    [Required, MinLength(12)] string Password);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required, MinLength(12)] string NewPassword);

public record AuthResponse(string Token, string Name, string Email);

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
    public List<OpeningDto> Openings { get; init; } = new();
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
