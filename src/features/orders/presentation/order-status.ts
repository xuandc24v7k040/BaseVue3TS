import type {
  CustomerOrderResponseDtoPaymentStatus,
  CustomerOrderResponseDtoStatus,
} from "@/api/generated/models";

export const ORDER_STATUS_LABELS = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PAYMENT_FAILED: "Thanh toán thất bại",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang đóng gói",
  SHIPPING: "Đang giao hàng",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  RETURNED: "Đã hoàn trả",
} satisfies Record<CustomerOrderResponseDtoStatus, string>;

export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Chưa thanh toán",
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thất bại",
  EXPIRED: "Đã hết hạn",
  REFUNDED: "Đã hoàn tiền",
  CANCELLED: "Đã hủy",
} satisfies Record<CustomerOrderResponseDtoPaymentStatus, string>;

export function orderStatusLabel(status: string | null | undefined): string {
  return status && status in ORDER_STATUS_LABELS
    ? ORDER_STATUS_LABELS[status as CustomerOrderResponseDtoStatus]
    : "Không xác định";
}

export function customerOrderStatusLabel(
  status: string | null | undefined,
  receiptConfirmed: boolean,
): string {
  if (status === "SHIPPING" && receiptConfirmed) return "Đã nhận hàng";
  if (status === "COMPLETED") return "Hoàn thành";
  return orderStatusLabel(status);
}

export function paymentStatusLabel(status: string | null | undefined): string {
  return status && status in PAYMENT_STATUS_LABELS
    ? PAYMENT_STATUS_LABELS[status as CustomerOrderResponseDtoPaymentStatus]
    : "Không xác định";
}
