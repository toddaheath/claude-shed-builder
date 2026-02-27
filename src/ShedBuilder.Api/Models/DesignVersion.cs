using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShedBuilder.Api.Models;

[Table("design_versions")]
public class DesignVersion
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("design_id")]
    public Guid DesignId { get; set; }

    [ForeignKey(nameof(DesignId))]
    public Design Design { get; set; } = null!;

    [Column("version_number")]
    public int VersionNumber { get; set; }

    [MaxLength(200)]
    [Column("label")]
    public string Label { get; set; } = string.Empty;

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

    [Column("openings", TypeName = "jsonb")]
    public List<Opening> Openings { get; set; } = new();

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
