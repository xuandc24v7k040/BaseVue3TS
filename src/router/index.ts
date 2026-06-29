import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import LoginPage from '@/pages/auth/LoginPage.vue'
import NotFoundPage from '@/pages/errors/NotFoundPage.vue'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminRole } from '@/types/auth.type'

function dashboardRouteByRole(role: AdminRole): string {
  return role === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/branch-admin/dashboard'
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/admin/login',
  },
  {
    path: '/admin',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'admin-login',
        component: LoginPage,
        meta: { guestOnly: true },
      },
    ],
  },
  {
    path: '/super-admin',
    component: DashboardLayout,
    meta: { requiresAuth: true, role: 'SUPER_ADMIN' },
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
    meta: { requiresAuth: true, role: 'BRANCH_ADMIN' },
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
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
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

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.path === '/') {
    return authStore.role ? dashboardRouteByRole(authStore.role) : '/admin/login'
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'admin-login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && authStore.role) {
    return dashboardRouteByRole(authStore.role)
  }

  if (to.meta.role && authStore.role && to.meta.role !== authStore.role) {
    return dashboardRouteByRole(authStore.role)
  }

  return true
})
