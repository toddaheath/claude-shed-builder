using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShedBuilder.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "designs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    width_feet = table.Column<int>(type: "integer", nullable: false),
                    width_inches = table.Column<int>(type: "integer", nullable: false),
                    depth_feet = table.Column<int>(type: "integer", nullable: false),
                    depth_inches = table.Column<int>(type: "integer", nullable: false),
                    height_feet = table.Column<int>(type: "integer", nullable: false),
                    height_inches = table.Column<int>(type: "integer", nullable: false),
                    roof_pitch = table.Column<decimal>(type: "numeric", nullable: false),
                    roof_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_designs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "design_versions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    design_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    width_feet = table.Column<int>(type: "integer", nullable: false),
                    width_inches = table.Column<int>(type: "integer", nullable: false),
                    depth_feet = table.Column<int>(type: "integer", nullable: false),
                    depth_inches = table.Column<int>(type: "integer", nullable: false),
                    height_feet = table.Column<int>(type: "integer", nullable: false),
                    height_inches = table.Column<int>(type: "integer", nullable: false),
                    roof_pitch = table.Column<decimal>(type: "numeric", nullable: false),
                    roof_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_design_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_design_versions_designs_design_id",
                        column: x => x.design_id,
                        principalTable: "designs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_design_versions_design_id",
                table: "design_versions",
                column: "design_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "design_versions");

            migrationBuilder.DropTable(
                name: "designs");
        }
    }
}
