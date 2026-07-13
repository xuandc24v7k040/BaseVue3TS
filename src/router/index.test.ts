// @vitest-environment happy-dom

import {
  createMemoryHistory,
  createRouter,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import {
  resolveAuthNavigation,
  safeRedirectForUser,
} from '@/router'

const testRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'client-home',
    component: {},
    meta: { skipAuthBootstrap: true },
  },
  {
    path: '/login',
    name: 'customer-login',
    component: {},
    meta: { guestOnly: true, skipAuthBootstrap: true },
  },
  {
    path: '/account/profile',
    name: 'customer-account-profile',
    component: {},
    meta: { requiresAuth: true, allowedUserTypes: ['CUSTOMER'] },
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: {},
    meta: { guestOnly: true, skipAuthBootstrap: true },
  },
  {
    path: '/super-admin/dashboard',
    name: 'super-admin-dashboard',
    component: {},
    meta: { requiresAuth: true, allowedUserTypes: ['SYSTEM'] },
  },
  {
    path: '/branch-admin/dashboard',
    name: 'branch-admin-dashboard',
    component: {},
    meta: { requiresAuth: true, allowedUserTypes: ['BRANCH'] },
  },
  {
    path: '/access-denied',
    name: 'access-denied',
    component: {},
    meta: { skipAuthBootstrap: true },
  },
  {
    path: '/auth-unavailable',
    name: 'auth-unavailable',
    component: {},
    meta: { skipAuthBootstrap: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: {},
    meta: { skipAuthBootstrap: true },
  },
]

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: testRoutes,
  })
}

function makeStore(
  status: 'unknown' | 'anonymous' | 'authenticated',
  type?: 'SYSTEM' | 'BRANCH' | 'CUSTOMER',
  bootstrapError: unknown | null = null,
) {
  return {
    status,
    user: type ? { type } : null,
    bootstrapError,
    ensureBootstrapped: vi.fn().mockResolvedValue(undefined),
  }
}

async function guard(
  path: string,
  store: ReturnType<typeof makeStore>,
) {
  const router = makeRouter()
  const to = router.resolve(path) as RouteLocationNormalized
  return resolveAuthNavigation(to, store, router)
}

describe('auth router policy', () => {
  it('renders unknown routes without waiting for auth bootstrap', async () => {
    const store = makeStore('unknown')
    await expect(guard('/route-khong-ton-tai', store)).resolves.toBe(true)
    expect(store.ensureBootstrapped).not.toHaveBeenCalled()
  })
  it.each([
    ['/super-admin/dashboard'],
    ['/branch-admin/dashboard'],
  ])('redirects anonymous access to login from %s', async (path) => {
    await expect(guard(path, makeStore('anonymous'))).resolves.toMatchObject({
      name: 'admin-login',
      query: { redirect: path },
    })
  })

  it('never uses the session hint to authorize a protected route', async () => {
    localStorage.setItem('bookora.session_hint', '1')

    await expect(
      guard('/super-admin/dashboard', makeStore('anonymous')),
    ).resolves.toMatchObject({ name: 'admin-login' })

    localStorage.removeItem('bookora.session_hint')
  })

  it('redirects anonymous customer account access to customer login', async () => {
    await expect(guard('/account/profile', makeStore('anonymous'))).resolves.toMatchObject({
      name: 'customer-login',
      query: { redirect: '/account/profile' },
    })
  })

  it('allows a CUSTOMER into Member Center', async () => {
    await expect(guard('/account/profile', makeStore('authenticated', 'CUSTOMER'))).resolves.toBe(true)
  })

  it.each([
    ['SYSTEM', 'super-admin-dashboard'],
    ['BRANCH', 'branch-admin-dashboard'],
  ] as const)('redirects %s away from Member Center', async (type, name) => {
    await expect(guard('/account/profile', makeStore('authenticated', type))).resolves.toMatchObject({ name })
  })

  it.each([
    ['CUSTOMER', 'client-home'],
    ['SYSTEM', 'super-admin-dashboard'],
    ['BRANCH', 'branch-admin-dashboard'],
  ] as const)('redirects authenticated %s away from customer login', async (type, name) => {
    await expect(guard('/login', makeStore('authenticated', type))).resolves.toMatchObject({ name })
  })

  it.each([
    ['SYSTEM', '/super-admin/dashboard'],
    ['BRANCH', '/branch-admin/dashboard'],
  ] as const)('allows %s into its admin area', async (type, path) => {
    await expect(guard(path, makeStore('authenticated', type))).resolves.toBe(true)
  })

  it.each([
    ['SYSTEM', '/branch-admin/dashboard'],
    ['BRANCH', '/super-admin/dashboard'],
    ['CUSTOMER', '/super-admin/dashboard'],
    ['CUSTOMER', '/branch-admin/dashboard'],
  ] as const)('denies %s from %s', async (type, path) => {
    await expect(guard(path, makeStore('authenticated', type))).resolves.toMatchObject({
      name: 'access-denied',
    })
  })

  it.each([
    ['SYSTEM', 'super-admin-dashboard'],
    ['BRANCH', 'branch-admin-dashboard'],
    ['CUSTOMER', 'access-denied'],
  ] as const)('redirects authenticated %s away from login', async (type, name) => {
    await expect(guard('/admin/login', makeStore('authenticated', type))).resolves.toMatchObject({
      name,
    })
  })

  it('uses AuthUnavailable for an inconclusive protected bootstrap', async () => {
    await expect(
      guard('/super-admin/dashboard', makeStore('unknown', undefined, new Error('offline'))),
    ).resolves.toMatchObject({ name: 'auth-unavailable' })
  })

  it('keeps the login route available when bootstrap is inconclusive', async () => {
    await expect(
      guard('/admin/login', makeStore('unknown', undefined, new Error('offline'))),
    ).resolves.toBe(true)
  })

  it('renders login without waiting for auth bootstrap', async () => {
    const store = makeStore('unknown')

    await expect(guard('/admin/login', store)).resolves.toBe(true)
    expect(store.ensureBootstrapped).not.toHaveBeenCalled()
  })
})

describe('safe auth redirects', () => {
  it.each([
    'https://evil.example',
    '//evil.example',
    'javascript:alert(1)',
    '/missing',
  ])('rejects unsafe or unresolved redirect %s', (candidate) => {
    expect(safeRedirectForUser(makeRouter(), candidate, 'SYSTEM')).toBeNull()
  })

  it('rejects routes that do not allow the principal type', () => {
    expect(
      safeRedirectForUser(makeRouter(), '/branch-admin/dashboard', 'SYSTEM'),
    ).toBeNull()
  })

  it('accepts a matching internal admin route', () => {
    expect(
      safeRedirectForUser(makeRouter(), '/super-admin/dashboard', 'SYSTEM'),
    ).toEqual({ path: '/super-admin/dashboard' })
  })

  it('accepts a public or customer route only for CUSTOMER principals', () => {
    expect(safeRedirectForUser(makeRouter(), '/', 'CUSTOMER')).toEqual({ path: '/' })
    expect(safeRedirectForUser(makeRouter(), '/account/profile', 'CUSTOMER')).toEqual({ path: '/account/profile' })
    expect(safeRedirectForUser(makeRouter(), '/super-admin/dashboard', 'CUSTOMER')).toBeNull()
  })
})
