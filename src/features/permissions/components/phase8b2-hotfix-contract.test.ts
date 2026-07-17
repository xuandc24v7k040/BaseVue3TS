import { describe, expect, it } from "vitest";
import dataTableSource from "@/components/admin/table/DataTable.vue?raw";
import permissionListSource from "../pages/PermissionListPage.vue?raw";
import permissionColumnsSource from "./permission-columns.ts?raw";
import roleListSource from "../../roles/pages/RoleListPage.vue?raw";
import roleColumnsSource from "../../roles/components/role-columns.ts?raw";

describe("Phase 8B2 hotfix UI contracts", () => {
  it.each([
    ["permissions", permissionListSource],
    ["roles", roleListSource],
  ])("keeps page metadata undefined while %s data is loading", (_, source) => {
    expect(source).toContain(':page-count="meta?.lastPage"');
    expect(source).toContain(':row-count="meta?.total"');
    expect(source).not.toMatch(/meta\?\.(?:lastPage|total)\s*\?\?\s*0/);
  });

  it("keeps the shared horizontal scroll boundary and fixed table sizing", () => {
    expect(dataTableSource).toContain("<ScrollArea");
    expect(dataTableSource).toContain("w-max min-w-full table-fixed");
    expect(permissionColumnsSource).not.toContain("min-w-44");
    expect(permissionColumnsSource).toContain("truncate");
    expect(permissionColumnsSource).toContain("whitespace-nowrap");
    expect(roleColumnsSource).toContain("truncate");
    expect(roleColumnsSource).toContain("whitespace-nowrap");
  });

  it("assigns explicit widths to long role and permission columns", () => {
    expect(permissionColumnsSource).toContain('simple("code", "Quyền", 260)');
    expect(permissionColumnsSource).toContain(
      'simple("description", "Mô tả", 280)',
    );
    expect(roleColumnsSource).toContain('simple("name", "Tên vai trò", 220)');
    expect(roleColumnsSource).toContain(
      'simple("description", "Mô tả", 280)',
    );
  });
});
