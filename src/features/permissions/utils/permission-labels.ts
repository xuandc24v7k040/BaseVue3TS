import type { Permission } from "../types";

export const permissionResourceLabels: Readonly<Record<string, string>> = {
  dashboard: "tổng quan",
  users: "người dùng",
  staff: "nhân viên chi nhánh",
  branches: "chi nhánh",
  roles: "vai trò",
  permissions: "quyền hạn",
  super_admin: "quản trị hệ thống",
  branch_admin: "quản trị chi nhánh",
  branch_returns: "yêu cầu hoàn trả",
  orders: "đơn hàng",
  payments: "thanh toán",
  products: "sản phẩm",
  inventory: "kho và tồn",
  stock_receipts: "phiếu nhập kho",
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
  update_threshold: "Cập nhật ngưỡng cảnh báo",
  cancel: "Hủy",
  confirm: "Xác nhận",
  read_own: "Xem của chính mình",
  update_own: "Cập nhật của chính mình",
  create_own: "Tạo cho chính mình",
};

export const PERMISSION_RESOURCE_OPTIONS = Object.entries(
  permissionResourceLabels,
).map(([value, label]) => ({ value, label }));
export const PERMISSION_ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function capitalizeFirstVietnameseLabel(label: string): string {
  if (!label) return "";
  return label.charAt(0).toLocaleUpperCase("vi-VN") + label.slice(1);
}

export function formatPermissionResource(resource: string): string {
  return capitalizeFirstVietnameseLabel(
    permissionResourceLabels[resource] ?? formatSnakeCaseLabel(resource),
  );
}

export function formatPermissionAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function formatPermissionLabel(
  permission: Pick<Permission, "code" | "name" | "resource" | "action">,
): string {
  const action = ACTION_LABELS[permission.action];
  const resource = permissionResourceLabels[permission.resource];
  if (action && resource) return `${action} ${resource}`;
  return permission.name.trim() || permission.code;
}

export const permissionStateLabels = {
  INHERIT: "Kế thừa",
  ALLOW: "Cho phép",
  DENY: "Từ chối",
} as const;

export function formatPermissionState(
  state: keyof typeof permissionStateLabels,
): string {
  return permissionStateLabels[state];
}

function formatSnakeCaseLabel(value: string): string {
  return value
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .join(" ");
}
