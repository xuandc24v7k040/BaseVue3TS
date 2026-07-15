import { computed } from 'vue'
import { resolveAdminRoleLabel } from '@/authorization/admin-identity'
import { useAuthStore } from '@/stores/auth.store'
import { useBranchStore } from '@/stores/branch.store'

export function useAdminIdentity() {
  const authStore = useAuthStore()
  const branchStore = useBranchStore()
  return {
    roleLabel: computed(() => {
      return resolveAdminRoleLabel(authStore.user, branchStore.selectedAssignment)
    }),
  }
}
