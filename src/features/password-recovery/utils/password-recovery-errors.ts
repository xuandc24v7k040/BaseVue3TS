import { toBookoraApiError } from "@/api/http/errors";

export type ResetLinkFailureState =
  | "expired"
  | "used"
  | "revoked"
  | "invalid";

const TOKEN_STATE_BY_CODE: Record<string, ResetLinkFailureState> = {
  PASSWORD_RESET_TOKEN_EXPIRED: "expired",
  PASSWORD_RESET_TOKEN_USED: "used",
  PASSWORD_RESET_TOKEN_REVOKED: "revoked",
  PASSWORD_RESET_TOKEN_INVALID: "invalid",
};

const MESSAGE_BY_CODE: Record<string, string> = {
  PASSWORD_RESET_EMAIL_NOT_FOUND:
    "Email này chưa được đăng ký trong hệ thống.",
  PASSWORD_RESET_UNSUPPORTED_GOOGLE_PROVIDER:
    "Tài khoản này đăng nhập bằng Google và không sử dụng mật khẩu Bookora. Vui lòng quay lại trang đăng nhập và chọn “Đăng nhập bằng Google”.",
  PASSWORD_RESET_TOKEN_EXPIRED:
    "Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.",
  PASSWORD_RESET_TOKEN_USED: "Liên kết này đã được sử dụng.",
  PASSWORD_RESET_TOKEN_REVOKED:
    "Liên kết này không còn hiệu lực. Vui lòng yêu cầu liên kết mới.",
  PASSWORD_RESET_TOKEN_INVALID:
    "Liên kết đặt lại mật khẩu không hợp lệ.",
  PASSWORD_RESET_TOKEN_CONFLICT:
    "Liên kết đặt lại mật khẩu đã hết hạn hoặc không còn hiệu lực.",
  NEW_PASSWORD_SAME_AS_CURRENT:
    "Mật khẩu mới không được trùng mật khẩu hiện tại.",
  PASSWORD_RESET_RATE_LIMITED:
    "Có quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.",
  TURNSTILE_REQUIRED: "Vui lòng hoàn tất xác minh bảo mật.",
  TURNSTILE_FAILED: "Xác minh bảo mật thất bại. Vui lòng thử lại.",
  CSRF_INVALID: "Phiên bảo mật không hợp lệ. Vui lòng thử lại.",
};

export function passwordRecoveryErrorCode(error: unknown): string | undefined {
  return toBookoraApiError(error).code;
}

export function passwordRecoveryErrorMessage(error: unknown): string {
  const apiError = toBookoraApiError(error);
  if (apiError.code && MESSAGE_BY_CODE[apiError.code]) {
    return MESSAGE_BY_CODE[apiError.code];
  }
  if (apiError.statusCode === 429) {
    return MESSAGE_BY_CODE.PASSWORD_RESET_RATE_LIMITED;
  }
  if (apiError.statusCode && apiError.statusCode >= 500) {
    return "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.";
  }
  return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
}

export function resetLinkFailureState(
  error: unknown,
): ResetLinkFailureState | null {
  const code = toBookoraApiError(error).code;
  return code ? (TOKEN_STATE_BY_CODE[code] ?? null) : null;
}
