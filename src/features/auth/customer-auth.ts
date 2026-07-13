import { toBookoraApiError } from '@/api/http/errors'
import { env } from '@/lib/env'

export type CustomerAuthErrorPlacement = 'global' | 'turnstile'

export interface CustomerAuthErrorMessage {
  message: string
  placement: CustomerAuthErrorPlacement
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_access_denied: 'Bạn đã hủy đăng nhập bằng Google.',
  google_state_invalid: 'Phiên đăng nhập Google không hợp lệ. Vui lòng thử lại.',
  google_auth_failed: 'Không thể đăng nhập bằng Google. Vui lòng thử lại.',
}

export function getGoogleAuthErrorMessage(value: unknown): string | null {
  return typeof value === 'string' ? GOOGLE_ERROR_MESSAGES[value] ?? null : null
}

export function getGoogleAuthStartUrl(): string {
  const baseUrl = env.apiBaseUrl.replace(/\/+$/u, '')
  return `${baseUrl}/auth/google`
}

export function startGoogleAuth(): void {
  window.location.assign(getGoogleAuthStartUrl())
}

export function getCustomerAuthErrorMessage(
  error: unknown,
  operation: 'login' | 'register',
): CustomerAuthErrorMessage {
  const apiError = toBookoraApiError(error)

  if (apiError.code === 'TURNSTILE_REQUIRED') {
    return { message: 'Yêu cầu xác minh bảo mật lại.', placement: 'turnstile' }
  }

  if (apiError.code === 'TURNSTILE_FAILED') {
    return {
      message: 'Xác minh bảo mật thất bại. Vui lòng thử lại.',
      placement: 'turnstile',
    }
  }

  if (apiError.code === 'CSRF_INVALID') {
    return {
      message: 'Phiên bảo mật không hợp lệ. Vui lòng thử lại.',
      placement: 'global',
    }
  }

  if (operation === 'login' && apiError.statusCode === 401) {
    return { message: 'Email hoặc mật khẩu không chính xác.', placement: 'global' }
  }

  if (operation === 'register' && apiError.statusCode === 409) {
    return { message: 'Email đã được sử dụng.', placement: 'global' }
  }

  if (apiError.statusCode === 429) {
    return {
      message: operation === 'login'
        ? 'Có quá nhiều yêu cầu đăng nhập hoặc tài khoản đang tạm khóa. Vui lòng thử lại sau.'
        : 'Có quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.',
      placement: 'global',
    }
  }

  if (apiError.statusCode === 400) {
    return { message: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.', placement: 'global' }
  }

  if (apiError.statusCode && apiError.statusCode >= 500) {
    return {
      message: 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.',
      placement: 'global',
    }
  }

  return {
    message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
    placement: 'global',
  }
}
