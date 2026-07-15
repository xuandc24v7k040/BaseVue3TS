// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AuthMeResponseDto } from '@/api/generated/models'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useBranchStore } from '@/stores/branch.store'

const BRANCH_A = '01K00000000000000000000001'
const BRANCH_B = '01K00000000000000000000002'

function principal(): AuthMeResponseDto {
  const branches = [
    { id: BRANCH_A, code: 'a', name: 'A', isPrimary: true },
    { id: BRANCH_B, code: 'b', name: 'B', isPrimary: false },
  ]
  return {
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
    branchAssignments: branches.map((branch, index) => ({
      branchId: branch.id,
      userBranchId: `assignment-${branch.id}`,
      branch,
      isPrimary: index === 0,
      isActive: true,
      roles: [],
      permissions: index === 0 ? [ADMIN_PERMISSIONS.STAFF_CREATE] : [],
      maxRoleLevel: 0,
    })),
    maxRoleLevel: 0,
    isSuperAdmin: false,
    branches,
    primaryBranchId: BRANCH_A,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('PermissionGate', () => {
  it('renders only when requirements are met and reacts to branch changes', async () => {
    const user = principal()
    useAuthStore().$patch({ status: 'authenticated', user })
    const branchStore = useBranchStore()
    branchStore.initialize(user)
    const wrapper = mount(PermissionGate, {
      props: { allOf: [ADMIN_PERMISSIONS.STAFF_CREATE] },
      slots: { default: '<button>Thêm nhân viên</button>' },
    })

    expect(wrapper.text()).toContain('Thêm nhân viên')
    await branchStore.setSelectedBranch(BRANCH_B)
    await nextTick()
    expect(wrapper.text()).not.toContain('Thêm nhân viên')
  })

  it('fails closed when no requirement is declared', () => {
    const wrapper = mount(PermissionGate, {
      slots: { default: '<button>Không được render</button>' },
    })
    expect(wrapper.text()).toBe('')
  })
})
