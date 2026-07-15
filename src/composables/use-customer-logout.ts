import { ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { clearCsrfToken } from '@/api/http/csrf-manager'
import { clearAuthSensitiveQueries } from '@/api/query-cache'
import { useAuthStore } from '@/stores/auth.store'

export function useCustomerLogout() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const isLoggingOut = ref(false)

  async function logoutCustomer(): Promise<void> {
    if (isLoggingOut.value) return
    isLoggingOut.value = true
    let didConfirmLogout = false

    try {
      const result = await authStore.logout()
      if (!result.confirmed) {
        toast.warning('Không xác nhận được đăng xuất từ máy chủ. Vui lòng thử lại.')
        return
      }
      didConfirmLogout = true

      clearAuthSensitiveQueries(queryClient)
      clearCsrfToken()
      await router.replace({ name: 'client-home' })
      toast.success('Đã đăng xuất.')
    } finally {
      if (didConfirmLogout) authStore.completeLogoutNavigation()
      isLoggingOut.value = false
    }
  }

  return { isLoggingOut, logoutCustomer }
}
