using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Models;
using ShedBuilder.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var migrateOnly = config.GetValue<bool>("MIGRATE_ONLY");

builder.Host.UseSerilog((context, cfg) => cfg
    .ReadFrom.Configuration(context.Configuration));

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new Asp.Versioning.ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
}).AddMvc();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ShedDbContext>(options =>
    options.UseNpgsql(config.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentityCore<ApplicationUser>(opt =>
{
    opt.Password.RequireDigit = false;
    opt.Password.RequireNonAlphanumeric = false;
    opt.Password.RequiredLength = 8;
    opt.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    opt.Lockout.MaxFailedAccessAttempts = 5;
    opt.Lockout.AllowedForNewUsers = true;
})
.AddSignInManager()
.AddEntityFrameworkStores<ShedDbContext>();

if (!migrateOnly)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opt =>
        {
            opt.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = config["Jwt:Issuer"],
                ValidAudience = config["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(config["Jwt:SecretKey"]!))
            };
        });
}
builder.Services.AddAuthorization();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IMeasurementHelper, MeasurementHelper>();
builder.Services.AddScoped<IBomCalculator, BomCalculator>();
builder.Services.AddScoped<IStlExporter, StlExporter>();
builder.Services.AddSingleton<IPriceService, PriceService>();
builder.Services.AddScoped<IPdfExporter, PdfExporter>();

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var corsOrigins = config["Cors:AllowedOrigins"]
    ?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
    ?? [];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOrigins.Length > 0)
        {
            policy.WithOrigins(corsOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else if (builder.Environment.IsDevelopment() || migrateOnly)
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            throw new InvalidOperationException(
                "Cors:AllowedOrigins must be configured in non-Development environments. " +
                "Set it via environment variable Cors__AllowedOrigins.");
        }
    });
});

var connectionString = config.GetConnectionString("DefaultConnection");
var healthChecks = builder.Services.AddHealthChecks();
if (!string.IsNullOrEmpty(connectionString))
{
    healthChecks.AddNpgSql(connectionString);
}

var app = builder.Build();

// Validate JWT secret key at startup (skip for migration-only runs)
if (!migrateOnly)
{
    var jwtSecret = app.Configuration["Jwt:SecretKey"];
    if (string.IsNullOrEmpty(jwtSecret) || jwtSecret.Length < 32)
        throw new InvalidOperationException(
            "Jwt:SecretKey must be configured and at least 32 characters. " +
            "Set it via environment variable Jwt__SecretKey or in appsettings.");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // No dependency checks for liveness
});
app.MapHealthChecks("/health/ready");

// Auto-migrate: disabled by default in production (use Helm migration job instead).
// Set RUN_MIGRATIONS=true to enable at startup (safe for single-instance dev).
// Set MIGRATE_ONLY=true to run migrations then exit (used by Helm pre-upgrade job).
var runMigrations = app.Configuration.GetValue("RUN_MIGRATIONS", app.Environment.IsDevelopment());
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ShedDbContext>();
    if (db.Database.IsRelational())
    {
        if (runMigrations || migrateOnly) db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }
}

if (migrateOnly) return;

app.Run();

public partial class Program { }
