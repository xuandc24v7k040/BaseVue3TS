// @vitest-environment happy-dom

import { config, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AuthMeResponseDto } from '@/api/generated/models'
import AppSidebar from '@/components/admin/sidebar/AppSidebar.vue'
import SidebarBrand from '@/components/admin/sidebar/SidebarBrand.vue'
import SidebarNav from '@/components/admin/sidebar/SidebarNav.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarContent, SidebarFooter } from '@/components/ui/sidebar'
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
      roles: [{
        id: `role-${index}`,
        code: index === 0 ? 'INVENTORY' : 'CASHIER',
        level: 20,
        type: 'BRANCH',
        isSystem: true,
      }],
      permissions: index === 0 ? ['products.read', 'inventory.read'] : ['orders.read'],
      maxRoleLevel: 20,
    })),
    maxRoleLevel: 20,
    isSuperAdmin: false,
    branches,
    primaryBranchId: BRANCH_A,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  config.global.renderStubDefaultSlot = true
})

afterEach(() => {
  config.global.renderStubDefaultSlot = false
})

describe('permission-aware admin sidebar', () => {
  it('keeps navigation inside ScrollArea and the user footer outside its viewport', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = shallowMount(AppSidebar, { global: { plugins: [pinia] } })

    const content = wrapper.findComponent(SidebarContent)
    expect(content.findComponent(ScrollArea).exists()).toBe(true)
    expect(content.findComponent(SidebarNav).exists()).toBe(true)
    expect(content.findComponent(SidebarFooter).exists()).toBe(false)
    expect(wrapper.findComponent(SidebarFooter).exists()).toBe(true)
  })

  it('updates menu and selected-assignment label reactively', async () => {
    const user = principal()
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().$patch({ status: 'authenticated', user })
    const branchStore = useBranchStore()
    branchStore.initialize(user)
    const wrapper = shallowMount(AppSidebar, { global: { plugins: [pinia] } })

    expect(wrapper.findComponent(SidebarBrand).props('brand').subtitle).toBe('Nhân viên kho')
    expect(JSON.stringify(wrapper.findComponent(SidebarNav).props('items'))).toContain('inventory-list')
    expect(JSON.stringify(wrapper.findComponent(SidebarNav).props('items'))).not.toContain('product-list')
    expect(JSON.stringify(wrapper.findComponent(SidebarNav).props('items'))).not.toContain('orders')

    await branchStore.setSelectedBranch(BRANCH_B)
    await nextTick()
    expect(wrapper.findComponent(SidebarBrand).props('brand').subtitle).toBe('Thu ngân')
    expect(JSON.stringify(wrapper.findComponent(SidebarNav).props('items'))).toContain('orders')
    expect(JSON.stringify(wrapper.findComponent(SidebarNav).props('items'))).not.toContain('product-list')
  })
})
