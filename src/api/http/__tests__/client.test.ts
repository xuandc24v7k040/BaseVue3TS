import axios, { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import type {
  AxiosAdapter,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { healthGetHealth } from '@/api/generated/endpoints/health/health'
import { apiClient, getHttpInterceptorStatus, resetHttpClientForTest, setupHttpClient } from '@/api/http/client'
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
          return successResponse(config, { csrfToken: CSRF_TOKEN })
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
        return successResponse(config, { csrfToken: CSRF_TOKEN })
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

        return successResponse(config, { csrfToken: CSRF_TOKEN })
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
        return successResponse(config, { csrfToken: token })
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
})

describe('refresh infrastructure', () => {
  it('single-flights concurrent refresh and retries each original request once', async () => {
    let csrfCount = 0
    let refreshCount = 0
    let protectedCount = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === '/auth/csrf-token') {
        csrfCount += 1
        return successResponse(config, { csrfToken: CSRF_TOKEN })
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
        return successResponse(config, { csrfToken: CSRF_TOKEN })
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
        return successResponse(config, { csrfToken: CSRF_TOKEN })
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
        return successResponse(config, { csrfToken: CSRF_TOKEN })
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
