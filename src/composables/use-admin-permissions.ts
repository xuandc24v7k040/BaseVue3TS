import { computed } from 'vue'
import { createPermissionPolicy } from '@/authorization/permission-policy'
import type { AdminPermission } from '@/authorization/admin-permissions'
import { useAuthStore } from '@/stores/auth.store'
import { useBranchStore } from '@/stores/branch.store'

export function useAdminPermissions() {
  const authStore = useAuthStore()
  const branchStore = useBranchStore()
  const policy = computed(() => createPermissionPolicy(authStore.user, branchStore))

  return {
    permissions: computed(() => policy.value.permissions),
    can: (permission: AdminPermission) => policy.value.can(permission),
    canAny: (permissions: readonly AdminPermission[]) => policy.value.canAny(permissions),
    canAll: (permissions: readonly AdminPermission[]) => policy.value.canAll(permissions),
  }
}
