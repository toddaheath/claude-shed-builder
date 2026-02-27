using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShedBuilder.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOpeningsToDesignVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "openings",
                table: "design_versions",
                type: "jsonb",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "openings",
                table: "design_versions");
        }
    }
}
