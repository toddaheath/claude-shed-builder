using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Middleware;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Tests.Middleware;

public class ApiKeyAuthMiddlewareTests : IDisposable
{
    private readonly ShedDbContext _db;
    private readonly User _testUser;

    public ApiKeyAuthMiddlewareTests()
    {
        var options = new DbContextOptionsBuilder<ShedDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new ShedDbContext(options);

        _testUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            Email = "test@example.com",
            ApiKey = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(_testUser);
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private HttpContext CreateContext(string path, string? apiKey = null)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;

        var services = new ServiceCollection();
        services.AddSingleton(_db);
        context.RequestServices = services.BuildServiceProvider();

        if (apiKey != null)
            context.Request.Headers["X-Api-Key"] = apiKey;

        return context;
    }

    [Fact]
    public async Task ExcludedPath_PassesThrough()
    {
        var nextCalled = false;
        var middleware = new ApiKeyAuthMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });

        var context = CreateContext("/api/users/register");
        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task NonApiPath_PassesThrough()
    {
        var nextCalled = false;
        var middleware = new ApiKeyAuthMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });

        var context = CreateContext("/some-page");
        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task MissingApiKey_Returns401()
    {
        var middleware = new ApiKeyAuthMiddleware(_ => Task.CompletedTask);

        var context = CreateContext("/api/designs");
        await middleware.InvokeAsync(context);

        Assert.Equal(401, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvalidApiKey_Returns401()
    {
        var middleware = new ApiKeyAuthMiddleware(_ => Task.CompletedTask);

        var context = CreateContext("/api/designs", Guid.NewGuid().ToString());
        await middleware.InvokeAsync(context);

        Assert.Equal(401, context.Response.StatusCode);
    }

    [Fact]
    public async Task ValidApiKey_SetsUserAndPassesThrough()
    {
        User? setUser = null;
        var middleware = new ApiKeyAuthMiddleware(ctx =>
        {
            setUser = ctx.Items["User"] as User;
            return Task.CompletedTask;
        });

        var context = CreateContext("/api/designs", _testUser.ApiKey.ToString());
        await middleware.InvokeAsync(context);

        Assert.NotNull(setUser);
        Assert.Equal(_testUser.Id, setUser!.Id);
    }

    [Fact]
    public async Task HealthCheckPaths_PassThrough()
    {
        var nextCalled = false;
        var middleware = new ApiKeyAuthMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });

        var context = CreateContext("/health/live");
        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
    }
}
