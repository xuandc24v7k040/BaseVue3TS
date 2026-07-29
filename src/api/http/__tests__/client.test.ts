import axios, { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import type {
  AxiosAdapter,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { healthGetHealth } from '@/api/generated/endpoints/health/health'
import { authLogin, authMe } from '@/api/generated/endpoints/auth/auth'
import { apiClient, getHttpInterceptorStatus, resetHttpClientForTest, setupHttpClient } from '@/api/http/client'
import { BranchScopeRequiredError } from '@/api/http/branch-scope'
import { clearCsrfToken, getCachedCsrfTokenForTest } from '@/api/http/csrf-manager'
import { toBookoraApiError } from '@/api/http/errors'

const CSRF_TOKEN = 'csrf-token-1'

function successResponse<T>(
  config: InternalAxiosRequestConfig,
  data: T,
  status = 200,
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
  }
}

function csrfSuccessResponse(
  config: InternalAxiosRequestConfig,
  token = CSRF_TOKEN,
): AxiosResponse {
  return successResponse(config, {
    statusCode: 200,
    message: 'ok',
    data: { csrfToken: token },
  })
}

function rejectResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): Promise<never> {
  return Promise.reject(new AxiosError(
    `Request failed with status code ${status}`,
    undefined,
    config,
    undefined,
    {
      data,
      status,
      statusText: 'Error',
      headers: {},
      config,
    },
  ))
}

function getHeader(config: InternalAxiosRequestConfig, name: string): string | undefined {
  const value = AxiosHeaders.from(config.headers).get(name)

  return typeof value === 'string' ? value : undefined
}

function getFinalUrl(config: AxiosRequestConfig): string {
  return axios.getUri(config)
}

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => 'legacy-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
})

afterEach(() => {
  resetHttpClientForTest()
  vi.unstubAllGlobals()
})

describe('shared HTTP boundary', () => {
  it('routes generated requests through the shared Axios instance', async () => {
    const seenRequests: InternalAxiosRequestConfig[] = []
    const adapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)
      return successResponse(config, {
        statusCode: 200,
        message: 'ok',
        data: { status: 'ok' },
      })
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    const signal = new AbortController().signal
    const response = await healthGetHealth({
      headers: {
        'X-Trace-Id': 'trace-1',
      },
    }, signal)

    expect(response).toEqual({
      statusCode: 200,
      message: 'ok',
      data: { status: 'ok' },
    })
    expect(seenRequests).toHaveLength(1)
    expect(seenRequests[0]?.withCredentials).toBe(true)
    expect(getFinalUrl(seenRequests[0])).toBe('http://localhost:8000/api/v1/health')
    expect(seenRequests[0]?.signal).toBe(signal)
    expect(getHeader(seenRequests[0], 'X-Trace-Id')).toBe('trace-1')
    expect(getHeader(seenRequests[0], 'Authorization')).toBeUndefined()
  })

  it('preserves backend error payloads', async () => {
    const payload = {
      statusCode: 400,
      message: ['Invalid request'],
      error: 'Bad Request',
      code: 'BOOKORA_VALIDATION_ERROR',
      errors: ['email must be valid'],
      path: '/api/v1/health',
      method: 'GET',
      timestamp: '2026-06-30T00:00:00.000Z',
    }
    const adapter: AxiosAdapter = (config) => rejectResponse(config, 400, payload)

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await expect(healthGetHealth()).rejects.toMatchObject({
      response: {
        data: payload,
      },
    })

    try {
      await healthGetHealth()
    } catch (error) {
      expect(toBookoraApiError(error)).toMatchObject({
        message: 'Invalid request',
        statusCode: 400,
        backendStatusCode: 400,
        code: 'BOOKORA_VALIDATION_ERROR',
        errors: ['email must be valid'],
        path: '/api/v1/health',
        method: 'GET',
        timestamp: '2026-06-30T00:00:00.000Z',
      })
    }
  })

  it('keeps interceptor setup idempotent', () => {
    resetHttpClientForTest(async (config) => successResponse(config, {}))
    setupHttpClient()
    setupHttpClient()

    expect(getHttpInterceptorStatus()).toEqual({ installed: true })
  })
})

