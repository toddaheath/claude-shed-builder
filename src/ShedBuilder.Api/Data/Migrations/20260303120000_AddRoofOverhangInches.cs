using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShedBuilder.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRoofOverhangInches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "roof_overhang_inches",
                table: "designs",
                type: "integer",
                nullable: false,
                defaultValue: 12);

            migrationBuilder.AddColumn<int>(
                name: "roof_overhang_inches",
                table: "design_versions",
                type: "integer",
                nullable: false,
                defaultValue: 12);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "roof_overhang_inches",
                table: "designs");

            migrationBuilder.DropColumn(
                name: "roof_overhang_inches",
                table: "design_versions");
        }
    }
}
