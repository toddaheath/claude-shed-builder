using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace ShedBuilder.Api.Models;

public class ApplicationUser : IdentityUser<Guid>
{
    [Column("name")]
    public string Name { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Design> Designs { get; set; } = [];
}
