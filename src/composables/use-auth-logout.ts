import { useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { clearCsrfToken } from '@/api/http/csrf-manager'
import { clearAuthSensitiveQueries } from '@/api/query-cache'
import { useAuthStore } from '@/stores/auth.store'

export function useAuthLogout() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const isLoggingOut = ref(false)

  async function logout(): Promise<void> {
    if (isLoggingOut.value) return
    isLoggingOut.value = true

    try {
      const result = await authStore.logout()

      if (!result.confirmed) {
        toast.warning(
          'Không xác nhận được đăng xuất từ máy chủ. Vui lòng thử lại nếu cần.',
        )
        return
      }

      clearAuthSensitiveQueries(queryClient)
      clearCsrfToken()
      await router.replace({ name: 'admin-login' })
      toast.success('Đã đăng xuất.')
    } finally {
      isLoggingOut.value = false
    }
  }

  return { isLoggingOut, logout }
}
