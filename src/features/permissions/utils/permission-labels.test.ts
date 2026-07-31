import { describe, expect, it } from "vitest";
import {
  PERMISSION_ACTION_OPTIONS,
  PERMISSION_RESOURCE_OPTIONS,
  capitalizeFirstVietnameseLabel,
  formatPermissionAction,
  formatPermissionLabel,
  formatPermissionResource,
  formatPermissionState,
} from "./permission-labels";

describe("permission labels", () => {
  it.each([
    [
      {
        code: "roles.read",
        name: "Roles Read",
        resource: "roles",
        action: "read",
      },
      "Xem vai trò",
    ],
    [
      {
        code: "permissions.create",
        name: "Permissions Create",
        resource: "permissions",
        action: "create",
      },
      "Tạo quyền hạn",
    ],
    [
      {
        code: "staff.assign_role",
        name: "Staff Assign Role",
        resource: "staff",
        action: "assign_role",
      },
      "Gán vai trò nhân viên chi nhánh",
    ],
  ])("formats known catalog permission %o", (permission, expected) => {
    expect(formatPermissionLabel(permission)).toBe(expected);
  });

  it("falls back to custom name and then raw code without mutating inputs", () => {
    const custom = {
      code: "shipments.track",
      name: "Theo dõi vận chuyển",
      resource: "shipments",
      action: "track",
    };
    expect(formatPermissionLabel(custom)).toBe("Theo dõi vận chuyển");
    expect(formatPermissionLabel({ ...custom, name: "  " })).toBe(
      "shipments.track",
    );
    expect(custom).toEqual({
      code: "shipments.track",
      name: "Theo dõi vận chuyển",
      resource: "shipments",
      action: "track",
    });
  });

  it("capitalizes known and fallback resource labels without changing the remainder", () => {
    expect(formatPermissionResource("orders")).toBe("Đơn hàng");
    expect(formatPermissionResource("shipments")).toBe("Shipments");
    expect(capitalizeFirstVietnameseLabel("đơn hàng")).toBe("Đơn hàng");
    expect(capitalizeFirstVietnameseLabel("Đơn hàng")).toBe("Đơn hàng");
    expect(capitalizeFirstVietnameseLabel("")).toBe("");
  });

  it.each([
    ["branch_admin", "Quản trị chi nhánh"],
    ["branch_returns", "Yêu cầu hoàn trả"],
    ["inventory", "Kho và tồn"],
    ["stock_receipts", "Phiếu nhập kho"],
    ["stock_audit_events", "Stock audit events"],
  ])("localizes or formats resource %s", (resource, expected) => {
    expect(formatPermissionResource(resource)).toBe(expected);
  });

  it.each([
    ["reports", "Báo cáo"],
    ["reports.revenue", "Báo cáo doanh thu"],
    ["reviews", "Đánh giá"],
    ["inventory.movements", "Nhật ký tồn kho"],
    ["product_attributes", "Thuộc tính sản phẩm"],
    ["authors", "Tác giả"],
    ["publishers", "Nhà xuất bản"],
    ["suppliers", "Nhà cung cấp"],
    ["categories", "Danh mục"],
  ])("localizes audited resource %s", (resource, expected) => {
    expect(formatPermissionResource(resource)).toBe(expected);
  });

  it.each([
    ["export", "Xuất"],
    ["moderate", "Kiểm duyệt"],
    ["update_note", "Cập nhật ghi chú"],
    ["adjust_quantity", "Điều chỉnh số lượng"],
    ["publish", "Chuyển trạng thái"],
  ])("localizes audited action %s", (action, expected) => {
    expect(formatPermissionAction(action)).toBe(expected);
  });

  it("exposes each audited resource filter value exactly once", () => {
    const optionValues = PERMISSION_RESOURCE_OPTIONS.map(({ value }) => value);
    expect(new Set(optionValues).size).toBe(optionValues.length);
    expect(optionValues).toEqual(
      expect.arrayContaining([
        "reports",
        "reports.revenue",
        "reviews",
        "inventory.movements",
        "product_attributes",
        "authors",
        "publishers",
        "suppliers",
        "categories",
      ]),
    );
  });

  it("keeps technical action values in filter options", () => {
    expect(PERMISSION_ACTION_OPTIONS).toEqual(
      expect.arrayContaining([
        { value: "export", label: "Xuất" },
        { value: "moderate", label: "Kiểm duyệt" },
        { value: "update_note", label: "Cập nhật ghi chú" },
        { value: "adjust_quantity", label: "Điều chỉnh số lượng" },
        { value: "publish", label: "Chuyển trạng thái" },
      ]),
    );
  });

  it.each([
    ["INHERIT", "Kế thừa"],
    ["ALLOW", "Cho phép"],
    ["DENY", "Từ chối"],
  ] as const)("localizes permission state %s", (state, expected) => {
    expect(formatPermissionState(state)).toBe(expected);
  });
});
