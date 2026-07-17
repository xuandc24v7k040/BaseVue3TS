import type { Permission } from "../types";

const RESOURCE_LABELS: Readonly<Record<string, string>> = {
  dashboard: "bảng điều khiển",
  users: "người dùng",
  staff: "nhân viên",
  branches: "chi nhánh",
  roles: "vai trò",
  permissions: "quyền",
  super_admin: "quản trị viên hệ thống",
  branch_admin: "quản trị viên chi nhánh",
  orders: "đơn hàng",
  payments: "thanh toán",
  products: "sản phẩm",
  inventory: "kho hàng",
  stock_movements: "biến động kho",
  profile: "hồ sơ",
};

const ACTION_LABELS: Readonly<Record<string, string>> = {
  read: "Xem",
  create: "Tạo",
  update: "Cập nhật",
  delete: "Xóa",
  assign: "Gán",
  assign_role: "Gán vai trò",
  assign_permission: "Gán quyền",
  assign_branch: "Gán chi nhánh",
  update_status: "Cập nhật trạng thái",
  read_own: "Xem của chính mình",
  update_own: "Cập nhật của chính mình",
  create_own: "Tạo cho chính mình",
};

export const PERMISSION_RESOURCE_OPTIONS = Object.entries(RESOURCE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
export const PERMISSION_ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function capitalizeFirstVietnameseLabel(label: string): string {
  if (!label) return "";
  return label.charAt(0).toLocaleUpperCase("vi-VN") + label.slice(1);
}

export function formatPermissionResource(resource: string): string {
  return capitalizeFirstVietnameseLabel(RESOURCE_LABELS[resource] ?? resource);
}

export function formatPermissionAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function formatPermissionLabel(
  permission: Pick<Permission, "code" | "name" | "resource" | "action">,
): string {
  const action = ACTION_LABELS[permission.action];
  const resource = RESOURCE_LABELS[permission.resource];
  if (action && resource) return `${action} ${resource}`;
  return permission.name.trim() || permission.code;
}
