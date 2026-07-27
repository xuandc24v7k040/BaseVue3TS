import axios from "axios";
import { formatDateTime } from "@/lib/date-format";

export const orderStatusLabel: Record<string, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PAYMENT_FAILED: "Thanh toán lỗi",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang xử lý",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

export const paymentStatusLabel: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán lỗi",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
  PARTIALLY_REFUNDED: "Hoàn một phần",
};

export const paymentMethodLabel: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng",
  VNPAY: "Thanh toán VNPAY",
};

export const transitionLabel: Record<string, string> = {
  CONFIRMED: "Xác nhận đơn",
  PACKING: "Bắt đầu xử lý",
  SHIPPING: "Bắt đầu giao",
  COMPLETED: "Hoàn thành đơn",
};

export const actorTypeLabel: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  ADMIN: "Quản trị viên",
  SYSTEM: "Hệ thống",
};

export function formatMoney(value: string | number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export { formatDateTime };

export function adminOrderErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as
    { message?: string | string[]; code?: string } | undefined;
  if (Array.isArray(data?.message)) return data.message[0] ?? fallback;
  if (data?.code === "ORDER_CONCURRENT_UPDATE") {
    return "Đơn hàng vừa được xử lý bởi người khác. Dữ liệu đã được tải lại.";
  }
  if (data?.code === "ORDER_CUSTOMER_RECEIPT_REQUIRED") {
    return "Đang chờ khách hàng xác nhận đã nhận hàng.";
  }
  return data?.message ?? fallback;
}
