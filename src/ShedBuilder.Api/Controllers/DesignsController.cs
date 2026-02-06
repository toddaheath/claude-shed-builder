using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Models;
using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DesignsController : ControllerBase
{
    private readonly ShedDbContext _db;
    private readonly IBomCalculator _bom;
    private readonly IStlExporter _stl;

    public DesignsController(ShedDbContext db, IBomCalculator bom, IStlExporter stl)
    {
        _db = db;
        _bom = bom;
        _stl = stl;
    }

    [HttpGet]
    public async Task<ActionResult<List<DesignResponse>>> List()
    {
        var designs = await _db.Designs
            .OrderByDescending(d => d.UpdatedAt)
            .ToListAsync();
        return designs.Select(MapToResponse).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DesignResponse>> Get(Guid id)
    {
        var design = await _db.Designs.FindAsync(id);
        if (design == null) return NotFound();
        return MapToResponse(design);
    }

    [HttpPost]
    public async Task<ActionResult<DesignResponse>> Create(CreateDesignRequest request)
    {
        var design = new Design
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            WidthFeet = request.WidthFeet,
            WidthInches = request.WidthInches,
            DepthFeet = request.DepthFeet,
            DepthInches = request.DepthInches,
            HeightFeet = request.HeightFeet,
            HeightInches = request.HeightInches,
            RoofPitch = request.RoofPitch,
            RoofType = request.RoofType,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Designs.Add(design);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = design.Id }, MapToResponse(design));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DesignResponse>> Update(Guid id, UpdateDesignRequest request)
    {
        var design = await _db.Designs.FindAsync(id);
        if (design == null) return NotFound();

        if (request.Name != null) design.Name = request.Name;
        if (request.WidthFeet.HasValue) design.WidthFeet = request.WidthFeet.Value;
        if (request.WidthInches.HasValue) design.WidthInches = request.WidthInches.Value;
        if (request.DepthFeet.HasValue) design.DepthFeet = request.DepthFeet.Value;
        if (request.DepthInches.HasValue) design.DepthInches = request.DepthInches.Value;
        if (request.HeightFeet.HasValue) design.HeightFeet = request.HeightFeet.Value;
        if (request.HeightInches.HasValue) design.HeightInches = request.HeightInches.Value;
        if (request.RoofPitch.HasValue) design.RoofPitch = request.RoofPitch.Value;
        if (request.RoofType.HasValue) design.RoofType = request.RoofType.Value;
        design.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToResponse(design);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var design = await _db.Designs.FindAsync(id);
        if (design == null) return NotFound();

        _db.Designs.Remove(design);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/bom")]
    public async Task<ActionResult<BomResponse>> GetBom(Guid id)
    {
        var design = await _db.Designs.FindAsync(id);
        if (design == null) return NotFound();
        return _bom.Calculate(design);
    }

    [HttpGet("{id:guid}/stl")]
    public async Task<IActionResult> GetStl(Guid id)
    {
        var design = await _db.Designs.FindAsync(id);
        if (design == null) return NotFound();

        var bytes = _stl.Export(design);
        return File(bytes, "application/octet-stream", $"{design.Name}.stl");
    }

    [HttpGet("{id:guid}/versions")]
    public async Task<ActionResult<List<VersionResponse>>> ListVersions(Guid id)
    {
        var designExists = await _db.Designs.AnyAsync(d => d.Id == id);
        if (!designExists) return NotFound();

        var versions = await _db.DesignVersions
            .Where(v => v.DesignId == id)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync();
        return versions.Select(MapVersionResponse).ToList();
    }

    [HttpPost("{id:guid}/versions")]
    public async Task<ActionResult<VersionResponse>> CreateVersion(Guid id, CreateVersionRequest request)
    {
        var design = await _db.Designs.FindAsync(id);
        if (design == null) return NotFound();

        var maxVersion = await _db.DesignVersions
            .Where(v => v.DesignId == id)
            .MaxAsync(v => (int?)v.VersionNumber) ?? 0;

        var version = new DesignVersion
        {
            Id = Guid.NewGuid(),
            DesignId = id,
            VersionNumber = maxVersion + 1,
            Label = request.Label,
            WidthFeet = design.WidthFeet,
            WidthInches = design.WidthInches,
            DepthFeet = design.DepthFeet,
            DepthInches = design.DepthInches,
            HeightFeet = design.HeightFeet,
            HeightInches = design.HeightInches,
            RoofPitch = design.RoofPitch,
            RoofType = design.RoofType,
            CreatedAt = DateTime.UtcNow
        };

        _db.DesignVersions.Add(version);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetVersion), new { id, vid = version.Id }, MapVersionResponse(version));
    }

    [HttpGet("{id:guid}/versions/{vid:guid}")]
    public async Task<ActionResult<VersionResponse>> GetVersion(Guid id, Guid vid)
    {
        var version = await _db.DesignVersions
            .FirstOrDefaultAsync(v => v.Id == vid && v.DesignId == id);
        if (version == null) return NotFound();
        return MapVersionResponse(version);
    }

    [HttpPost("{id:guid}/versions/{vid:guid}/restore")]
    public async Task<ActionResult<DesignResponse>> RestoreVersion(Guid id, Guid vid)
    {
        var design = await _db.Designs.FindAsync(id);
        if (design == null) return NotFound();

        var version = await _db.DesignVersions
            .FirstOrDefaultAsync(v => v.Id == vid && v.DesignId == id);
        if (version == null) return NotFound();

        design.WidthFeet = version.WidthFeet;
        design.WidthInches = version.WidthInches;
        design.DepthFeet = version.DepthFeet;
        design.DepthInches = version.DepthInches;
        design.HeightFeet = version.HeightFeet;
        design.HeightInches = version.HeightInches;
        design.RoofPitch = version.RoofPitch;
        design.RoofType = version.RoofType;
        design.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToResponse(design);
    }

    private static DesignResponse MapToResponse(Design d) => new()
    {
        Id = d.Id,
        Name = d.Name,
        WidthFeet = d.WidthFeet,
        WidthInches = d.WidthInches,
        DepthFeet = d.DepthFeet,
        DepthInches = d.DepthInches,
        HeightFeet = d.HeightFeet,
        HeightInches = d.HeightInches,
        RoofPitch = d.RoofPitch,
        RoofType = d.RoofType,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    private static VersionResponse MapVersionResponse(DesignVersion v) => new()
    {
        Id = v.Id,
        DesignId = v.DesignId,
        VersionNumber = v.VersionNumber,
        Label = v.Label,
        WidthFeet = v.WidthFeet,
        WidthInches = v.WidthInches,
        DepthFeet = v.DepthFeet,
        DepthInches = v.DepthInches,
        HeightFeet = v.HeightFeet,
        HeightInches = v.HeightInches,
        RoofPitch = v.RoofPitch,
        RoofType = v.RoofType,
        CreatedAt = v.CreatedAt
    };
}
