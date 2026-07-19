import { describe, expect, it } from "vitest";
import component from "./AdminBreadcrumb.vue?raw";
import branchList from "@/features/branches/pages/BranchListPage.vue?raw";
import branchDetail from "@/features/branches/pages/BranchDetailPage.vue?raw";
import roleList from "@/features/roles/pages/RoleListPage.vue?raw";
import roleDetail from "@/features/roles/pages/RoleDetailPage.vue?raw";
import permissionList from "@/features/permissions/pages/PermissionListPage.vue?raw";
import permissionDetail from "@/features/permissions/pages/PermissionDetailPage.vue?raw";
import branchAdminList from "@/features/branch-admins/pages/BranchAdminListPage.vue?raw";
import branchAdminDetail from "@/features/branch-admins/pages/BranchAdminDetailPage.vue?raw";

describe("AdminBreadcrumb", () => {
  it("uses shadcn-vue links/pages and bounds long labels on narrow screens", () => {
    expect(component).toContain("<Breadcrumb");
    expect(component).toContain("<BreadcrumbLink as-child>");
    expect(component).toContain("<BreadcrumbPage");
    expect(component).toContain("flex-nowrap overflow-hidden");
    expect(component).toContain("truncate");
    expect(component).toContain('aria-label="Breadcrumb"');
  });

  it("covers all Phase 8C list/detail pages with real named routes", () => {
    for (const page of [
      branchList,
      branchDetail,
      roleList,
      roleDetail,
      permissionList,
      permissionDetail,
      branchAdminList,
      branchAdminDetail,
    ]) {
      expect(page).toContain("<AdminBreadcrumb");
    }
    expect(branchDetail).toContain("super-admin-branches");
    expect(roleDetail).toContain("super-admin-roles");
    expect(permissionDetail).toContain("super-admin-permissions");
    expect(branchAdminDetail).toContain("super-admin-branch-admins");
  });

  it("renders a stable loading skeleton for detail labels", () => {
    expect(component).toContain('<Skeleton v-if="loading"');
    for (const page of [
      branchDetail,
      roleDetail,
      permissionDetail,
      branchAdminDetail,
    ]) {
      expect(page).toContain(":loading=");
      expect(page).toContain(":current-label=");
    }
  });
});
