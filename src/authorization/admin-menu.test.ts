import { describe, expect, it } from "vitest";
import type { AuthMeResponseDto } from "@/api/generated/models";
import {
  resolveFirstAllowedAdminRoute,
  resolveVisibleAdminMenu,
} from "@/authorization/admin-menu";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { createPermissionPolicy } from "@/authorization/permission-policy";

function policy(
  type: AuthMeResponseDto["type"],
  permissions: string[],
  isSuperAdmin = false,
) {
  const principal = {
    type,
    globalPermissions: type === "SYSTEM" ? permissions : [],
    isSuperAdmin,
  } as AuthMeResponseDto;
  return createPermissionPolicy(principal, {
    isInitialized: true,
    effectivePermissions: type === "BRANCH" ? permissions : [],
  });
}

function visibleIds(
  type: AuthMeResponseDto["type"],
  permissions: string[],
): string[] {
  return resolveVisibleAdminMenu(type, policy(type, permissions)).flatMap(
    (item) => item.children?.map((child) => child.id) ?? [item.id],
  );
}

describe("admin menu and safe landing", () => {
  it("matches the seeded BRANCH_ADMIN modules", () => {
    const ids = visibleIds("BRANCH", [
      ADMIN_PERMISSIONS.DASHBOARD_READ,
      ADMIN_PERMISSIONS.STAFF_READ,
      ADMIN_PERMISSIONS.PRODUCTS_READ,
      ADMIN_PERMISSIONS.INVENTORY_READ,
      ADMIN_PERMISSIONS.ORDERS_READ,
    ]);
    expect(ids).toEqual(["dashboard", "staff", "product-list", "inventory-list", "orders"]);
    expect(ids).not.toContain("stock-movements");
    expect(ids).not.toContain("branch-admins");
  });

  it("shows Branch Admin management only to SYSTEM with both read permissions", () => {
    expect(visibleIds("SYSTEM", [ADMIN_PERMISSIONS.USERS_READ])).not.toContain(
      "branch-admins",
    );
    expect(
      visibleIds("SYSTEM", [
        ADMIN_PERMISSIONS.USERS_READ,
        ADMIN_PERMISSIONS.BRANCHES_READ,
      ]),
    ).toContain("branch-admins");
  });

  it("lands INVENTORY on the readable product catalog route", () => {
    const inventoryPolicy = policy("BRANCH", [
      ADMIN_PERMISSIONS.PRODUCTS_READ,
      ADMIN_PERMISSIONS.INVENTORY_READ,
      ADMIN_PERMISSIONS.STOCK_RECEIPTS_READ,
    ]);
    expect(
      resolveFirstAllowedAdminRoute("BRANCH", inventoryPolicy, true),
    ).toEqual({ name: "branch-admin-products" });
  });

  it("lands CASHIER on orders and gives empty STAFF no admin module", () => {
    expect(
      resolveFirstAllowedAdminRoute(
        "BRANCH",
        policy("BRANCH", [
          ADMIN_PERMISSIONS.ORDERS_READ,
          ADMIN_PERMISSIONS.PAYMENTS_CREATE,
        ]),
        true,
      ),
    ).toEqual({ name: "branch-admin-orders" });
    expect(
      resolveFirstAllowedAdminRoute("BRANCH", policy("BRANCH", []), true),
    ).toBeNull();
  });

  it("does not choose a branch-required route without a selected branch", () => {
    expect(
      resolveFirstAllowedAdminRoute(
        "SYSTEM",
        policy("SYSTEM", [ADMIN_PERMISSIONS.STAFF_READ]),
        false,
      ),
    ).toBeNull();
  });

  it("uses another global module for a non-bypass SYSTEM principal", () => {
    expect(
      resolveFirstAllowedAdminRoute(
        "SYSTEM",
        policy("SYSTEM", [ADMIN_PERMISSIONS.ROLES_READ]),
        false,
      ),
    ).toEqual({ name: "super-admin-roles" });
  });

  it("hides empty groups and has no fake category, payment, or report item", () => {
    const items = resolveVisibleAdminMenu(
      "BRANCH",
      policy("BRANCH", [ADMIN_PERMISSIONS.ORDERS_READ]),
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("sales");
    expect(JSON.stringify(items)).not.toMatch(/categor|payment|report/i);
  });
});
