import { describe, expect, it, vi } from 'vitest'
import {
  getCustomerAuthErrorMessage,
  getGoogleAuthErrorMessage,
  getGoogleAuthStartUrl,
} from './customer-auth'

vi.mock('@/lib/env', () => ({
  env: { apiBaseUrl: 'https://api.bookora.test/api/v1/' },
}))

describe('customer auth helpers', () => {
  it('builds Google OAuth navigation from the configured API base URL', () => {
    expect(getGoogleAuthStartUrl()).toBe('https://api.bookora.test/api/v1/auth/google')
  })

  it.each([
    ['google_access_denied', 'Bạn đã hủy đăng nhập bằng Google.'],
    ['google_state_invalid', 'Phiên đăng nhập Google không hợp lệ. Vui lòng thử lại.'],
    ['google_auth_failed', 'Không thể đăng nhập bằng Google. Vui lòng thử lại.'],
  ])('maps %s without exposing backend details', (code, message) => {
    expect(getGoogleAuthErrorMessage(code)).toBe(message)
  })

  it('uses the captcha slot only for machine-readable Turnstile failures', () => {
    expect(getCustomerAuthErrorMessage({
      response: { status: 403, data: { code: 'TURNSTILE_FAILED' } },
      isAxiosError: true,
    }, 'login')).toMatchObject({ placement: 'turnstile' })

    expect(getCustomerAuthErrorMessage({
      response: { status: 403, data: { code: 'FORBIDDEN' } },
      isAxiosError: true,
    }, 'login')).toMatchObject({ placement: 'global' })
  })
})
