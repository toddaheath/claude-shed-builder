using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Models;
using ShedBuilder.Api.Services;

namespace ShedBuilder.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize]
public class DesignsController : AuthenticatedControllerBase
{
    private readonly ShedDbContext _db;
    private readonly IBomCalculator _bom;
    private readonly IStlExporter _stl;
    private readonly IPriceService _priceService;
    private readonly IPdfExporter _pdfExporter;

    public DesignsController(ShedDbContext db, IBomCalculator bom, IStlExporter stl,
        IPriceService priceService, IPdfExporter pdfExporter) : base(db)
    {
        _db = db;
        _bom = bom;
        _stl = stl;
        _priceService = priceService;
        _pdfExporter = pdfExporter;
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<DesignResponse>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 100) pageSize = 100;

        var query = _db.Designs.AsNoTracking().Where(d => d.UserId == user.Id);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(d => d.Name.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync();

        var designs = await query
            .OrderByDescending(d => d.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResponse<DesignResponse>
        {
            Items = designs.Select(MapToResponse).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DesignResponse>> Get(Guid id)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
        if (design == null) return NotFound();
        return MapToResponse(design);
    }

    [HttpPost]
    public async Task<ActionResult<DesignResponse>> Create(CreateDesignRequest request)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = new Design
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            WidthFeet = request.WidthFeet,
            WidthInches = request.WidthInches,
            DepthFeet = request.DepthFeet,
            DepthInches = request.DepthInches,
            HeightFeet = request.HeightFeet,
            HeightInches = request.HeightInches,
            RoofPitch = request.RoofPitch,
            RoofType = request.RoofType,
            Openings = request.Openings?.Select(o => new Opening
            {
                Type = o.Type,
                Wall = o.Wall,
                OffsetInches = o.OffsetInches,
                WidthInches = o.WidthInches,
                HeightInches = o.HeightInches,
                SillHeightInches = o.SillHeightInches,
            }).ToList() ?? new List<Opening>(),
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var validationError = ValidateOpenings(design);
        if (validationError != null) return validationError;

        _db.Designs.Add(design);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = design.Id }, MapToResponse(design));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DesignResponse>> Update(Guid id, UpdateDesignRequest request)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
        if (design == null) return NotFound();

        if (request.Name != null) design.Name = request.Name.Trim();
        if (request.WidthFeet.HasValue) design.WidthFeet = request.WidthFeet.Value;
        if (request.WidthInches.HasValue) design.WidthInches = request.WidthInches.Value;
        if (request.DepthFeet.HasValue) design.DepthFeet = request.DepthFeet.Value;
        if (request.DepthInches.HasValue) design.DepthInches = request.DepthInches.Value;
        if (request.HeightFeet.HasValue) design.HeightFeet = request.HeightFeet.Value;
        if (request.HeightInches.HasValue) design.HeightInches = request.HeightInches.Value;
        if (request.RoofPitch.HasValue) design.RoofPitch = request.RoofPitch.Value;
        if (request.RoofType.HasValue) design.RoofType = request.RoofType.Value;
        if (request.Openings != null)
        {
            design.Openings = request.Openings.Select(o => new Opening
            {
                Type = o.Type,
                Wall = o.Wall,
                OffsetInches = o.OffsetInches,
                WidthInches = o.WidthInches,
                HeightInches = o.HeightInches,
                SillHeightInches = o.SillHeightInches,
            }).ToList();
        }
        design.UpdatedAt = DateTime.UtcNow;

        var validationError = ValidateOpenings(design);
        if (validationError != null) return validationError;

        await _db.SaveChangesAsync();
        return MapToResponse(design);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
        if (design == null) return NotFound();

