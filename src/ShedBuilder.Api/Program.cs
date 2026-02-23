using Microsoft.EntityFrameworkCore;
using Serilog;
using ShedBuilder.Api.Data;
using ShedBuilder.Api.Middleware;
using ShedBuilder.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) => config
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
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IMeasurementHelper, MeasurementHelper>();
builder.Services.AddScoped<IBomCalculator, BomCalculator>();
builder.Services.AddScoped<IStlExporter, StlExporter>();
builder.Services.AddSingleton<IPriceService, PriceService>();
builder.Services.AddScoped<IPdfExporter, PdfExporter>();

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var corsOrigins = builder.Configuration["Cors:AllowedOrigins"]
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
        else
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var healthChecks = builder.Services.AddHealthChecks();
if (!string.IsNullOrEmpty(connectionString))
{
    healthChecks.AddNpgSql(connectionString);
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseCors();
app.UseMiddleware<ApiKeyAuthMiddleware>();
app.MapControllers();

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // No dependency checks for liveness
});
app.MapHealthChecks("/health/ready");

// Auto-migrate on startup (skip for non-relational providers like InMemory)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ShedDbContext>();
    if (db.Database.IsRelational())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }
}

app.Run();

public partial class Program { }
