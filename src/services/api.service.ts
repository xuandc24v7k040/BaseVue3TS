import type { QueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'
import { apiClient, setupHttpClient } from '@/api/http/client'
import { clearCsrfToken } from '@/api/http/csrf-manager'
import { toBookoraApiError } from '@/api/http/errors'
import { clearAuthSensitiveQueries } from '@/api/query-cache'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiError } from '@/types/api.type'

interface SetupApiInterceptorsOptions {
  queryClient?: QueryClient
  router?: Router
}

export const api: AxiosInstance = apiClient

export function normalizeApiError(error: unknown): ApiError {
  return toBookoraApiError(error)
}

export function setupApiInterceptors(
  pinia: Pinia,
  options: SetupApiInterceptorsOptions = {},
): void {
  const authStore = useAuthStore(pinia)

  setupHttpClient({
    onSessionExpired: (error) => {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        return
      }

      authStore.markSessionExpired()
      clearCsrfToken()

      if (options.queryClient) {
        clearAuthSensitiveQueries(options.queryClient)
      }

      const currentPath = options.router?.currentRoute.value.path ?? ''
      if (options.router && currentPath.startsWith('/account')) {
        void options.router.replace({
          name: 'customer-login',
          query: { redirect: options.router.currentRoute.value.fullPath },
        }).catch(() => undefined)
        return
      }

      if (
        options.router
        && (currentPath.startsWith('/super-admin')
          || currentPath.startsWith('/branch-admin'))
      ) {
        void options.router.replace({
          name: 'admin-login',
          query: { redirect: options.router.currentRoute.value.fullPath },
        }).catch(() => undefined)
      }
    },
  })
}
