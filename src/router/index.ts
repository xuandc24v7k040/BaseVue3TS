import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type Router,
} from 'vue-router'
import type { AuthMeResponseDtoType } from '@/api/generated/models'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import LoginPage from '@/pages/auth/LoginPage.vue'
import AccessDeniedPage from '@/pages/errors/AccessDeniedPage.vue'
import AuthUnavailablePage from '@/pages/errors/AuthUnavailablePage.vue'
import NotFoundPage from '@/pages/errors/NotFoundPage.vue'
import { clientRoutes } from '@/router/client.routes'
import { useAuthStore } from '@/stores/auth.store'

interface AuthGuardStore {
  status: 'unknown' | 'anonymous' | 'authenticated'
  user: { type: AuthMeResponseDtoType } | null
  bootstrapError: unknown | null
  ensureBootstrapped: () => Promise<void>
}

export function dashboardRouteForUserType(
  userType: AuthMeResponseDtoType,
): RouteLocationRaw {
  if (userType === 'SYSTEM') return { name: 'super-admin-dashboard' }
  if (userType === 'BRANCH') return { name: 'branch-admin-dashboard' }
  return { name: 'access-denied' }
}

export function customerLandingRouteForUserType(
  userType: AuthMeResponseDtoType,
): RouteLocationRaw {
  if (userType === 'SYSTEM') return { name: 'super-admin-dashboard' }
  if (userType === 'BRANCH') return { name: 'branch-admin-dashboard' }
  return { name: 'client-home' }
}

export function safeRedirectForUser(
  routerInstance: Router,
  candidate: unknown,
  userType: AuthMeResponseDtoType,
): RouteLocationRaw | null {
  if (
    typeof candidate !== 'string'
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
  ) {
    return null
  }

  try {
    const resolved = routerInstance.resolve(candidate)
    const matchedRoute = resolved.matched.at(-1)
    const allowedUserTypes = resolved.matched.flatMap(
      (record) => record.meta.allowedUserTypes ?? [],
    )

    const targetsAdminArea = resolved.path.startsWith('/super-admin')
      || resolved.path.startsWith('/branch-admin')
    const isPublicOrCustomerRoute = allowedUserTypes.length === 0
      || allowedUserTypes.includes('CUSTOMER')

    if (
      !matchedRoute
      || matchedRoute.path.includes(':pathMatch')
      || resolved.meta.guestOnly
      || (userType === 'CUSTOMER' && (targetsAdminArea || !isPublicOrCustomerRoute))
      || (userType !== 'CUSTOMER'
        && (allowedUserTypes.length === 0 || !allowedUserTypes.includes(userType)))
    ) {
      return null
    }

    return { path: resolved.fullPath }
  } catch {
    return null
  }
}

function hasMeta(
  to: RouteLocationNormalized,
  key: 'requiresAuth' | 'guestOnly' | 'skipAuthBootstrap',
): boolean {
  return to.matched.some((record) => record.meta[key])
}

export async function resolveAuthNavigation(
  to: RouteLocationNormalized,
  authStore: AuthGuardStore,
  routerInstance: Router,
): Promise<true | RouteLocationRaw> {
  const isGuestRoute = hasMeta(to, 'guestOnly')
  const isCustomerProtectedRoute = to.matched.some(
    (record) => record.meta.allowedUserTypes?.includes('CUSTOMER'),
  )
  const shouldBootstrap = !hasMeta(to, 'skipAuthBootstrap')

  if (shouldBootstrap) {
    await authStore.ensureBootstrapped()
  }

  if (
    authStore.status === 'unknown'
    && authStore.bootstrapError
    && !isGuestRoute
  ) {
    return {
      name: 'auth-unavailable',
      query: { redirect: to.fullPath },
    }
  }

  if (hasMeta(to, 'requiresAuth') && authStore.status === 'anonymous') {
    return {
      name: isCustomerProtectedRoute ? 'customer-login' : 'admin-login',
      query: { redirect: to.fullPath },
    }
  }

  if (authStore.status === 'authenticated' && authStore.user) {
    const allowedUserTypes = to.matched.flatMap(
      (record) => record.meta.allowedUserTypes ?? [],
    )

    if (
      allowedUserTypes.length > 0
      && !allowedUserTypes.includes(authStore.user.type)
    ) {
      if (isCustomerProtectedRoute) {
        return customerLandingRouteForUserType(authStore.user.type)
      }

      return {
        name: 'access-denied',
        query: { from: to.fullPath },
      }
    }

    if (isGuestRoute) {
      if (to.name === 'customer-login' || to.name === 'customer-register') {
        return safeRedirectForUser(
          routerInstance,
          to.query.redirect,
          authStore.user.type,
        ) ?? customerLandingRouteForUserType(authStore.user.type)
      }

      return safeRedirectForUser(
        routerInstance,
        to.query.redirect,
        authStore.user.type,
      ) ?? dashboardRouteForUserType(authStore.user.type)
    }
  }

  return true
}

