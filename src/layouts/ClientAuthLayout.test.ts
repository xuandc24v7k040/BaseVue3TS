// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import CustomerLoginPage from '@/pages/app/auth/CustomerLoginPage.vue'
import CustomerRegisterPage from '@/pages/app/auth/CustomerRegisterPage.vue'
import ClientAuthLayout from './ClientAuthLayout.vue'

vi.mock('@/lib/env', () => ({
  env: { turnstileEnabled: false, turnstileSiteKey: '' },
}))

beforeEach(() => {
  localStorage.clear()
})

describe('ClientAuthLayout', () => {
  it('renders customer login without the client header or footer', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{
        path: '/',
        component: ClientAuthLayout,
        children: [{
          path: 'login',
          name: 'customer-login',
          component: CustomerLoginPage,
        }, {
          path: 'register',
          name: 'customer-register',
          component: CustomerRegisterPage,
        }],
      }],
    })
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(ClientAuthLayout, {
      global: {
        plugins: [createPinia(), router, [VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: {
          TurnstileWidget: { template: '<div data-testid="turnstile" />' },
        },
      },
    })
    await wrapper.vm.$nextTick()

    expect(router.currentRoute.value.name).toBe('customer-login')
    expect(wrapper.text()).toContain('Chào mừng trở lại!')
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('footer').exists()).toBe(false)
    expect(wrapper.classes()).toContain('bookora-client-auth')
    expect(wrapper.get('.bookora-auth-shell').classes()).toContain('max-w-[1080px]')
    expect(wrapper.html()).not.toContain('font-serif')
  })

  it('lets the registration page grow with content instead of using a fixed height', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{
        path: '/',
        component: ClientAuthLayout,
        children: [{
          path: 'register',
          name: 'customer-register',
          component: CustomerRegisterPage,
        }],
      }],
    })
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(ClientAuthLayout, {
      global: {
        plugins: [createPinia(), router, [VueQueryPlugin, { queryClient: new QueryClient() }]],
        stubs: {
          TurnstileWidget: { template: '<div data-testid="turnstile" />' },
        },
      },
    })
    await wrapper.vm.$nextTick()

    const page = wrapper.get('[data-auth-page="register"]')
    expect(page.classes().some((className) => /(^|:)h-\[/.test(className))).toBe(false)
    expect(wrapper.get('.auth-register-panel').classes()).not.toContain('overflow-y-auto')
    expect(wrapper.get('#customer-register-email').classes()).toEqual(expect.arrayContaining(['w-full', 'min-w-0']))
  })
})
