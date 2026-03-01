using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using ShedBuilder.Api.Models;
using ShedBuilder.Api.Tests.Integration;

namespace ShedBuilder.Api.Tests.Controllers;

public class AuthControllerTests : IClassFixture<CustomWebAppFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public AuthControllerTests(CustomWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    private string UniqueEmail() => $"auth-{Guid.NewGuid()}@test.com";

    private async Task<AuthResponse> RegisterUser(string? email = null, string password = "StrongPass123!")
    {
        email ??= UniqueEmail();
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Test User", email, password }, JsonOptions);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions))!;
    }

    [Fact]
    public async Task Register_ValidRequest_ReturnsCreated()
    {
        var email = UniqueEmail();
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "New User", email, password = "StrongPass123!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(auth);
        Assert.NotEmpty(auth.Token);
        Assert.Equal(email, auth.Email);
        Assert.Equal("New User", auth.Name);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var email = UniqueEmail();
        await RegisterUser(email);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Dup User", email, password = "StrongPass123!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.Contains("email already exists", problem!.Detail!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_ShortPassword_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Short", email = UniqueEmail(), password = "Ab1!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_MissingFields_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "", email = "", password = "" }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_WeakPassword_Returns400()
    {
        // No digit or special character
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new { name = "Weak", email = UniqueEmail(), password = "abcdefghijklm" }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsOk()
    {
        var email = UniqueEmail();
        await RegisterUser(email);

        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email, password = "StrongPass123!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(auth);
        Assert.NotEmpty(auth.Token);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var email = UniqueEmail();
        await RegisterUser(email);

        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email, password = "WrongPassword1!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_NonexistentEmail_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email = "nobody@example.com", password = "Password123!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_AccountLockout_After5Failures()
    {
        var email = UniqueEmail();
        await RegisterUser(email);
        _client.DefaultRequestHeaders.Authorization = null;

        for (int i = 0; i < 5; i++)
        {
            await _client.PostAsJsonAsync("/api/v1/auth/login",
                new { email, password = "WrongPassword1!" }, JsonOptions);
        }

        // 6th attempt should indicate lockout
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email, password = "StrongPass123!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.Contains("locked", problem!.Detail!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Token_ContainsExpectedClaims_With1HrExpiry()
    {
        var email = UniqueEmail();
        var auth = await RegisterUser(email);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(auth.Token);

        Assert.Equal(email, jwt.Claims.First(c => c.Type == ClaimTypes.Email).Value);
        Assert.Equal("Test User", jwt.Claims.First(c => c.Type == ClaimTypes.Name).Value);
        Assert.NotNull(jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier));

        // Verify token expires ~1 hour from now (allow 5 minute tolerance)
        var minutesUntilExpiry = (jwt.ValidTo - DateTime.UtcNow).TotalMinutes;
        Assert.InRange(minutesUntilExpiry, 55, 65);
    }

    // --- Change Password Tests ---

    [Fact]
    public async Task ChangePassword_ValidRequest_ReturnsOk()
    {
        var email = UniqueEmail();
        var auth = await RegisterUser(email);
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.Token);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "StrongPass123!", newPassword = "NewStrongPass1!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_Returns400()
    {
        var email = UniqueEmail();
        var auth = await RegisterUser(email);
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.Token);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "WrongCurrent1!", newPassword = "NewStrongPass1!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WeakNewPassword_Returns400()
    {
        var email = UniqueEmail();
        var auth = await RegisterUser(email);
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.Token);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "StrongPass123!", newPassword = "weak" }, JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_Unauthenticated_Returns401()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var response = await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "StrongPass123!", newPassword = "NewStrongPass1!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_LoginWithNewPassword_Succeeds()
    {
        var email = UniqueEmail();
        var auth = await RegisterUser(email);
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth.Token);

        await _client.PostAsJsonAsync("/api/v1/auth/change-password",
            new { currentPassword = "StrongPass123!", newPassword = "NewStrongPass1!" }, JsonOptions);

        _client.DefaultRequestHeaders.Authorization = null;
        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new { email, password = "NewStrongPass1!" }, JsonOptions);

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }
}
