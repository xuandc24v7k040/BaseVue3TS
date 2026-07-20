// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { routes } from "@/router";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";

describe("category admin routes", () => {
  const superAdmin = routes.find((route) => route.path === "/super-admin");

  it.each(["super-admin-categories", "super-admin-category-detail"])(
    "is system-only and protected by categories.read: %s",
    (name) => {
      const route = superAdmin?.children?.find((item) => item.name === name);
      expect(route?.meta?.requiredPermissions).toEqual([
        ADMIN_PERMISSIONS.CATEGORIES_READ,
      ]);
      expect(route?.path.startsWith("categories")).toBe(true);
    },
  );

  it("does not register a branch-admin category route", () => {
    const branchAdmin = routes.find((route) => route.path === "/branch-admin");
    expect(
      branchAdmin?.children?.some((route) => route.path.startsWith("categories")),
    ).toBe(false);
  });
});