export const routes: RouteRecordRaw[] = [
  ...clientRoutes,
  {
    path: '/admin',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'admin-login',
        component: LoginPage,
        meta: { guestOnly: true, skipAuthBootstrap: true },
      },
    ],
  },
  {
    path: '/super-admin',
    component: DashboardLayout,
    meta: { requiresAuth: true, allowedUserTypes: ['SYSTEM'] },
    redirect: '/super-admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'super-admin-dashboard',
        component: () => import('@/pages/super-admin/DashboardPage.vue'),
      },
      {
        path: 'users',
        name: 'super-admin-users',
        component: () => import('@/pages/super-admin/UsersPage.vue'),
      },
      {
        path: 'branches',
        name: 'super-admin-branches',
        component: () => import('@/pages/super-admin/BranchesPage.vue'),
      },
      {
        path: 'categories',
        name: 'super-admin-categories',
        component: () => import('@/pages/super-admin/CategoriesPage.vue'),
      },
      {
        path: 'products',
        name: 'super-admin-products',
        component: () => import('@/pages/super-admin/ProductsPage.vue'),
      },
      {
        path: 'inventory',
        name: 'super-admin-inventory',
        component: () => import('@/pages/super-admin/InventoryPage.vue'),
      },
      {
        path: 'orders',
        name: 'super-admin-orders',
        component: () => import('@/pages/super-admin/OrdersPage.vue'),
      },
      {
        path: 'coupons',
        name: 'super-admin-coupons',
        component: () => import('@/pages/super-admin/CouponsPage.vue'),
      },
      {
        path: 'reviews',
        name: 'super-admin-reviews',
        component: () => import('@/pages/super-admin/ReviewsPage.vue'),
      },
      {
        path: 'reports',
        name: 'super-admin-reports',
        component: () => import('@/pages/super-admin/ReportsPage.vue'),
      },
      {
        path: 'settings',
        name: 'super-admin-settings',
        component: () => import('@/pages/super-admin/SettingsPage.vue'),
      },
    ],
  },
  {
    path: '/branch-admin',
    component: DashboardLayout,
    meta: { requiresAuth: true, allowedUserTypes: ['BRANCH'] },
    redirect: '/branch-admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'branch-admin-dashboard',
        component: () => import('@/pages/branch-admin/DashboardPage.vue'),
      },
      {
        path: 'orders',
        name: 'branch-admin-orders',
        component: () => import('@/pages/branch-admin/OrdersPage.vue'),
      },
      {
        path: 'inventory',
        name: 'branch-admin-inventory',
        component: () => import('@/pages/branch-admin/InventoryPage.vue'),
      },
      {
        path: 'prices',
        name: 'branch-admin-prices',
        component: () => import('@/pages/branch-admin/PricesPage.vue'),
      },
      {
        path: 'low-stock',
        name: 'branch-admin-low-stock',
        component: () => import('@/pages/branch-admin/LowStockPage.vue'),
      },
      {
        path: 'reviews',
        name: 'branch-admin-reviews',
        component: () => import('@/pages/branch-admin/ReviewsPage.vue'),
      },
      {
        path: 'reports',
        name: 'branch-admin-reports',
        component: () => import('@/pages/branch-admin/ReportsPage.vue'),
      },
    ],
  },
  {
    path: '/access-denied',
    name: 'access-denied',
    component: AccessDeniedPage,
    meta: { skipAuthBootstrap: true },
  },
  {
    path: '/auth-unavailable',
    name: 'auth-unavailable',
    component: AuthUnavailablePage,
    meta: { skipAuthBootstrap: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
    meta: { skipAuthBootstrap: true },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash }
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

router.beforeEach((to) => resolveAuthNavigation(to, useAuthStore(), router))
