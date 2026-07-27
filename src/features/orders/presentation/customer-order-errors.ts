import axios from "axios";

const RECEIPT_ERROR_MESSAGES: Record<string, string> = {
  ORDER_CONFIRM_RECEIVED_NOT_ALLOWED:
    "Đơn hàng không còn ở trạng thái đang giao.",
  ORDER_CONCURRENT_UPDATE:
    "Đơn hàng vừa được cập nhật. Vui lòng tải lại và thử lại.",
};

export function customerReceiptErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Không thể xác nhận nhận hàng. Vui lòng thử lại.";
  }
  const data = error.response?.data as { code?: string } | undefined;
  return data?.code && RECEIPT_ERROR_MESSAGES[data.code]
    ? RECEIPT_ERROR_MESSAGES[data.code]
    : "Không thể xác nhận nhận hàng. Vui lòng thử lại.";
}
