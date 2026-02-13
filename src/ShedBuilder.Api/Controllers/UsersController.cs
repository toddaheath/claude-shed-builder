using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ShedDbContext _db;

    public UsersController(ShedDbContext db)
    {
        _db = db;
    }

    [HttpPost("register")]
    public async Task<ActionResult<UserResponse>> Register(RegisterUserRequest request)
    {
        var existingUser = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (existingUser)
            return Conflict(new { error = "A user with this email already exists" });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email,
            ApiKey = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Me), null, new UserResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            ApiKey = user.ApiKey,
            CreatedAt = user.CreatedAt,
        });
    }

    [HttpGet("me")]
    public ActionResult<UserResponse> Me()
    {
        var user = HttpContext.Items["User"] as User;
        if (user == null) return Unauthorized();

        return new UserResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            ApiKey = user.ApiKey,
            CreatedAt = user.CreatedAt,
        };
    }
}
