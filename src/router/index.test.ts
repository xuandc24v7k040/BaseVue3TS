// @vitest-environment happy-dom

import {
  createMemoryHistory,
  createRouter,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import type { AuthMeResponseDto } from '@/api/generated/models'
import {
  resolveAdminPostAuthRoute,
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
    meta: {
      requiresAuth: true,
      allowedUserTypes: ['SYSTEM'],
      requiredPermissions: ['dashboard.read'],
    },
  },
  {
    path: '/branch-admin/dashboard',
    name: 'branch-admin-dashboard',
    component: {},
    meta: {
      requiresAuth: true,
      allowedUserTypes: ['BRANCH'],
      requiresSelectedBranch: true,
      requiredPermissions: ['dashboard.read'],
    },
  },
  {
    path: '/branch-admin/orders',
    name: 'branch-admin-orders',
    component: {},
    meta: {
      requiresAuth: true,
      allowedUserTypes: ['BRANCH'],
      requiresSelectedBranch: true,
      requiredPermissions: ['orders.read'],
    },
  },
  {
    path: '/branch-resource',
    name: 'branch-resource',
    component: {},
    meta: {
      requiresAuth: true,
      allowedUserTypes: ['SYSTEM', 'BRANCH'],
      requiresSelectedBranch: true,
    },
  },
  {
    path: '/staff',
    name: 'staff',
    component: {},
    meta: {
      requiresAuth: true,
      allowedUserTypes: ['SYSTEM', 'BRANCH'],
      requiresSelectedBranch: true,
      requiredPermissions: ['staff.read'],
    },
  },
  {
    path: '/permission-any',
    name: 'permission-any',
    component: {},
    meta: {
      requiresAuth: true,
      allowedUserTypes: ['BRANCH'],
      requiredPermissions: ['staff.read', 'orders.read'],
      permissionMode: 'any',
    },
  },
  {
    path: '/admin-home',
    name: 'admin-home',
    component: {},
    meta: {
      requiresAuth: true,
      allowedUserTypes: ['SYSTEM', 'BRANCH'],
      resolvesAdminHome: true,
    },
  },
  {
    path: '/branch-required',
    name: 'branch-required',
    component: {},
    meta: { requiresAuth: true, allowedUserTypes: ['SYSTEM', 'BRANCH'] },
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
  const user: AuthMeResponseDto | null = type
    ? {
        id: '01K0000000000000000000000A',
        email: 'user@example.com',
        fullName: 'User',
        phone: null,
        gender: null,
        birthday: null,
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
    : null

  return {
    status,
    user,
    bootstrapError,
    isLogoutNavigationPending: false,
    ensureBootstrapped: vi.fn().mockResolvedValue(undefined),
  }
}

async function guard(
  path: string,
  store: ReturnType<typeof makeStore>,
  branchStore = {
    isInitialized: true,
    selectedBranchId: store.user?.type === 'BRANCH'
      ? '01K00000000000000000000001'
      : null,
    effectivePermissions: store.user?.type === 'BRANCH' ? ['dashboard.read'] : [],
    initialize: vi.fn(),
  },
) {
  const router = makeRouter()
  const to = router.resolve(path) as RouteLocationNormalized
  return resolveAuthNavigation(to, store, router, branchStore)
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
    ['SYSTEM', 'admin-home'],
    ['BRANCH', 'admin-home'],
  ] as const)('redirects %s away from Member Center', async (type, name) => {
    await expect(guard('/account/profile', makeStore('authenticated', type))).resolves.toMatchObject({ name })
  })

  it.each([
    ['CUSTOMER', 'client-home'],
    ['SYSTEM', 'admin-home'],
    ['BRANCH', 'admin-home'],
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

  it('uses a clean login URL while confirmed logout navigation is pending', async () => {
    const store = makeStore('anonymous')
    store.isLogoutNavigationPending = true

    await expect(guard('/branch-admin/dashboard', store)).resolves.toEqual({
      name: 'admin-login',
    })
  })

  it('allows a route without branch requirements in system scope', async () => {
    await expect(guard('/super-admin/dashboard', makeStore('authenticated', 'SYSTEM'))).resolves.toBe(true)
  })

  it('allows a branch-required route after a branch is selected', async () => {
    const store = makeStore('authenticated', 'SYSTEM')
    await expect(guard('/branch-resource', store, {
      isInitialized: true,
      selectedBranchId: '01K00000000000000000000001',
      effectivePermissions: [],
      initialize: vi.fn(),
    })).resolves.toBe(true)
  })

  it('blocks a SYSTEM user in system scope before a branch-required page renders', async () => {
    await expect(guard('/branch-resource', makeStore('authenticated', 'SYSTEM'))).resolves.toMatchObject({
      name: 'branch-required',
      query: { redirect: '/branch-resource' },
    })
  })

  it('shows branch-required state for an unassigned BRANCH user without logging out', async () => {
    const store = makeStore('authenticated', 'BRANCH')
    await expect(guard('/branch-admin/dashboard', store, {
      isInitialized: true,
      selectedBranchId: null,
      effectivePermissions: [],
      initialize: vi.fn(),
    })).resolves.toMatchObject({ name: 'branch-required' })
    expect(store.status).toBe('authenticated')
  })

  it('initializes branch context after auth bootstrap and before branch validation', async () => {
    const store = makeStore('authenticated', 'BRANCH')
    const branchStore = {
      isInitialized: false,
      selectedBranchId: '01K00000000000000000000001',
      effectivePermissions: ['dashboard.read'],
      initialize: vi.fn(),
    }
    branchStore.initialize.mockImplementation(() => {
      branchStore.isInitialized = true
    })

    await expect(guard('/branch-admin/dashboard', store, branchStore)).resolves.toBe(true)
    expect(store.ensureBootstrapped).toHaveBeenCalledOnce()
    expect(branchStore.initialize).toHaveBeenCalledWith(store.user)
  })

  it('does not redirect-loop on the branch-required state route', async () => {
    await expect(guard('/branch-required', makeStore('authenticated', 'SYSTEM'))).resolves.toBe(true)
  })

  it('allows a direct URL with the required selected-branch permission', async () => {
    const store = makeStore('authenticated', 'BRANCH')
    await expect(guard('/staff', store, {
      isInitialized: true,
      selectedBranchId: '01K00000000000000000000001',
      effectivePermissions: ['staff.read'],
      initialize: vi.fn(),
    })).resolves.toBe(true)
  })

  it('denies a direct URL without logging out when permission is missing', async () => {
    const store = makeStore('authenticated', 'BRANCH')
    await expect(guard('/staff', store, {
      isInitialized: true,
      selectedBranchId: '01K00000000000000000000001',
      effectivePermissions: ['orders.read'],
      initialize: vi.fn(),
    })).resolves.toMatchObject({ name: 'access-denied' })
    expect(store.status).toBe('authenticated')
  })

  it('supports any-mode route permission semantics', async () => {
    const store = makeStore('authenticated', 'BRANCH')
    await expect(guard('/permission-any', store, {
      isInitialized: true,
      selectedBranchId: '01K00000000000000000000001',
      effectivePermissions: ['orders.read'],
      initialize: vi.fn(),
    })).resolves.toBe(true)
  })

  it('resolves admin home from the shared manifest instead of assuming dashboard', async () => {
    const store = makeStore('authenticated', 'BRANCH')
    await expect(guard('/admin-home', store, {
      isInitialized: true,
      selectedBranchId: '01K00000000000000000000001',
      effectivePermissions: ['orders.read'],
      initialize: vi.fn(),
    })).resolves.toEqual({ name: 'branch-admin-orders' })
  })

  it('keeps a SYSTEM principal on global permissions when a branch is selected', async () => {
    const store = makeStore('authenticated', 'SYSTEM')
    store.user!.isSuperAdmin = false
    store.user!.globalPermissions = ['staff.read']
    await expect(guard('/staff', store, {
      isInitialized: true,
      selectedBranchId: '01K00000000000000000000001',
      effectivePermissions: ['orders.read'],
      initialize: vi.fn(),
    })).resolves.toBe(true)
  })

  it('sends a principal with no authorized module to AccessDenied', async () => {
    const store = makeStore('authenticated', 'BRANCH')
    await expect(guard('/admin-home', store, {
      isInitialized: true,
      selectedBranchId: '01K00000000000000000000001',
      effectivePermissions: [],
      initialize: vi.fn(),
    })).resolves.toMatchObject({ name: 'access-denied' })
  })
})

describe('safe auth redirects', () => {
  it.each([
    'https://evil.example',
    '//evil.example',
    'javascript:alert(1)',
    'data:text/html,test',
    '\\\\evil.example',
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

  it('falls back to the permission-based landing when an admin redirect is unauthorized', () => {
    const store = makeStore('authenticated', 'BRANCH')
    expect(resolveAdminPostAuthRoute(
      makeRouter(),
      '/branch-admin/dashboard',
      store.user!,
      {
        isInitialized: true,
        selectedBranchId: '01K00000000000000000000001',
        effectivePermissions: ['orders.read'],
        initialize: vi.fn(),
      },
    )).toEqual({ name: 'branch-admin-orders' })
  })

  it('keeps an authorized admin redirect', () => {
    const store = makeStore('authenticated', 'BRANCH')
    expect(resolveAdminPostAuthRoute(
      makeRouter(),
      '/branch-admin/dashboard',
      store.user!,
      {
        isInitialized: true,
        selectedBranchId: '01K00000000000000000000001',
        effectivePermissions: ['dashboard.read'],
        initialize: vi.fn(),
      },
    )).toEqual({ path: '/branch-admin/dashboard' })
  })

  it('rejects a redirect from another admin namespace', () => {
    const store = makeStore('authenticated', 'BRANCH')
    expect(resolveAdminPostAuthRoute(
      makeRouter(),
      '/super-admin/dashboard',
      store.user!,
      {
        isInitialized: true,
        selectedBranchId: '01K00000000000000000000001',
        effectivePermissions: ['orders.read'],
        initialize: vi.fn(),
      },
    )).toEqual({ name: 'branch-admin-orders' })
  })
})
