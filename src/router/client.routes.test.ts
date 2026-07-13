// @vitest-environment happy-dom

import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/router'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes,
  })
}

describe('client route scaffold', () => {
  it.each([
    ['/', 'client-home'],
    ['/login', 'customer-login'],
    ['/auth/callback', 'customer-auth-callback'],
    ['/account/addresses', 'customer-account-addresses'],
    ['/account/profile', 'customer-account-profile'],
  ])('resolves %s as %s', (path, routeName) => {
    const resolved = makeRouter().resolve(path)

    expect(resolved.name).toBe(routeName)
    expect(resolved.redirectedFrom).toBeUndefined()
    if (path.startsWith('/account')) {
      expect(resolved.meta.requiresAuth).toBe(true)
      expect(resolved.meta.allowedUserTypes).toContain('CUSTOMER')
    } else {
      expect(resolved.meta.skipAuthBootstrap).toBe(true)
    }
  })

  it.each([
    ['/admin/login', 'admin-login'],
    ['/super-admin/dashboard', 'super-admin-dashboard'],
    ['/branch-admin/dashboard', 'branch-admin-dashboard'],
  ])('preserves the existing admin route %s', (path, routeName) => {
    expect(makeRouter().resolve(path).name).toBe(routeName)
  })

  it('keeps the catch-all route active', () => {
    expect(makeRouter().resolve('/route-khong-ton-tai').name).toBe('not-found')
  })

  it('redirects the legacy rewards route to profile', async () => {
    const router = makeRouter()
    await router.push('/account/rewards')
    expect(router.currentRoute.value.name).toBe('customer-account-profile')
  })
})