describe('CSRF infrastructure', () => {
  it('unwraps the CSRF envelope before sending a generated login request', async () => {
    const seenRequests: InternalAxiosRequestConfig[] = []
    const adapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)

      if (config.url === '/auth/csrf-token') {
        return csrfSuccessResponse(config)
      }

      return successResponse(config, {
        statusCode: 200,
        message: 'ok',
        data: {
          id: '01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T',
          email: 'admin@example.com',
          fullName: 'Admin',
          type: 'SYSTEM',
        },
      })
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await authLogin({
      email: 'admin@example.com',
      password: 'Password1',
    })

    expect(seenRequests.map((request) => request.url)).toEqual([
      '/auth/csrf-token',
      '/auth/login',
    ])
    expect(getHeader(seenRequests[1], 'X-CSRF-Token')).toBe(CSRF_TOKEN)
    expect(seenRequests[1]?.withCredentials).toBe(true)
  })

  it('does not fetch or attach CSRF for GET requests', async () => {
    const seenRequests: InternalAxiosRequestConfig[] = []
    const adapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)
      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await apiClient.get('/books')

    expect(seenRequests.map((request) => request.url)).toEqual(['/books'])
    expect(getHeader(seenRequests[0], 'X-CSRF-Token')).toBeUndefined()
  })

  it.each(['post', 'put', 'patch', 'delete'] as const)(
    'attaches CSRF for %s requests',
    async (method) => {
      const seenRequests: InternalAxiosRequestConfig[] = []
      const adapter: AxiosAdapter = async (config) => {
        seenRequests.push(config)

        if (config.url === '/auth/csrf-token') {
          return csrfSuccessResponse(config)
        }

        return successResponse(config, {})
      }

      resetHttpClientForTest(adapter)
      setupHttpClient()

      await apiClient.request({
        method,
        url: '/books',
      })

      expect(seenRequests.map((request) => request.url)).toEqual([
        '/auth/csrf-token',
        '/books',
      ])
      expect(getHeader(seenRequests[1], 'X-CSRF-Token')).toBe(CSRF_TOKEN)
    },
  )

  it('single-flights concurrent CSRF bootstrap requests', async () => {
    let csrfCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        csrfCount += 1
        return csrfSuccessResponse(config)
      }

      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await Promise.all([
      apiClient.post('/books'),
      apiClient.put('/books/1'),
      apiClient.delete('/books/2'),
    ])

    expect(csrfCount).toBe(1)
  })

  it('does not send mutation when CSRF bootstrap fails and can retry later', async () => {
    let csrfCount = 0
    let mutationCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        csrfCount += 1

        if (csrfCount === 1) {
          return rejectResponse(config, 500, { message: 'csrf failed' })
        }

        return csrfSuccessResponse(config)
      }

      mutationCount += 1
      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await expect(apiClient.post('/books')).rejects.toBeInstanceOf(AxiosError)
    expect(mutationCount).toBe(0)
    expect(getCachedCsrfTokenForTest()).toBeNull()

    await apiClient.post('/books')

    expect(csrfCount).toBe(2)
    expect(mutationCount).toBe(1)
  })

  it('respects caller-provided CSRF header and supports reset', async () => {
    let csrfCount = 0
    const csrfTokens = ['token-1', 'token-2']
    const seenRequests: InternalAxiosRequestConfig[] = []
    const adapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)

      if (config.url === '/auth/csrf-token') {
        const token = csrfTokens[csrfCount] ?? CSRF_TOKEN
        csrfCount += 1
        return csrfSuccessResponse(config, token)
      }

      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await apiClient.post('/manual', undefined, {
      headers: {
        'X-CSRF-Token': 'manual-token',
      },
    })
    await apiClient.post('/bootstrap')
    clearCsrfToken()
    await apiClient.post('/bootstrap-again')

    expect(csrfCount).toBe(2)
    expect(getHeader(seenRequests[0], 'X-CSRF-Token')).toBe('manual-token')
    expect(getHeader(seenRequests[2], 'X-CSRF-Token')).toBe('token-1')
    expect(getHeader(seenRequests[4], 'X-CSRF-Token')).toBe('token-2')
  })

  it('fetches a fresh CSRF token before the first login after reset invalidation', async () => {
    const seenRequests: InternalAxiosRequestConfig[] = []
    const csrfTokens = ['before-reset', 'after-reset']
    let csrfCount = 0
    const adapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)

      if (config.url === '/auth/csrf-token') {
        const token = csrfTokens[csrfCount] ?? CSRF_TOKEN
        csrfCount += 1
        return csrfSuccessResponse(config, token)
      }

      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await apiClient.post('/before-reset')
    clearCsrfToken()
    await apiClient.post('/auth/login', {
      email: 'reader@bookora.vn',
      password: 'Password1',
    })

    expect(seenRequests.map((request) => request.url)).toEqual([
      '/auth/csrf-token',
      '/before-reset',
      '/auth/csrf-token',
      '/auth/login',
    ])
    expect(getHeader(seenRequests[1]!, 'X-CSRF-Token')).toBe('before-reset')
    expect(getHeader(seenRequests[3]!, 'X-CSRF-Token')).toBe('after-reset')
  })
})

