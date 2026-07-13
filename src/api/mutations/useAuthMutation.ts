import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { clearCsrfToken } from '@/api/http/csrf-manager'
import { clearAuthSensitiveQueries, syncAuthMeQuery } from '@/api/query-cache'
import { dashboardRouteForUserType, safeRedirectForUser } from '@/router'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginRequest } from '@/types/auth.type'

export function useLoginMutation() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const route = useRoute()
  const router = useRouter()

  return useMutation({
    mutationFn: (payload: LoginRequest) => authStore.login(payload),
    onSuccess: async (user) => {
      syncAuthMeQuery(queryClient, user)
      await router.replace(
        safeRedirectForUser(router, route.query.redirect, user.type)
          ?? dashboardRouteForUserType(user.type),
      )
    },
  })
}

export function useLogoutMutation() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => authStore.logout(),
    onSuccess: async (result) => {
      if (!result.confirmed) return
      clearAuthSensitiveQueries(queryClient)
      clearCsrfToken()
      await router.replace({ name: 'admin-login' })
    },
  })
}
