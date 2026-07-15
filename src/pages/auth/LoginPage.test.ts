// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { AuthMeResponseDto } from '@/api/generated/models'
import LoginPage from '@/pages/auth/LoginPage.vue'
import { useAuthStore } from '@/stores/auth.store'

vi.mock('@/api/modules/auth.api', () => ({
  fetchCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutCurrentAccount: vi.fn(),
}))

const branch = {
  id: '01K00000000000000000000001',
  code: 'can-tho',
  name: 'Cần Thơ',
  isPrimary: true,
}

function makeUser(type: AuthMeResponseDto['type']): AuthMeResponseDto {
  return {
    id: '01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T',
    email: 'admin@example.com',
    fullName: 'Bookora Admin',
    phone: null,
    gender: null,
    birthday: null,
    type,
    roles: [],
    permissions: [],
    globalRoles: [],
    globalPermissions: type === 'SYSTEM' ? ['dashboard.read'] : [],
    branchAssignments: type === 'BRANCH'
      ? [{
          branchId: branch.id,
          userBranchId: 'assignment-a',
          branch,
          isPrimary: true,
          isActive: true,
          roles: [],
          permissions: ['dashboard.read'],
          maxRoleLevel: 0,
        }]
      : [],
    maxRoleLevel: 0,
    isSuperAdmin: type === 'SYSTEM',
    branches: type === 'BRANCH' ? [branch] : [],
    primaryBranchId: type === 'BRANCH' ? branch.id : null,
  }
}

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: {} },
      { path: '/admin-home', name: 'admin-home', component: {} },
      {
        path: '/super-admin/dashboard',
        name: 'super-admin-dashboard',
        component: {},
      },
      {
        path: '/branch-admin/dashboard',
        name: 'branch-admin-dashboard',
        component: {},
      },
      { path: '/access-denied', name: 'access-denied', component: {} },
    ],
  })
  await router.push('/admin/login')
  const store = useAuthStore(pinia)

  return { pinia, router, store }
}

function mountPage(context: Awaited<ReturnType<typeof setup>>) {
  return mount(LoginPage, {
    global: {
      plugins: [context.pinia, context.router],
      stubs: {
        LoginForm: {
          template: '<div data-testid="login-form">Login form</div>',
        },
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('login page best-effort session check', () => {
  it('renders the form immediately and skips /auth/me without a session hint', async () => {
    const context = await setup()
    const refreshCurrentUser = vi.spyOn(context.store, 'refreshCurrentUser')

    const wrapper = mountPage(context)
    await flushPromises()

    expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(true)
    expect(refreshCurrentUser).not.toHaveBeenCalled()
  })

  it.each([
    ['SYSTEM', '/super-admin/dashboard'],
    ['BRANCH', '/branch-admin/dashboard'],
    ['CUSTOMER', '/access-denied'],
  ] as const)('redirects an existing authenticated %s session', async (type, path) => {
    const context = await setup()
    context.store.status = 'authenticated'
    context.store.user = makeUser(type)
    const refreshCurrentUser = vi.spyOn(context.store, 'refreshCurrentUser')

    mountPage(context)
    await flushPromises()

    expect(context.router.currentRoute.value.path).toBe(path)
    expect(refreshCurrentUser).not.toHaveBeenCalled()
  })

  it('shows a lightweight loading state, then redirects when silent /auth/me succeeds', async () => {
    const context = await setup()
    localStorage.setItem('bookora.session_hint', '1')
    let resolveCheck!: () => void
    vi.spyOn(context.store, 'refreshCurrentUser').mockImplementation(
      () => new Promise((resolve) => {
        resolveCheck = () => {
          context.store.status = 'authenticated'
          context.store.user = makeUser('SYSTEM')
          resolve(makeUser('SYSTEM'))
        }
      }),
    )

    const wrapper = mountPage(context)
    expect(wrapper.text()).toContain('Đang kiểm tra phiên đăng nhập...')
    expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(false)
    expect(context.router.currentRoute.value.path).toBe('/admin/login')

    resolveCheck()
    await flushPromises()
    expect(context.router.currentRoute.value.path).toBe('/super-admin/dashboard')
  })

  it('stays on login after a final 401 result', async () => {
    const context = await setup()
    localStorage.setItem('bookora.session_hint', '1')
    vi.spyOn(context.store, 'refreshCurrentUser').mockRejectedValue(
      new AxiosError('Unauthorized', undefined, undefined, undefined, {
        data: { statusCode: 401 },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: {} } as never,
      }),
    )

    const wrapper = mountPage(context)
    await flushPromises()

    expect(context.router.currentRoute.value.path).toBe('/admin/login')
    expect(localStorage.getItem('bookora.session_hint')).toBeNull()
    expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(true)
  })

  it('stays on login when the backend is unavailable', async () => {
    const context = await setup()
    localStorage.setItem('bookora.session_hint', '1')
    vi.spyOn(context.store, 'refreshCurrentUser').mockRejectedValue(
      new AxiosError('Network Error'),
    )

    const wrapper = mountPage(context)
    await flushPromises()

    expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(true)
    expect(context.router.currentRoute.value.path).toBe('/admin/login')
    expect(localStorage.getItem('bookora.session_hint')).toBe('1')
  })

  it('runs the background check only once per mounted login page', async () => {
    const context = await setup()
    localStorage.setItem('bookora.session_hint', '1')
    const refreshCurrentUser = vi
      .spyOn(context.store, 'refreshCurrentUser')
      .mockRejectedValue(new Error('unauthorized'))

    const wrapper = mountPage(context)
    await flushPromises()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(refreshCurrentUser).toHaveBeenCalledOnce()
    expect(refreshCurrentUser).toHaveBeenCalledWith({ skipAuthRefresh: true })
  })
})