describe('refresh infrastructure', () => {
  it.each([
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/reset-password/validate',
  ])('never refreshes password-recovery request %s after 401', async (url) => {
    let refreshCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        return csrfSuccessResponse(config)
      }

      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return successResponse(config, {})
      }

      return rejectResponse(config, 401, {
        statusCode: 401,
        message: 'password recovery rejected',
      })
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await expect(apiClient.post(url, {})).rejects.toBeInstanceOf(AxiosError)
    expect(refreshCount).toBe(0)
  })

  it('does not refresh a silent login-page /auth/me check', async () => {
    let meCount = 0
    let refreshCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/me') {
        meCount += 1
        return rejectResponse(config, 401, {
          statusCode: 401,
          message: 'anonymous',
        })
      }

      if (config.url === '/auth/refresh') {
        refreshCount += 1
      }

      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await expect(
      authMe({ skipAuthRefresh: true }),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(meCount).toBe(1)
    expect(refreshCount).toBe(0)
  })

  it('still refreshes a protected /auth/me request', async () => {
    let meCount = 0
    let refreshCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        return csrfSuccessResponse(config)
      }

      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return successResponse(config, {
          statusCode: 200,
          message: 'refreshed',
          data: null,
        })
      }

      if (config.url === '/auth/me') {
        meCount += 1

        if (meCount === 1) {
          return rejectResponse(config, 401, {
            statusCode: 401,
            message: 'expired',
          })
        }

        return successResponse(config, {
          statusCode: 200,
          message: 'ok',
          data: { id: 'user-1' },
        })
      }

      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await expect(authMe()).resolves.toMatchObject({
      data: { id: 'user-1' },
    })
    expect(meCount).toBe(2)
    expect(refreshCount).toBe(1)
  })

  it('single-flights concurrent refresh and retries each original request once', async () => {
    let csrfCount = 0
    let refreshCount = 0
    let protectedCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        csrfCount += 1
        return csrfSuccessResponse(config)
      }

      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return successResponse(config, { statusCode: 200, message: 'refreshed', data: null })
      }

      if (config.url === '/protected') {
        protectedCount += 1

        if (protectedCount <= 3) {
          return rejectResponse(config, 401, { statusCode: 401, message: 'expired' })
        }

        return successResponse(config, { ok: true, attempt: protectedCount })
      }

      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    const results = await Promise.all([
      apiClient.get('/protected'),
      apiClient.get('/protected'),
      apiClient.get('/protected'),
    ])

    expect(results).toHaveLength(3)
    expect(csrfCount).toBe(1)
    expect(refreshCount).toBe(1)
    expect(protectedCount).toBe(6)
  })

  it('retries an original request at most once', async () => {
    let refreshCount = 0
    let protectedCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        return csrfSuccessResponse(config)
      }

      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return successResponse(config, { statusCode: 200, message: 'refreshed', data: null })
      }

      protectedCount += 1
      return rejectResponse(config, 401, { statusCode: 401, message: 'still expired' })
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(AxiosError)

    expect(refreshCount).toBe(1)
    expect(protectedCount).toBe(2)
  })

  it('handles refresh failure once for a concurrent wave', async () => {
    let refreshCount = 0
    let protectedCount = 0
    const onSessionExpired = vi.fn()
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        return csrfSuccessResponse(config)
      }

      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return rejectResponse(config, 401, {
          statusCode: 401,
          message: 'refresh expired',
          code: 'SESSION_EXPIRED',
        })
      }

      protectedCount += 1
      return rejectResponse(config, 401, { statusCode: 401, message: 'expired' })
    }

    resetHttpClientForTest(adapter)
    setupHttpClient({ onSessionExpired })

    await expect(Promise.all([
      apiClient.get('/protected'),
      apiClient.get('/protected'),
      apiClient.get('/protected'),
    ])).rejects.toBeInstanceOf(AxiosError)

    expect(refreshCount).toBe(1)
    expect(protectedCount).toBe(3)
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
    expect(getCachedCsrfTokenForTest()).toBeNull()
  })

  it('does not refresh on 403', async () => {
    let refreshCount = 0
    const payload = { statusCode: 403, message: 'forbidden', code: 'FORBIDDEN' }
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return successResponse(config, {})
      }

      return rejectResponse(config, 403, payload)
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      response: {
        data: payload,
      },
    })
    expect(refreshCount).toBe(0)
  })

  it('does not recurse when the refresh endpoint returns 401', async () => {
    let refreshCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        return csrfSuccessResponse(config)
      }

      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return rejectResponse(config, 401, { statusCode: 401, message: 'refresh failed' })
      }

      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient()

    await expect(apiClient.post('/auth/refresh')).rejects.toBeInstanceOf(AxiosError)

    expect(refreshCount).toBe(1)
  })

  it('handles REFRESH_TOKEN_ALREADY_ROTATED non-destructively', async () => {
    let refreshCount = 0
    let protectedCount = 0
    const onSessionExpired = vi.fn()
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return successResponse(config, {})
      }

      protectedCount += 1

      if (protectedCount === 1) {
        return rejectResponse(config, 401, {
          statusCode: 401,
          message: 'rotated elsewhere',
          code: 'REFRESH_TOKEN_ALREADY_ROTATED',
        })
      }

      return successResponse(config, { ok: true })
    }

    resetHttpClientForTest(adapter)
    setupHttpClient({ onSessionExpired })

    await expect(apiClient.get('/protected')).resolves.toMatchObject({
      data: { ok: true },
    })

    expect(refreshCount).toBe(0)
    expect(protectedCount).toBe(2)
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('does not refresh or expire session on cancellation', async () => {
    let refreshCount = 0
    const onSessionExpired = vi.fn()
    const adapter: AxiosAdapter = (config) => {
      if (config.url === '/auth/refresh') {
        refreshCount += 1
        return Promise.resolve(successResponse(config, {}))
      }

      return Promise.reject(new CanceledError('cancelled', undefined, config))
    }

    resetHttpClientForTest(adapter)
    setupHttpClient({ onSessionExpired })

    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(CanceledError)

    expect(refreshCount).toBe(0)
    expect(onSessionExpired).not.toHaveBeenCalled()
  })
})

