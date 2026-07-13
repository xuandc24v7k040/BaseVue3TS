import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hasSessionHint } from '@/features/auth/session-hint'
import { customerLandingRouteForUserType, safeRedirectForUser } from '@/router'
import { useAuthStore } from '@/stores/auth.store'

export function useCustomerAuthPage() {
  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const isCheckingSession = ref(hasSessionHint())

  onMounted(async () => {
    if (!isCheckingSession.value) return

    await authStore.bootstrap({ skipAuthRefresh: true })

    if (authStore.status === 'authenticated' && authStore.user) {
      await router.replace(
        safeRedirectForUser(router, route.query.redirect, authStore.user.type)
          ?? customerLandingRouteForUserType(authStore.user.type),
      )
      return
    }

    isCheckingSession.value = false
  })

  return { isCheckingSession }
}
