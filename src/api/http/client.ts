import './axios-extensions'

import axios, { AxiosHeaders, CanceledError } from 'axios'
import type {
  AxiosAdapter,
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import type { AuthCsrfToken200 } from '@/api/generated/models'
import { env } from '@/lib/env'
import { BRANCH_HEADER_NAME, BranchScopeRequiredError } from './branch-scope'
import { clearCsrfToken, configureCsrfTokenFetcher, getCsrfToken } from './csrf-manager'
import { configureRefreshSession, refreshSession, resetRefreshSessionForTest } from './refresh-manager'

const CSRF_HEADER_NAME = 'X-CSRF-Token'
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete'])
const AUTH_REFRESH_EXCLUDED_PATHS = new Set([
  '/auth/csrf-token',
  '/auth/google',
  '/auth/google/callback',
  '/auth/login',
  '/auth/logout',
  '/auth/refresh',
  '/auth/register',
])
const REFRESH_TOKEN_REUSE_CODES = new Set([
  'REFRESH_TOKEN_ALREADY_ROTATED',
  'REFRESH_TOKEN_REUSE_DETECTED',
])
const INVALID_BRANCH_CONTEXT_CODES = new Set([
  'BRANCH_ACCESS_DENIED',
  'BRANCH_NOT_FOUND',
])

interface SetupHttpClientOptions {
  onSessionExpired?: (error: unknown) => void
  getSelectedBranchId?: () => string | null
  onBranchScopeForbidden?: (error: AxiosError) => void
}

interface InterceptorIds {
  request: number
  response: number
}

let interceptorIds: InterceptorIds | null = null
let onSessionExpired: ((error: unknown) => void) | null = null
let getSelectedBranchId: (() => string | null) | null = null
let onBranchScopeForbidden: ((error: AxiosError) => void) | null = null

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function isMutatingMethod(method: string | undefined): boolean {
  return method ? MUTATING_METHODS.has(method.toLowerCase()) : false
}

function normalizeRequestPath(config: AxiosRequestConfig): string {
  const rawUrl = config.url ?? ''
  const pathWithoutQuery = rawUrl.split('?')[0] ?? ''

  if (pathWithoutQuery.startsWith('/api/v1/')) {
    return pathWithoutQuery.replace('/api/v1', '')
  }

  if (pathWithoutQuery.startsWith('/')) {
    return pathWithoutQuery
  }

  try {
    const parsedUrl = new URL(rawUrl, config.baseURL ?? apiClient.defaults.baseURL)
    return parsedUrl.pathname.replace(/^\/api\/v1/, '')
  } catch {
    return `/${pathWithoutQuery}`
  }
}

function shouldSkipAuthRefresh(config: AxiosRequestConfig): boolean {
  return config.skipAuthRefresh || AUTH_REFRESH_EXCLUDED_PATHS.has(normalizeRequestPath(config))
}

function getBackendErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }

  const maybeCode = (data as { code?: unknown }).code

  return typeof maybeCode === 'string' ? maybeCode : undefined
}

function isRefreshTokenReuseError(error: AxiosError): boolean {
  return REFRESH_TOKEN_REUSE_CODES.has(getBackendErrorCode(error.response?.data) ?? '')
}

function setCsrfHeader(config: InternalAxiosRequestConfig, token: string): void {
  const headers = AxiosHeaders.from(config.headers)

  if (!headers.has(CSRF_HEADER_NAME)) {
    headers.set(CSRF_HEADER_NAME, token)
  }

  config.headers = headers
}

async function attachCsrfToken(
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> {
  if (config.skipCsrf || !isMutatingMethod(config.method)) {
    return config
  }

  const headers = AxiosHeaders.from(config.headers)

  if (headers.has(CSRF_HEADER_NAME)) {
    config.headers = headers
    return config
  }

  setCsrfHeader(config, await getCsrfToken())

  return config
}

function attachBranchContext(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  if (!config.branchScoped) return config

  const branchId = getSelectedBranchId?.() ?? null
  if (!branchId) throw new BranchScopeRequiredError()

  const headers = AxiosHeaders.from(config.headers)
  if (config.branchHeaderAttached || !headers.has(BRANCH_HEADER_NAME)) {
    headers.set(BRANCH_HEADER_NAME, branchId)
    config.branchHeaderAttached = true
  }
  config.headers = headers
  return config
}

async function prepareRequest(
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> {
  return attachCsrfToken(attachBranchContext(config))
}

async function handleAuthError(error: AxiosError): Promise<AxiosResponse> {
  const originalConfig = error.config

  if (
    !originalConfig ||
    error instanceof CanceledError ||
    error.response?.status !== 401 ||
    originalConfig.retryAttempted ||
    shouldSkipAuthRefresh(originalConfig)
  ) {
    return Promise.reject(error)
  }

  const retryConfig: AxiosRequestConfig = {
    ...originalConfig,
    retryAttempted: true,
  }

  if (!isRefreshTokenReuseError(error)) {
    await refreshSession()
  }

  return apiClient.request(retryConfig)
}

function createCsrfTokenRequest(): Promise<string> {
  return apiClient
    .get<AuthCsrfToken200>('/auth/csrf-token', {
      skipCsrf: true,
      skipAuthRefresh: true,
    })
    .then((response) => response.data.data.csrfToken)
}

function createRefreshSessionRequest(): Promise<void> {
  return apiClient
    .post('/auth/refresh', undefined, {
      skipAuthRefresh: true,
    })
    .then(() => undefined)
}

function handleRefreshFailure(error: unknown): void {
  clearCsrfToken()
  onSessionExpired?.(error)
}

function handleResponseError(error: AxiosError): Promise<AxiosResponse> {
  const errorCode = getBackendErrorCode(error.response?.data)
  if (
    error.config?.branchScoped
    && INVALID_BRANCH_CONTEXT_CODES.has(errorCode ?? '')
    && (error.response?.status === 403 || error.response?.status === 404)
  ) {
    onBranchScopeForbidden?.(error)
  }

  return handleAuthError(error)
}

export function setupHttpClient(options: SetupHttpClientOptions = {}): void {
  onSessionExpired = options.onSessionExpired ?? onSessionExpired
  getSelectedBranchId = options.getSelectedBranchId ?? getSelectedBranchId
  onBranchScopeForbidden = options.onBranchScopeForbidden ?? onBranchScopeForbidden
  configureCsrfTokenFetcher(createCsrfTokenRequest)
  configureRefreshSession({
    request: createRefreshSessionRequest,
    onFailure: handleRefreshFailure,
  })

  if (interceptorIds) {
    return
  }

  interceptorIds = {
    request: apiClient.interceptors.request.use(prepareRequest),
    response: apiClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => handleResponseError(error),
    ),
  }
}

export function getHttpInterceptorStatus(): { installed: boolean } {
  return {
    installed: interceptorIds !== null,
  }
}

export function resetHttpClientForTest(adapter?: AxiosAdapter): void {
  if (interceptorIds) {
    apiClient.interceptors.request.eject(interceptorIds.request)
    apiClient.interceptors.response.eject(interceptorIds.response)
  }

  interceptorIds = null
  onSessionExpired = null
  getSelectedBranchId = null
  onBranchScopeForbidden = null
  clearCsrfToken()
  resetRefreshSessionForTest()
  apiClient.defaults.baseURL = env.apiBaseUrl
  apiClient.defaults.adapter = adapter
}

setupHttpClient()
