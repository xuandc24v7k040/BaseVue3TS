// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthMeQueryKey } from '@/api/generated/endpoints/auth/auth'
import { useAuthLogout } from '@/composables/use-auth-logout'
import { useAuthStore } from '@/stores/auth.store'

const toastSuccess = vi.hoisted(() => vi.fn())
const toastWarning = vi.hoisted(() => vi.fn())

vi.mock('vue-sonner', () => ({
  toast: {
    error: vi.fn(),
    success: toastSuccess,
    warning: toastWarning,
  },
}))
vi.mock('@/api/modules/auth.api', () => ({
  fetchCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutCurrentAccount: vi.fn(),
}))

const Harness = defineComponent({
  setup() {
    return useAuthLogout()
  },
  template: '<button :disabled="isLoggingOut" @click="logout">Logout</button>',
})

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const queryClient = new QueryClient()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: {} },
      { path: '/private', name: 'private', component: {} },
    ],
  })
  await router.push('/private')
  const wrapper = mount(Harness, {
    global: {
      plugins: [
        pinia,
        router,
        [VueQueryPlugin, { queryClient }],
      ],
    },
  })
  return { wrapper, queryClient, router, store: useAuthStore(pinia) }
}

beforeEach(() => {
  toastSuccess.mockReset()
  toastWarning.mockReset()
})

describe('shared logout flow', () => {
  it('clears auth cache and redirects only after confirmed logout', async () => {
    const context = await setup()
    vi.spyOn(context.store, 'logout').mockResolvedValue({ confirmed: true })
    context.queryClient.setQueryData(getAuthMeQueryKey(), { private: true })
    context.queryClient.setQueryData(['public', 'catalog'], { public: true })

    await context.wrapper.get('button').trigger('click')
    await flushPromises()

    expect(context.queryClient.getQueryData(getAuthMeQueryKey())).toBeUndefined()
    expect(context.queryClient.getQueryData(['public', 'catalog'])).toEqual({
      public: true,
    })
    expect(context.router.currentRoute.value.path).toBe('/admin/login')
    expect(context.router.currentRoute.value.fullPath).toBe('/admin/login')
    expect(toastSuccess).toHaveBeenCalledOnce()
  })

  it('keeps the current route when server logout is unconfirmed', async () => {
    const context = await setup()
    vi.spyOn(context.store, 'logout').mockResolvedValue({
      confirmed: false,
      error: new Error('offline'),
    })

    await context.wrapper.get('button').trigger('click')
    await flushPromises()

    expect(context.router.currentRoute.value.path).toBe('/private')
    expect(toastWarning).toHaveBeenCalledOnce()
  })

  it('prevents duplicate logout requests', async () => {
    const context = await setup()
    let resolveLogout!: () => void
    const logout = vi.spyOn(context.store, 'logout').mockReturnValue(
      new Promise((resolve) => {
        resolveLogout = () => resolve({ confirmed: true })
      }),
    )

    await context.wrapper.get('button').trigger('click')
    await context.wrapper.get('button').trigger('click')
    expect(logout).toHaveBeenCalledOnce()

    resolveLogout()
    await flushPromises()
  })
})
