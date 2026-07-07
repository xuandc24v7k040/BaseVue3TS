import type { QueryClient } from '@tanstack/vue-query'
import type { AxiosInstance } from 'axios'
import type { Pinia } from 'pinia'
import { apiClient, setupHttpClient } from '@/api/http/client'
import { toBookoraApiError } from '@/api/http/errors'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiError } from '@/types/api.type'

interface SetupApiInterceptorsOptions {
  queryClient?: QueryClient
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
    onSessionExpired: () => {
      authStore.setUnauthenticated()
      options.queryClient?.clear()
    },
  })
}

