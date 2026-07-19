import { describe, expect, it } from "vitest";
import { createRoleColumns } from "./role-columns";
import roleListPage from "../pages/RoleListPage.vue?raw";

describe("role columns", () => {
  it("exposes every contract data column as server-sortable", () => {
    const columns = createRoleColumns();
    const ids = columns.map((column) =>
      "accessorKey" in column ? column.accessorKey : column.id,
    );
    expect(ids).toEqual([
      "code",
      "name",
      "description",
      "type",
      "guardName",
      "level",
      "isSystem",
      "isActive",
      "createdAt",
      "updatedAt",
    ]);
    expect(columns.every((column) => column.enableSorting !== false)).toBe(
      true,
    );
  });

  it("hides code by default while retaining it in column visibility", () => {
    expect(roleListPage).toContain("initialColumnVisibility");
    expect(roleListPage).toContain("code: false");
    expect(roleListPage).toContain("enableColumnVisibility: true");
    expect(roleListPage).toContain(
      "columnIds: ['code', 'name', 'description']",
    );
  });
});
