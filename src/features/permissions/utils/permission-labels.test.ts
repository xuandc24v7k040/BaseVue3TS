import { describe, expect, it } from "vitest";
import {
  capitalizeFirstVietnameseLabel,
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
    ["stock_audit_events", "Stock audit events"],
  ])("localizes or formats resource %s", (resource, expected) => {
    expect(formatPermissionResource(resource)).toBe(expected);
  });

  it.each([
    ["INHERIT", "Kế thừa"],
    ["ALLOW", "Cho phép"],
    ["DENY", "Từ chối"],
  ] as const)("localizes permission state %s", (state, expected) => {
    expect(formatPermissionState(state)).toBe(expected);
  });
});
