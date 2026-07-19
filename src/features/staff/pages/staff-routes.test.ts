// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { routes } from "@/router";

describe("Staff routes", () => {
  it("protects list/detail for both actors with staff.read and selected branch", () => {
    for (const rootPath of ["/super-admin", "/branch-admin"]) {
      const root = routes.find(({ path }) => path === rootPath);
      const staffRoutes =
        root?.children?.filter(({ path }) => path.startsWith("staff")) ?? [];
      expect(staffRoutes).toHaveLength(2);
      staffRoutes.forEach((route) => {
        expect(route.meta?.requiredPermissions).toEqual([
          ADMIN_PERMISSIONS.STAFF_READ,
        ]);
        expect(
          route.meta?.requiresSelectedBranch ??
            root?.meta?.requiresSelectedBranch,
        ).toBe(true);
      });
    }
  });
});
