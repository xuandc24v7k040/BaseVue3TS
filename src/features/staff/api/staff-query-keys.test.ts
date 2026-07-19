import { describe, expect, it } from "vitest";
import { staffKeys } from "./staff-query-keys";

describe("Staff query keys", () => {
  it("isolates branch data and access catalogs by selected branch", () => {
    expect(staffKeys.list("branch-a", { page: 1 })).not.toEqual(
      staffKeys.list("branch-b", { page: 1 }),
    );
    expect(staffKeys.detail("branch-a", "staff-id")).not.toEqual(
      staffKeys.detail("branch-b", "staff-id"),
    );
    expect(staffKeys.candidates("branch-a", { page: 1 })).not.toEqual(
      staffKeys.candidates("branch-b", { page: 1 }),
    );
    expect(staffKeys.roleCatalog("branch-a", { page: 1 })).not.toEqual(
      staffKeys.roleCatalog("branch-b", { page: 1 }),
    );
    expect(
      staffKeys.assignableRoles("branch-a", "assign", { action: "ASSIGN" }),
    ).not.toEqual(
      staffKeys.assignableRoles("branch-b", "assign", { action: "ASSIGN" }),
    );
    expect(staffKeys.permissionCatalog("branch-a", { page: 1 })).not.toEqual(
      staffKeys.permissionCatalog("branch-b", { page: 1 }),
    );
    expect(staffKeys.roleGrants("branch-a", ["role-id"])).not.toEqual(
      staffKeys.roleGrants("branch-b", ["role-id"]),
    );
  });

  it("separates create and manage-role assignable catalogs", () => {
    expect(
      staffKeys.assignableRoles("branch-a", "create", { action: "CREATE" }),
    ).not.toEqual(
      staffKeys.assignableRoles("branch-a", "assign", { action: "ASSIGN" }),
    );
  });

  it("keeps global assignments outside branch-scoped keys", () => {
    expect(staffKeys.globalAssignments("staff-id")).toEqual([
      "staff",
      "staff-id",
      "assignments",
    ]);
  });
});
