import axios from "axios";
import type { ErrorResponseDto } from "@/api/generated/models";

const messages: Record<string, string> = {
  CURRENT_PASSWORD_INVALID: "Mật khẩu hiện tại không chính xác.",
  NEW_PASSWORD_SAME_AS_CURRENT:
    "Mật khẩu mới không được trùng mật khẩu hiện tại.",
  CUSTOMER_ADDRESS_WARD_PROVINCE_MISMATCH:
    "Phường/Xã không thuộc Tỉnh/Thành phố đã chọn.",
  CUSTOMER_ADDRESS_PROVINCE_INVALID: "Tỉnh/Thành phố không hợp lệ.",
  CUSTOMER_AVATAR_INVALID_FILE:
    "Ảnh đại diện không hợp lệ. Chỉ dùng JPEG, PNG hoặc WebP tối đa 5 MB.",
};

export function customerAccountErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return fallback;
  const code = error.response?.data.code;
  return (code && messages[code]) || fallback;
}
