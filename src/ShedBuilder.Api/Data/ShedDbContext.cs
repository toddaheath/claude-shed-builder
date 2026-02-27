using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Data;

public class ShedDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public ShedDbContext(DbContextOptions<ShedDbContext> options) : base(options) { }

    public DbSet<Design> Designs => Set<Design>();
    public DbSet<DesignVersion> DesignVersions => Set<DesignVersion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var jsonOpts = new JsonSerializerOptions
        {
            Converters = { new JsonStringEnumConverter() },
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        modelBuilder.Entity<Design>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RoofType)
                .HasConversion<string>()
                .HasMaxLength(20);
            entity.HasOne(e => e.User)
                .WithMany(u => u.Designs)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Openings)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, jsonOpts),
                    v => JsonSerializer.Deserialize<List<Opening>>(v, jsonOpts) ?? new List<Opening>())
                .HasColumnType("jsonb");
        });

        modelBuilder.Entity<DesignVersion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Design)
                .WithMany(d => d.Versions)
                .HasForeignKey(e => e.DesignId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.RoofType)
                .HasConversion<string>()
                .HasMaxLength(20);
            entity.Property(e => e.Openings)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, jsonOpts),
                    v => JsonSerializer.Deserialize<List<Opening>>(v, jsonOpts) ?? new List<Opening>())
                .HasColumnType("jsonb");
        });
    }
}
