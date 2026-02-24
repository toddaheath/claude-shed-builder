using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShedBuilder.Api.Models;

public enum RoofType
{
    Gable,
    LeanTo
}

[Table("designs")]
public class Design
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("width_feet")]
    public int WidthFeet { get; set; }

    [Column("width_inches")]
    public int WidthInches { get; set; }

    [Column("depth_feet")]
    public int DepthFeet { get; set; }

    [Column("depth_inches")]
    public int DepthInches { get; set; }

    [Column("height_feet")]
    public int HeightFeet { get; set; }

    [Column("height_inches")]
    public int HeightInches { get; set; }

    [Column("roof_pitch")]
    public decimal RoofPitch { get; set; }

    [Column("roof_type")]
    public RoofType RoofType { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public ApplicationUser User { get; set; } = null!;

    [Column("openings", TypeName = "jsonb")]
    public List<Opening> Openings { get; set; } = new();

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public List<DesignVersion> Versions { get; set; } = new();
}
