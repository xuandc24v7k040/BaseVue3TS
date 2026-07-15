// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SidebarUserMenu from '@/components/admin/sidebar/SidebarUserMenu.vue'
import DropdownMenuContent from '@/components/ui/dropdown-menu/DropdownMenuContent.vue'
import { provideSidebarContext } from '@/components/ui/sidebar/utils'

const logout = vi.hoisted(() => vi.fn())

vi.mock('@/composables/use-auth-logout', async () => {
  const { ref } = await import('vue')
  return {
    useAuthLogout: () => ({ isLoggingOut: ref(false), logout }),
  }
})

const user = {
  name: 'Cashier Hậu Giang',
  email: 'cashier.hg@bookora.local',
  avatar: '',
}

function mountMenu(isMobile: boolean) {
  const Harness = defineComponent({
    setup() {
      const open = ref(true)
      const openMobile = ref(isMobile)
      provideSidebarContext({
        state: computed(() => 'expanded' as const),
        open,
        setOpen: (value) => { open.value = value },
        isMobile: ref(isMobile),
        openMobile,
        setOpenMobile: (value) => { openMobile.value = value },
        toggleSidebar: () => undefined,
      })
      return () => h(SidebarUserMenu, { user })
    },
  })

  return mount(Harness, { attachTo: document.body })
}

beforeEach(() => {
  logout.mockReset()
  document.body.innerHTML = ''
})

describe('admin sidebar account menu', () => {
  it('opens above the mobile drawer footer and keeps the popup above the Sheet', async () => {
    const wrapper = mountMenu(true)
    const content = wrapper.findComponent(DropdownMenuContent)

    expect(content.props('side')).toBe('top')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    const popup = document.body.querySelector('[data-slot="dropdown-menu-content"]')
    expect(popup?.classList.contains('z-[60]')).toBe(true)
    const logoutItem = [...document.body.querySelectorAll('[role="menuitem"]')]
      .find((element) => element.textContent?.includes('Đăng xuất'))
    expect(logoutItem).toBeTruthy()

    logoutItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(logout).toHaveBeenCalledOnce()

    wrapper.unmount()
  })

  it('preserves the desktop right-side account menu placement', () => {
    const wrapper = mountMenu(false)
    expect(wrapper.findComponent(DropdownMenuContent).props('side')).toBe('right')
    wrapper.unmount()
  })
})
