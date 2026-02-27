using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShedBuilder.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDesignListingIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_designs_user_id",
                table: "designs");

            migrationBuilder.CreateIndex(
                name: "IX_designs_user_id_updated_at",
                table: "designs",
                columns: new[] { "user_id", "updated_at" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_designs_user_id_updated_at",
                table: "designs");

            migrationBuilder.CreateIndex(
                name: "IX_designs_user_id",
                table: "designs",
                column: "user_id");
        }
    }
}