        _db.Designs.Remove(design);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/bom")]
    public async Task<ActionResult<BomResponse>> GetBom(Guid id)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
        if (design == null) return NotFound();
        return _bom.Calculate(design);
    }

    [HttpGet("{id:guid}/stl")]
    public async Task<IActionResult> GetStl(Guid id)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
        if (design == null) return NotFound();

        var bytes = _stl.Export(design);
        return File(bytes, "application/octet-stream", $"{design.Name}.stl");
    }

    [HttpGet("{id:guid}/cost")]
    public async Task<ActionResult<CostResponse>> GetCost(Guid id)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
        if (design == null) return NotFound();

        return BuildCostResponse(design);
    }

    [HttpGet("{id:guid}/pdf")]
    public async Task<IActionResult> GetPdf(Guid id)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
        if (design == null) return NotFound();

        var costResponse = BuildCostResponse(design);
        var pdfBytes = _pdfExporter.Export(design, costResponse);
        return File(pdfBytes, "application/pdf", $"{design.Name}.pdf");
    }

    private CostResponse BuildCostResponse(Design design)
    {
        var bomResult = _bom.Calculate(design);
        var costItems = bomResult.Items.Select(item =>
        {
            var unitPrice = _priceService.GetUnitPrice(item.Material, item.Dimensions);
            return new CostBomItem
            {
                Material = item.Material,
                Dimensions = item.Dimensions,
                Quantity = item.Quantity,
                Unit = item.Unit,
                Category = item.Category,
                UnitPrice = unitPrice,
                TotalPrice = unitPrice * item.Quantity,
            };
        }).ToList();

        return new CostResponse
        {
            DesignId = design.Id,
            Items = costItems,
            GrandTotal = costItems.Sum(i => i.TotalPrice),
        };
    }

    [HttpGet("{id:guid}/versions")]
    public async Task<ActionResult<PaginatedResponse<VersionResponse>>> ListVersions(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var designExists = await _db.Designs.AnyAsync(d => d.Id == id && d.UserId == user.Id);
        if (!designExists) return NotFound();

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 100) pageSize = 100;

        var query = _db.DesignVersions.AsNoTracking().Where(v => v.DesignId == id);
        var totalCount = await query.CountAsync();

        var versions = await query
            .OrderByDescending(v => v.VersionNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResponse<VersionResponse>
        {
            Items = versions.Select(MapVersionResponse).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    [HttpPost("{id:guid}/versions")]
    public async Task<ActionResult<VersionResponse>> CreateVersion(Guid id, CreateVersionRequest request)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
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
            Openings = design.Openings.Select(o => new Opening
            {
                Type = o.Type,
                Wall = o.Wall,
                OffsetInches = o.OffsetInches,
                WidthInches = o.WidthInches,
                HeightInches = o.HeightInches,
                SillHeightInches = o.SillHeightInches,
            }).ToList(),
            CreatedAt = DateTime.UtcNow
        };

        _db.DesignVersions.Add(version);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetVersion), new { id, vid = version.Id }, MapVersionResponse(version));
    }

    [HttpGet("{id:guid}/versions/{vid:guid}")]
    public async Task<ActionResult<VersionResponse>> GetVersion(Guid id, Guid vid)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var designExists = await _db.Designs.AnyAsync(d => d.Id == id && d.UserId == user.Id);
        if (!designExists) return NotFound();

        var version = await _db.DesignVersions.AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == vid && v.DesignId == id);
        if (version == null) return NotFound();
        return MapVersionResponse(version);
    }

    [HttpPost("{id:guid}/versions/{vid:guid}/restore")]
    public async Task<ActionResult<DesignResponse>> RestoreVersion(Guid id, Guid vid)
    {
        var (user, authError) = await GetCurrentUser();
        if (user == null) return authError!;
        var design = await _db.Designs.FirstOrDefaultAsync(d => d.Id == id && d.UserId == user.Id);
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
        design.Openings = version.Openings.Select(o => new Opening
        {
            Type = o.Type,
            Wall = o.Wall,
            OffsetInches = o.OffsetInches,
            WidthInches = o.WidthInches,
            HeightInches = o.HeightInches,
            SillHeightInches = o.SillHeightInches,
        }).ToList();
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
        Openings = d.Openings.Select(o => new OpeningDto
        {
            Type = o.Type,
            Wall = o.Wall,
            OffsetInches = o.OffsetInches,
            WidthInches = o.WidthInches,
            HeightInches = o.HeightInches,
            SillHeightInches = o.SillHeightInches,
        }).ToList(),
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    private ActionResult? ValidateOpenings(Design design)
    {
        var widthInches = design.WidthFeet * 12 + design.WidthInches;
        var depthInches = design.DepthFeet * 12 + design.DepthInches;
        var heightInches = design.HeightFeet * 12 + design.HeightInches;

        foreach (var opening in design.Openings)
        {
            if (opening.WidthInches <= 0 || opening.HeightInches <= 0)
                return BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Invalid opening",
                    Detail = "Opening width and height must be greater than zero.",
                });

            var wallWidth = opening.Wall is WallSide.Front or WallSide.Back ? widthInches : depthInches;

            if (opening.OffsetInches + opening.WidthInches > wallWidth)
                return BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Invalid opening",
                    Detail = $"Opening exceeds wall width on {opening.Wall} wall.",
                });

            if (opening.SillHeightInches + opening.HeightInches > heightInches)
                return BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Invalid opening",
                    Detail = $"Opening exceeds wall height on {opening.Wall} wall.",
                });
        }

        // Check for overlapping openings on the same wall
        var wallGroups = design.Openings.GroupBy(o => o.Wall);
        foreach (var group in wallGroups)
        {
            var sorted = group.OrderBy(o => o.OffsetInches).ToList();
            for (int i = 0; i < sorted.Count - 1; i++)
            {
                var current = sorted[i];
                var next = sorted[i + 1];
                if (current.OffsetInches + current.WidthInches > next.OffsetInches)
                    return BadRequest(new ProblemDetails
                    {
                        Status = StatusCodes.Status400BadRequest,
                        Title = "Invalid opening",
                        Detail = $"Overlapping openings on {group.Key} wall.",
                    });
            }
        }

        return null;
    }

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
        Openings = v.Openings.Select(o => new OpeningDto
        {
            Type = o.Type,
            Wall = o.Wall,
            OffsetInches = o.OffsetInches,
            WidthInches = o.WidthInches,
            HeightInches = o.HeightInches,
            SillHeightInches = o.SillHeightInches,
        }).ToList(),
        CreatedAt = v.CreatedAt
    };
}
