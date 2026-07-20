import { describe, expect, it } from "vitest";
import type { AuthMeResponseDto } from "@/api/generated/models";
import { resolveVisibleAdminMenu } from "@/authorization/admin-menu";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { createPermissionPolicy } from "@/authorization/permission-policy";

function visibleCategory(type: "SYSTEM" | "BRANCH") {
  const principal = {
    type,
    globalPermissions:
      type === "SYSTEM" ? [ADMIN_PERMISSIONS.CATEGORIES_READ] : [],
    isSuperAdmin: false,
  } as AuthMeResponseDto;
  const policy = createPermissionPolicy(principal, {
    isInitialized: true,
    effectivePermissions:
      type === "BRANCH" ? [ADMIN_PERMISSIONS.CATEGORIES_READ] : [],
  });
  return resolveVisibleAdminMenu(type, policy).some((group) =>
    group.children?.some((child) => child.id === "categories"),
  );
}

describe("category menu policy", () => {
  it("shows Categories to a SYSTEM principal without requiring a selected branch", () => {
    expect(visibleCategory("SYSTEM")).toBe(true);
  });

  it("never exposes Categories to BRANCH principals", () => {
    expect(visibleCategory("BRANCH")).toBe(false);
  });
});
