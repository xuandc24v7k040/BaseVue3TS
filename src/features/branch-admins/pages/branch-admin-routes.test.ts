// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { routes } from "@/router";

describe("Branch Admin management routes", () => {
  it("protects global list/detail with exact read permissions and no selected branch", () => {
    const root = routes.find((route) => route.path === "/super-admin");
    const targets =
      root?.children?.filter((route) =>
        route.path.startsWith("branch-admins"),
      ) ?? [];
    expect(targets.map((route) => route.name)).toEqual([
      "super-admin-branch-admins",
      "super-admin-branch-admin-detail",
    ]);
    targets.forEach((route) => {
      expect(route.meta?.requiredPermissions).toEqual([
        ADMIN_PERMISSIONS.USERS_READ,
        ADMIN_PERMISSIONS.BRANCHES_READ,
      ]);
      expect(route.meta?.requiresSelectedBranch).not.toBe(true);
    });
  });
});
