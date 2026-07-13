import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authLogin,
  authLogout,
  authMe,
  authRegister,
} from '@/api/generated/endpoints/auth/auth'
import {
  fetchCurrentUser,
  loginWithPassword,
  logoutCurrentAccount,
  registerCustomer,
} from '@/api/modules/auth.api'
import { getCsrfToken } from '@/api/http/csrf-manager'

vi.mock('@/api/generated/endpoints/auth/auth', () => ({
  authLogin: vi.fn(),
  authLogout: vi.fn(),
  authMe: vi.fn(),
  authRegister: vi.fn(),
}))
vi.mock('@/api/http/csrf-manager', () => ({
  getCsrfToken: vi.fn(),
}))

const generatedLogin = vi.mocked(authLogin)
const generatedLogout = vi.mocked(authLogout)
const generatedMe = vi.mocked(authMe)
const generatedRegister = vi.mocked(authRegister)
const ensureCsrfToken = vi.mocked(getCsrfToken)

beforeEach(() => {
  vi.clearAllMocks()
  ensureCsrfToken.mockResolvedValue('csrf-token')
})

describe('auth API adapter', () => {
  it('unwraps the backend envelope exactly once for /auth/me', async () => {
    const user = { id: 'user-1', email: 'user@example.com' }
    generatedMe.mockResolvedValue({
      statusCode: 200,
      message: 'ok',
      data: user,
    } as Awaited<ReturnType<typeof authMe>>)

    await expect(fetchCurrentUser()).resolves.toBe(user)
  })

  it('passes the silent refresh option only to the generated /auth/me request', async () => {
    generatedMe.mockResolvedValue({
      statusCode: 200,
      message: 'ok',
      data: { id: 'user-1' },
    } as Awaited<ReturnType<typeof authMe>>)

    await fetchCurrentUser({ skipAuthRefresh: true })

    expect(generatedMe).toHaveBeenCalledWith({ skipAuthRefresh: true })
  })

  it('preserves login backend errors unchanged', async () => {
    const backendError = {
      response: {
        status: 401,
        data: { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid' },
      },
    }
    generatedLogin.mockRejectedValue(backendError)

    await expect(loginWithPassword({
      email: 'user@example.com',
      password: 'password1',
    })).rejects.toBe(backendError)
  })

  it('ensures a CSRF token before calling generated login', async () => {
    generatedLogin.mockResolvedValue({ data: { id: 'user-1' } } as never)

    await loginWithPassword({
      email: 'user@example.com',
      password: 'Password1',
    })

    expect(ensureCsrfToken).toHaveBeenCalledOnce()
    expect(ensureCsrfToken.mock.invocationCallOrder[0]).toBeLessThan(
      generatedLogin.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    )
  })

  it('ensures CSRF and unwraps the register envelope exactly once', async () => {
    const registeredUser = {
      id: 'customer-1',
      email: 'reader@bookora.vn',
      fullName: 'Nguyễn An',
      type: 'CUSTOMER' as const,
    }
    generatedRegister.mockResolvedValue({
      statusCode: 201,
      message: 'created',
      data: registeredUser,
    })

    await expect(registerCustomer({
      email: registeredUser.email,
      fullName: registeredUser.fullName,
      password: 'Password1',
    })).resolves.toBe(registeredUser)

    expect(ensureCsrfToken).toHaveBeenCalledOnce()
    expect(ensureCsrfToken.mock.invocationCallOrder[0]).toBeLessThan(
      generatedRegister.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    )
  })

  it('delegates only to the generated auth endpoint functions', async () => {
    generatedLogin.mockResolvedValue({ data: { id: 'user-1' } } as never)
    generatedLogout.mockResolvedValue({ data: { success: true } } as never)

    await loginWithPassword({ email: 'user@example.com', password: 'password1' })
    await logoutCurrentAccount()

    expect(generatedLogin).toHaveBeenCalledOnce()
    expect(generatedLogout).toHaveBeenCalledOnce()
    expect(generatedMe).not.toHaveBeenCalled()
  })
})
