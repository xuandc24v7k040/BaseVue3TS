import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useBranchStore } from '@/stores/branch.store'

export function useAdminRouteReevaluation(): void {
  const router = useRouter()
  const authStore = useAuthStore()
  const branchStore = useBranchStore()
  if (!router) return

  watch(
    () => [
      authStore.user?.id ?? '',
      branchStore.selectedBranchId ?? '',
      branchStore.effectivePermissions.join('\u0000'),
    ] as const,
    () => {
      const currentRoute = router.currentRoute.value
      if (!currentRoute.matched.some((record) => record.meta.requiresAuth)) return
      void router.replace({ path: currentRoute.fullPath, force: true })
    },
    { flush: 'post' },
  )
}
