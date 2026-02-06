using Microsoft.EntityFrameworkCore;
using ShedBuilder.Api.Models;

namespace ShedBuilder.Api.Data;

public class ShedDbContext : DbContext
{
    public ShedDbContext(DbContextOptions<ShedDbContext> options) : base(options) { }

    public DbSet<Design> Designs => Set<Design>();
    public DbSet<DesignVersion> DesignVersions => Set<DesignVersion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Design>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RoofType)
                .HasConversion<string>()
                .HasMaxLength(20);
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
