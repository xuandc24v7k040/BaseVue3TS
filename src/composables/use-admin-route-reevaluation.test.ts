// @vitest-environment happy-dom

import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthMeResponseDto } from '@/api/generated/models'
import { useAdminRouteReevaluation } from '@/composables/use-admin-route-reevaluation'
import { useAuthStore } from '@/stores/auth.store'
import { useBranchStore } from '@/stores/branch.store'

const replace = vi.fn().mockResolvedValue(undefined)
const currentRoute = {
  value: {
    fullPath: '/branch-admin/staff',
    matched: [{ meta: { requiresAuth: true } }],
  },
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace, currentRoute }),
}))

const branch = { id: '01K00000000000000000000001', code: 'a', name: 'A', isPrimary: true }
const user = {
  id: '01K0000000000000000000000A',
  email: 'staff@example.com',
  fullName: 'Staff',
  phone: null,
  gender: null,
  birthday: null,
  type: 'BRANCH',
  roles: [],
  permissions: [],
  globalRoles: [],
  globalPermissions: [],
  branchAssignments: [{
    branchId: branch.id,
    userBranchId: 'assignment-a',
    branch,
    isPrimary: true,
    isActive: true,
    roles: [],
    permissions: ['staff.read'],
    maxRoleLevel: 0,
  }],
  maxRoleLevel: 0,
  isSuperAdmin: false,
  branches: [branch],
  primaryBranchId: branch.id,
} satisfies AuthMeResponseDto

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  replace.mockClear()
})

describe('admin route re-evaluation', () => {
  it('forces the current protected route through the existing guard when permissions change', async () => {
    const authStore = useAuthStore()
    authStore.$patch({ status: 'authenticated', user })
    const branchStore = useBranchStore()
    branchStore.initialize(user)
    useAdminRouteReevaluation()

    branchStore.reset()
    await nextTick()
    expect(replace).toHaveBeenCalledWith({ path: '/branch-admin/staff', force: true })
  })
})
