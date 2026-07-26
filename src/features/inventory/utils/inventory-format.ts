import axios from "axios";
import { formatDateTime as formatSharedDateTime } from "@/lib/date-format";

export const stockStateLabel = {
  OUT_OF_STOCK: "Hết hàng",
  LOW_STOCK: "Sắp hết",
  IN_STOCK: "Còn hàng",
} as const;

export const receiptStatusLabel = {
  DRAFT: "Bản nháp",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
} as const;

export function formatMoney(value: string | number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDateTime(value: string): string {
  return formatSharedDateTime(value);
}

export function inventoryErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (error.response?.status === 403) {
    return "Bạn không có quyền chọn sản phẩm cho phiếu nhập tại chi nhánh này.";
  }
  const data = error.response?.data as
    { message?: string | string[]; code?: string } | undefined;
  if (Array.isArray(data?.message)) return data.message[0] ?? fallback;
  return data?.message ?? fallback;
}
