import { describe, expect, it } from "vitest";
import createDialog from "./BranchAdminCreateDialog.vue?raw";
import managerDialog from "./BranchManagerDialog.vue?raw";
import listPage from "../pages/BranchAdminListPage.vue?raw";
import detailPage from "../pages/BranchAdminDetailPage.vue?raw";
import assignmentActions from "./BranchAdminAssignmentActions.vue?raw";
import branchSelector from "./BranchAdminBranchSelector.vue?raw";
import columns from "./branch-admin-columns.ts?raw";

describe("Phase 8C lifecycle and UX contract", () => {
  it("keeps create and manager dialogs bounded with independent scrolling", () => {
    for (const content of [createDialog, managerDialog]) {
      expect(content).toContain("max-h-[90dvh]");
      expect(content).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
      expect(content).toContain("<ScrollArea");
      expect(content).toContain("<DialogFooter");
    }
  });

  it("validates the optional phone when the user leaves the field", () => {
    expect(createDialog).toContain('@blur="validateField(\'phone\')"');
    expect(createDialog).toContain(':aria-invalid="Boolean(errors.phone)"');
  });

  it("exposes lifecycle actions without exposing CUSTOMER conversion", () => {
    const feature = [
      listPage,
      detailPage,
      managerDialog,
      assignmentActions,
    ].join("\n");
    expect(feature).toContain("Kích hoạt lại");
    expect(feature).toContain("Đặt làm chi nhánh chính");
    expect(feature).toContain("Gỡ khỏi chi nhánh");
    expect(feature).not.toMatch(/branchAdminsConvert|Chuyển từ khách hàng/);
    expect(assignmentActions).toContain('class="z-[60] w-60"');
  });

  it("uses ScrollArea instead of native overflow lists and keeps create on the list", () => {
    expect(branchSelector).toContain("<ScrollArea");
    expect(branchSelector).not.toContain("overflow-y-auto");
    expect(managerDialog).not.toContain("overflow-y-auto");
    expect(listPage).not.toContain("@created=");
    expect(listPage).toContain("assignmentState");
    expect(listPage).toContain("assignedBranchId");
  });

  it("keeps assignment-state and branch filters backed by hidden table columns", () => {
    expect(columns).toContain('id: "assignmentState"');
    expect(columns).toContain('id: "assignedBranchId"');
    expect(columns).toContain("enableHiding: false");
    expect(listPage).toContain("initialColumnVisibility");
  });

  it("separates actionable admin assignments from read-only staff assignments", () => {
    expect(detailPage).toContain("adminAssignments");
    expect(detailPage).toContain("otherAssignments");
    expect(detailPage).toContain("Phân công quản trị chi nhánh");
    expect(detailPage).toContain("Các phân công khác");
    expect(detailPage).toContain("Chưa được bổ nhiệm quản trị chi nhánh.");
    expect(detailPage).toContain("Không có phân công nhân viên khác.");
    expect(detailPage).toContain('v-for="assignment in adminAssignments"');
    expect(detailPage).toContain('v-for="assignment in otherAssignments"');
    expect(detailPage).not.toContain("{{ assignment.branch.code }}");
    expect(columns).toContain("isBranchAdminAssignment");
  });

  it("never exposes Branch Admin lifecycle actions for non-admin assignments", () => {
    const adminSection = detailPage.slice(
      detailPage.indexOf("Phân công quản trị chi nhánh"),
      detailPage.indexOf("Các phân công khác"),
    );
    const otherSection = detailPage.slice(
      detailPage.indexOf("Các phân công khác"),
    );
    expect(adminSection).toContain("BranchAdminAssignmentActions");
    expect(otherSection).not.toContain("BranchAdminAssignmentActions");
    expect(otherSection).toContain("Chỉ đọc tại màn Quản trị viên chi nhánh.");
    expect(assignmentActions).toContain("isBranchAdminAssignment(item)");
  });
});
