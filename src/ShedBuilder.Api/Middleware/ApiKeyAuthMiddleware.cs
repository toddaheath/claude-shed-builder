using Microsoft.EntityFrameworkCore;
using ShedBuilder.Api.Data;

namespace ShedBuilder.Api.Middleware;

public class ApiKeyAuthMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly HashSet<string> ExcludedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/users/register",
        "/health/live",
        "/health/ready",
    };

    public ApiKeyAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";

        if (IsExcluded(path))
        {
            await _next(context);
            return;
        }

        if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue("X-Api-Key", out var apiKeyHeader) ||
            !Guid.TryParse(apiKeyHeader.FirstOrDefault(), out var apiKey))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Missing or invalid X-Api-Key header" });
            return;
        }

        var db = context.RequestServices.GetRequiredService<ShedDbContext>();
        var user = await db.Users.FirstOrDefaultAsync(u => u.ApiKey == apiKey);

        if (user == null)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API key" });
            return;
        }

        context.Items["User"] = user;
        await _next(context);
    }

    private static bool IsExcluded(string path)
    {
        foreach (var excluded in ExcludedPaths)
        {
            if (path.Equals(excluded, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        // Swagger paths
        if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase))
            return true;

        return false;
    }
}