describe('branch-scoped HTTP boundary', () => {
  it('attaches X-Branch-Id only to explicitly branch-scoped requests', async () => {
    const seenRequests: InternalAxiosRequestConfig[] = []
    const adapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)
      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient({ getSelectedBranchId: () => '01K00000000000000000000001' })

    await apiClient.get('/staff', { branchScoped: true })
    await apiClient.get('/health')

    expect(getHeader(seenRequests[0]!, 'X-Branch-Id')).toBe('01K00000000000000000000001')
    expect(getHeader(seenRequests[1]!, 'X-Branch-Id')).toBeUndefined()
    expect(getHeader(seenRequests[0]!, 'branchScoped')).toBeUndefined()
  })

  it.each([
    '/auth/me',
    '/auth/login',
    '/auth/logout',
    '/auth/refresh',
    '/auth/csrf-token',
    '/books',
  ])('does not attach a branch header to unmarked request %s', async (url) => {
    const seenRequests: InternalAxiosRequestConfig[] = []
    const adapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)
      return successResponse(config, {})
    }

    resetHttpClientForTest(adapter)
    setupHttpClient({ getSelectedBranchId: () => '01K00000000000000000000001' })

    await apiClient.get(url)
    expect(getHeader(seenRequests[0]!, 'X-Branch-Id')).toBeUndefined()
  })

  it('fails before sending when a branch-scoped request has no selected branch', async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => successResponse(config, {}))
    resetHttpClientForTest(adapter)
    setupHttpClient({ getSelectedBranchId: () => null })

    await expect(apiClient.get('/staff', { branchScoped: true })).rejects.toBeInstanceOf(
      BranchScopeRequiredError,
    )
    expect(adapter).not.toHaveBeenCalled()
  })

  it('preserves a caller-provided branch header', async () => {
    const seenRequests: InternalAxiosRequestConfig[] = []
    const adapter: AxiosAdapter = async (config) => {
      seenRequests.push(config)
      return successResponse(config, {})
    }
    resetHttpClientForTest(adapter)
    setupHttpClient({ getSelectedBranchId: () => '01K00000000000000000000001' })

    await apiClient.get('/staff', {
      branchScoped: true,
      headers: { 'X-Branch-Id': '01K00000000000000000000002' },
    })

    expect(getHeader(seenRequests[0]!, 'X-Branch-Id')).toBe('01K00000000000000000000002')
  })

  it('reports only invalid branch context without expiring the session', async () => {
    const forbidden = vi.fn()
    const expired = vi.fn()
    const adapter: AxiosAdapter = (config) => rejectResponse(config, 403, {
      statusCode: 403,
      code: 'BRANCH_ACCESS_DENIED',
    })
    resetHttpClientForTest(adapter)
    setupHttpClient({
      getSelectedBranchId: () => '01K00000000000000000000001',
      onBranchScopeForbidden: forbidden,
      onSessionExpired: expired,
    })

    await expect(apiClient.get('/staff', { branchScoped: true })).rejects.toBeInstanceOf(AxiosError)
    expect(forbidden).toHaveBeenCalledOnce()
    expect(expired).not.toHaveBeenCalled()
  })

  it('does not report a section-level permission denial as lost branch access', async () => {
    const forbidden = vi.fn()
    const adapter: AxiosAdapter = (config) => rejectResponse(config, 403, {
      statusCode: 403,
      code: 'PERMISSION_DENIED',
    })
    resetHttpClientForTest(adapter)
    setupHttpClient({
      getSelectedBranchId: () => '01K00000000000000000000001',
      onBranchScopeForbidden: forbidden,
    })

    await expect(
      apiClient.get('/roles', { branchScoped: true }),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(forbidden).not.toHaveBeenCalled()
  })
})
