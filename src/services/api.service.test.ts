// @vitest-environment happy-dom

import { QueryClient } from '@tanstack/vue-query'
import { AxiosError } from 'axios'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupHttpClient } from '@/api/http/client'
import { setupApiInterceptors } from '@/services/api.service'
import { useAuthStore } from '@/stores/auth.store'

vi.mock('@/api/http/client', () => ({
  apiClient: {},
  setupHttpClient: vi.fn(),
}))

vi.mock('@/api/modules/auth.api', () => ({
  fetchCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutCurrentAccount: vi.fn(),
}))

const setupClient = vi.mocked(setupHttpClient)

function sessionExpiredError(): AxiosError {
  return new AxiosError(
    'expired',
    undefined,
    undefined,
    undefined,
    {
      data: { statusCode: 401 },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: {} } as never,
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('application auth lifecycle bridge', () => {
  it('marks the session expired and clears only auth-sensitive queries', () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    const store = useAuthStore(pinia)
    const markSessionExpired = vi.spyOn(store, 'markSessionExpired')
    const removeQueries = vi.spyOn(queryClient, 'removeQueries')
    const logout = vi.spyOn(store, 'logout')
    localStorage.setItem('bookora.session_hint', '1')

    setupApiInterceptors(pinia, { queryClient })
    const options = setupClient.mock.calls[0]?.[0]
    options?.onSessionExpired?.(sessionExpiredError())

    expect(markSessionExpired).toHaveBeenCalledOnce()
    expect(logout).not.toHaveBeenCalled()
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] })
    expect(localStorage.getItem('bookora.session_hint')).toBeNull()
  })

  it('redirects protected routes without calling logout', async () => {
    const pinia = createPinia()
    const queryClient = new QueryClient()
    const store = useAuthStore(pinia)
    const logout = vi.spyOn(store, 'logout')
    const replace = vi.fn().mockResolvedValue(undefined)
    const router = {
      currentRoute: {
        value: {
          path: '/super-admin/dashboard',
          fullPath: '/super-admin/dashboard',
        },
      },
      replace,
    }

    setupApiInterceptors(pinia, { queryClient, router: router as never })
    setupClient.mock.calls[0]?.[0]?.onSessionExpired?.(sessionExpiredError())
    await Promise.resolve()

    expect(replace).toHaveBeenCalledWith({
      name: 'admin-login',
      query: { redirect: '/super-admin/dashboard' },
    })
    expect(logout).not.toHaveBeenCalled()
  })

  it('redirects an expired Member Center session to customer login', async () => {
    const pinia = createPinia()
    const replace = vi.fn().mockResolvedValue(undefined)
    const router = {
      currentRoute: { value: { path: '/account/profile', fullPath: '/account/profile?tab=info' } },
      replace,
    }

    setupApiInterceptors(pinia, { router: router as never })
    setupClient.mock.calls[0]?.[0]?.onSessionExpired?.(sessionExpiredError())
    await Promise.resolve()

    expect(replace).toHaveBeenCalledWith({
      name: 'customer-login',
      query: { redirect: '/account/profile?tab=info' },
    })
  })

  it('does not expire the session for transient refresh failures', () => {
    const pinia = createPinia()
    const store = useAuthStore(pinia)
    const markSessionExpired = vi.spyOn(store, 'markSessionExpired')

    setupApiInterceptors(pinia)
    setupClient.mock.calls[0]?.[0]?.onSessionExpired?.(
      new AxiosError('Network Error'),
    )

    expect(markSessionExpired).not.toHaveBeenCalled()
  })
})
