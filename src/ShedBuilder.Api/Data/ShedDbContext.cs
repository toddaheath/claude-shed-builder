using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Data;

public class ShedDbContext : DbContext
{
    public ShedDbContext(DbContextOptions<ShedDbContext> options) : base(options) { }

    public DbSet<Design> Designs => Set<Design>();
    public DbSet<DesignVersion> DesignVersions => Set<DesignVersion>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ApiKey).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

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
            var jsonOpts = new JsonSerializerOptions
            {
                Converters = { new JsonStringEnumConverter() },
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
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
        });
    }
}
