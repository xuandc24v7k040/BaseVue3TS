// @vitest-environment happy-dom

import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginForm from '@/pages/auth/components/LoginForm.vue'
import { useAuthStore } from '@/stores/auth.store'
import type { AuthMeResponseDto } from '@/api/generated/models'

const envMock = vi.hoisted(() => ({
  apiBaseUrl: 'http://localhost:8000/api/v1',
  turnstileEnabled: false,
  turnstileSiteKey: '',
}))
const toastError = vi.hoisted(() => vi.fn())
const clearCsrfToken = vi.hoisted(() => vi.fn())

vi.mock('@/lib/env', () => ({ env: envMock }))
vi.mock('vue-sonner', () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
    warning: vi.fn(),
  },
}))
vi.mock('@/api/http/csrf-manager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/http/csrf-manager')>()
  return {
    ...actual,
    clearCsrfToken,
  }
})
vi.mock('@/api/modules/auth.api', () => ({
  fetchCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutCurrentAccount: vi.fn(),
}))

function makeUser(type: AuthMeResponseDto['type']): AuthMeResponseDto {
  return {
    id: '01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T',
    email: 'admin@example.com',
    fullName: 'Bookora Admin',
    type,
    roles: [],
    permissions: [],
    globalRoles: [],
    globalPermissions: [],
    branchAssignments: [],
    maxRoleLevel: 0,
    isSuperAdmin: type === 'SYSTEM',
    branches: [],
    primaryBranchId: null,
  }
}

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/login', name: 'admin-login', component: {} },
      {
        path: '/super-admin/dashboard',
        name: 'super-admin-dashboard',
        component: {},
        meta: { allowedUserTypes: ['SYSTEM'] },
      },
      {
        path: '/branch-admin/dashboard',
        name: 'branch-admin-dashboard',
        component: {},
        meta: { allowedUserTypes: ['BRANCH'] },
      },
      { path: '/access-denied', name: 'access-denied', component: {} },
    ],
  })
  await router.push('/admin/login')
  const queryClient = new QueryClient()
  const wrapper = mount(LoginForm, {
    global: {
      plugins: [
        pinia,
        router,
        [VueQueryPlugin, { queryClient }],
      ],
      stubs: {
        TurnstileWidget: {
          name: 'TurnstileWidget',
          template: '<div />',
          methods: {
            reset() {},
          },
        },
      },
    },
  })
  return { wrapper, router, store: useAuthStore(pinia) }
}

async function fillValidForm(wrapper: Awaited<ReturnType<typeof setup>>['wrapper']) {
  await wrapper.get('#email').setValue('admin@example.com')
  await wrapper.get('#password').setValue('Password1')
}

beforeEach(() => {
  envMock.turnstileEnabled = false
  envMock.turnstileSiteKey = ''
  toastError.mockReset()
  clearCsrfToken.mockReset()
})

describe('real admin login form', () => {
  it('uses generated validation for email and password', async () => {
    const { wrapper, store } = await setup()
    const login = vi.spyOn(store, 'login')

    await wrapper.get('form').trigger('submit')

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Vui lòng nhập email hợp lệ.')
    expect(wrapper.text()).toContain('Mật khẩu cần ít nhất 8 ký tự')
  })

  it('clears stale field errors as the user edits each value', async () => {
    const { wrapper } = await setup()
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Vui lòng nhập email hợp lệ.')
    expect(wrapper.text()).toContain('Mật khẩu cần ít nhất 8 ký tự')

    await wrapper.get('#email').setValue('admin@example.com')
    expect(wrapper.text()).not.toContain('Vui lòng nhập email hợp lệ.')

    await wrapper.get('#password').setValue('Password1')
    expect(wrapper.text()).not.toContain('Mật khẩu cần ít nhất 8 ký tự')
  })

  it.each([
    ['SYSTEM', '/super-admin/dashboard'],
    ['BRANCH', '/branch-admin/dashboard'],
    ['CUSTOMER', '/access-denied'],
  ] as const)('routes %s from the /auth/me principal', async (type, expectedPath) => {
    const { wrapper, router, store } = await setup()
    vi.spyOn(store, 'login').mockResolvedValue(makeUser(type))
    await fillValidForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe(expectedPath)
  })

  it('shows a credential-safe message for 401', async () => {
    const { wrapper, store } = await setup()
    vi.spyOn(store, 'login').mockRejectedValue(
      new AxiosError('Unauthorized', undefined, undefined, undefined, {
        data: { statusCode: 401 },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: {} } as never,
      }),
    )
    await fillValidForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Email hoặc mật khẩu không chính xác.')
    expect(wrapper.html().indexOf('Email hoặc mật khẩu không chính xác.')).toBeLessThan(
      wrapper.html().indexOf('id="email"'),
    )
  })

  it('keeps login visible and reports backend unavailability', async () => {
    const { wrapper, router, store } = await setup()
    vi.spyOn(store, 'login').mockRejectedValue(new AxiosError('Network Error'))
    await fillValidForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin/login')
    expect(wrapper.text()).toContain('Không thể kết nối đến máy chủ.')
    expect(store.status).toBe('unknown')
    expect(wrapper.get('#email').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('#password').attributes('disabled')).toBeUndefined()
  })

  it('prevents a second submit while login is pending', async () => {
    const { wrapper, store } = await setup()
    let resolveLogin!: (user: AuthMeResponseDto) => void
    const login = vi.spyOn(store, 'login').mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )
    await fillValidForm(wrapper)

    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(login).toHaveBeenCalledOnce()

    resolveLogin(makeUser('SYSTEM'))
    await flushPromises()
  })

  it('blocks submission when Turnstile is enabled without a site key', async () => {
    envMock.turnstileEnabled = true
    const { wrapper, store } = await setup()
    const login = vi.spyOn(store, 'login')
    await fillValidForm(wrapper)

    await wrapper.get('form').trigger('submit')

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Thiếu cấu hình VITE_TURNSTILE_SITE_KEY')
  })

  it('clears CSRF and does not reuse Turnstile after CSRF_INVALID', async () => {
    envMock.turnstileEnabled = true
    envMock.turnstileSiteKey = 'site-key'
    const { wrapper, router, store } = await setup()
    const login = vi.spyOn(store, 'login').mockRejectedValue(
      new AxiosError('Forbidden', undefined, undefined, undefined, {
        data: {
          statusCode: 403,
          code: 'CSRF_INVALID',
          message: 'Invalid CSRF',
        },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: {} } as never,
      }),
    )
    await fillValidForm(wrapper)
    wrapper.findComponent({ name: 'TurnstileWidget' }).vm.$emit(
      'verified',
      'turnstile-token',
    )

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(clearCsrfToken).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Phiên bảo mật không hợp lệ')
    expect(router.currentRoute.value.path).toBe('/admin/login')

    await wrapper.get('form').trigger('submit')
    expect(login).toHaveBeenCalledOnce()
  })
})
