import { describe, expect, it } from "vitest";
import createDialog from "./StaffCreateDialog.vue?raw";
import assignDialog from "./StaffAssignExistingDialog.vue?raw";
import accessSelector from "./StaffAccessSelector.vue?raw";
import listPage from "../pages/StaffListPage.vue?raw";
import detailPage from "../pages/StaffDetailPage.vue?raw";
import branchRequired from "@/pages/errors/BranchRequiredPage.vue?raw";
import assignmentActions from "./StaffAssignmentActions.vue?raw";
import assignmentDialogs from "./StaffAssignmentDialogs.vue?raw";
import roleManager from "./StaffRoleManager.vue?raw";
import permissionManager from "./StaffPermissionManager.vue?raw";
import branchCombobox from "./StaffBranchCombobox.vue?raw";

describe("Phase 8D-1 UI contract", () => {
  it("uses fixed dialog chrome and shadcn ScrollArea", () => {
    for (const dialog of [createDialog, assignDialog]) {
      expect(dialog).toContain("max-h-[90dvh]");
      expect(dialog).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
      expect(dialog).toContain("<ScrollArea");
      expect(dialog).toContain("<DialogFooter");
      expect(dialog).not.toContain("overflow-y-auto");
    }
  });

  it("keeps Customer conversion absent and enables Super Admin assignment management", () => {
    const feature = [
      listPage,
      detailPage,
      createDialog,
      assignDialog,
      accessSelector,
    ].join("\n");
    expect(feature).not.toMatch(
      /staffConvert|Chuyển từ khách hàng|type=CUSTOMER/,
    );
    expect(detailPage).toContain("getStaffGlobalAssignments");
    expect(detailPage).toContain("authStore.user?.isSuperAdmin");
    expect(detailPage).toContain("StaffAssignmentActions");
    expect(detailPage).toContain("StaffAssignmentDialogs");
  });

  it("separates Super Admin add-existing from Branch Admin create-new", () => {
    expect(listPage).toContain('v-if="authStore.user?.isSuperAdmin"');
    expect(listPage).toContain(
      '<Button v-else type="button" @click="createOpen = true"',
    );
    expect(listPage).toContain(
      'v-if="authStore.user?.isSuperAdmin && assignOpen"',
    );
    expect(listPage).toContain("can(ADMIN_PERMISSIONS.ROLES_READ)");
    expect(assignDialog).toContain("authStore.user?.isSuperAdmin === true");
    expect(assignDialog).toContain("props.open &&");
  });

  it("implements lifecycle, transfer, role and tri-state permission contracts", () => {
    expect(assignmentActions).toContain("replacementBranchId");
    expect(assignmentActions).toContain(
      "Kích hoạt phân công không tự kích hoạt tài khoản",
    );
    expect(assignmentDialogs).toContain("assignExistingStaff");
    expect(assignmentDialogs).toContain("transferStaff");
    expect(roleManager).toContain("removeStaffRole");
    expect(roleManager).toContain("staffErrorMessage");
    expect(permissionManager).toContain("['INHERIT', 'ALLOW', 'DENY']");
    expect(permissionManager).toContain("isDangerousPermission");
    for (const dialog of [
      assignmentActions,
      assignmentDialogs,
      roleManager,
      permissionManager,
    ]) {
      expect(dialog).toContain("<ScrollArea");
      expect(dialog).toContain("<DialogFooter");
    }
  });

  it("uses the authoritative assignable-role source for create and manage", () => {
    expect(accessSelector).toContain("listAssignableStaffRoles");
    expect(roleManager).toContain("listAssignableStaffRoles");
    expect(accessSelector).toContain("staffKeys.assignableRoles");
    expect(roleManager).toContain("staffKeys.assignableRoles");
    expect(accessSelector).not.toContain("actorMaxRoleLevel");
  });

  it("uses the backend-filtered assignable permission catalog", () => {
    expect(accessSelector).toContain("listStaffPermissionCatalog");
    expect(permissionManager).toContain("listStaffPermissionCatalog");
    expect(accessSelector).not.toContain("actorPermissions.value.has");
    expect(accessSelector).toContain("formatPermissionResource(resource)");
    expect(permissionManager).toContain("formatPermissionResource(resource)");
  });

  it("uses shared tabs, inherited markers and grouped permission controls", () => {
    expect(accessSelector).toContain("<Tabs");
    expect(accessSelector).toContain("Vai trò ({{ roleIds.length }})");
    expect(accessSelector).toContain("directPermissionIds.length");
    expect(accessSelector).toContain("Có từ vai trò");
    expect(accessSelector).toContain("<Collapsible");
    expect(accessSelector).toContain("isDangerousPermission");
    expect(accessSelector).not.toContain("getStaffRoleDetail");
  });

  it("uses searchable shadcn branch comboboxes and no native branch select", () => {
    expect(branchCombobox).toContain("<Popover");
    expect(branchCombobox).toContain('role="combobox"');
    expect(branchCombobox).toContain("<ScrollArea");
    expect(branchCombobox).toContain('event.key === "ArrowDown"');
    expect(assignmentDialogs).toContain("<StaffBranchCombobox");
    expect(assignmentDialogs).not.toContain("<select");
  });

  it("groups Staff detail access into role and effective-permission tabs", () => {
    expect(detailPage).toContain("Quyền truy cập tại");
    expect(detailPage).toContain('<TabsTrigger value="roles">');
    expect(detailPage).toContain('<TabsTrigger value="permissions">');
    expect(detailPage).toContain("Cấp trực tiếp");
    expect(detailPage).toContain("Từ chối trực tiếp");
    expect(detailPage).toContain("formatPermissionState");
  });

  it("keeps complete focus-ring breathing room in access dialogs", () => {
    for (const dialog of [accessSelector, roleManager, permissionManager]) {
      expect(dialog).toContain('class="relative p-1"');
    }
  });

  it("renders one role validation message and clears it through the shared selector", () => {
    for (const dialog of [createDialog, assignDialog]) {
      expect(dialog.match(/:role-error="errors\.roleIds"/g)).toHaveLength(1);
      expect(dialog).not.toContain(
        '<p v-if="errors.roleIds" class="text-sm text-destructive">',
      );
      expect(dialog).not.toContain(
        'toast.error("Vui lòng chọn tài khoản và vai trò nhân viên.")',
      );
    }
    expect(createDialog).toContain('if (field === "roleIds") validateField(field)');
    expect(assignDialog).toContain(
      'if (field === "roleIds") applyValidationField(field)',
    );
    expect(createDialog).toContain("normalizeFieldErrors");
    expect(assignDialog).toContain("normalizeFieldErrors");
  });

  it("replaces the system-scope CTA with a searchable branch combobox", () => {
    expect(branchRequired).toContain('role="combobox"');
    expect(branchRequired).toContain("Tìm theo tên chi nhánh");
    expect(branchRequired).toContain('<Label for="branch-scope-trigger">');
    expect(branchRequired).toContain("Chi nhánh có thể chọn");
    expect(branchRequired).toContain('event.key === "ArrowDown"');
    expect(branchRequired).toContain('event.key === "Escape"');
    expect(branchRequired).toContain("sm:grid-cols-2 lg:grid-cols-3");
    expect(branchRequired).not.toContain("Phạm vi dữ liệu");
    expect(branchRequired).not.toContain("Tiếp tục với");
  });

  it("does not render IDs or branch codes as labels", () => {
    expect(listPage).not.toContain("rowData.id");
    expect(detailPage).not.toContain("{{ staff.id }}");
    expect(branchRequired).not.toContain("{{ branch.code }}");
  });
});
