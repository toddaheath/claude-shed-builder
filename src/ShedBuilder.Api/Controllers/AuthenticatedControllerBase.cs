using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Controllers;

public abstract class AuthenticatedControllerBase : ControllerBase
{
    private readonly ShedDbContext _db;

    protected AuthenticatedControllerBase(ShedDbContext db)
    {
        _db = db;
    }

    protected async Task<(ApplicationUser? User, ActionResult? Error)> GetCurrentUser()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim, out var userId))
            return (null, Unauthorized());
        var user = await _db.Users.FindAsync(userId);
        return user == null ? (null, Unauthorized()) : (user, null);
    }
}
