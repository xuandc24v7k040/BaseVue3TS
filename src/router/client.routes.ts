import type { RouteRecordRaw } from 'vue-router'

export const clientRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/ClientLayout.vue'),
    meta: { skipAuthBootstrap: true },
    children: [
      {
        path: '',
        name: 'client-home',
        component: () => import('@/pages/app/home/HomePage.vue'),
      },
      {
        path: 'books',
        name: 'client-book-list',
        component: () => import('@/pages/app/catalog/BookListPage.vue'),
      },
      {
        path: 'books/:slug',
        name: 'client-book-detail',
        component: () => import('@/pages/app/catalog/BookDetailPage.vue'),
      },
      {
        path: 'search',
        name: 'client-search',
        component: () => import('@/pages/app/catalog/SearchResultPage.vue'),
      },
      {
        path: 'cart',
        name: 'client-cart',
        component: () => import('@/pages/app/cart/CartPage.vue'),
      },
      {
        path: 'checkout',
        name: 'client-checkout',
        component: () => import('@/pages/app/checkout/CheckoutPage.vue'),
      },
      {
        path: 'checkout/success',
        name: 'client-checkout-success',
        component: () => import('@/pages/app/checkout/CheckoutSuccessPage.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/ClientAuthLayout.vue'),
    meta: { skipAuthBootstrap: true },
    children: [
      {
        path: 'login',
        name: 'customer-login',
        component: () => import('@/pages/app/auth/CustomerLoginPage.vue'),
        meta: { guestOnly: true, skipAuthBootstrap: true },
      },
      {
        path: 'register',
        name: 'customer-register',
        component: () => import('@/pages/app/auth/CustomerRegisterPage.vue'),
        meta: { guestOnly: true, skipAuthBootstrap: true },
      },
      {
        path: 'auth/callback',
        name: 'customer-auth-callback',
        component: () => import('@/pages/app/auth/CustomerAuthCallbackPage.vue'),
        meta: { skipAuthBootstrap: true },
      },
      {
        path: 'forgot-password',
        name: 'customer-forgot-password',
        component: () => import('@/pages/app/auth/ForgotPasswordPage.vue'),
      },
      {
        path: 'reset-password',
        name: 'customer-reset-password',
        component: () => import('@/pages/app/auth/ResetPasswordPage.vue'),
      },
    ],
  },
  {
    path: '/account',
    component: () => import('@/layouts/CustomerAccountLayout.vue'),
    meta: { requiresAuth: true, allowedUserTypes: ['CUSTOMER'] },
    children: [
      {
        path: '',
        name: 'customer-account-overview',
        component: () => import('@/pages/app/account/AccountOverviewPage.vue'),
      },
      {
        path: 'orders',
        name: 'customer-account-orders',
        component: () => import('@/pages/app/account/AccountOrdersPage.vue'),
      },
      {
        path: 'orders/:orderId',
        name: 'customer-account-order-detail',
        component: () => import('@/pages/app/account/AccountOrderDetailPage.vue'),
      },
      {
        path: 'addresses',
        name: 'customer-account-addresses',
        component: () => import('@/pages/app/account/AccountAddressesPage.vue'),
      },
      {
        path: 'favorites',
        name: 'customer-account-favorites',
        component: () => import('@/pages/app/account/AccountFavoritesPage.vue'),
      },
      {
        path: 'reviews',
        name: 'customer-account-reviews',
        component: () => import('@/pages/app/account/AccountReviewsPage.vue'),
      },
      {
        path: 'profile',
        name: 'customer-account-profile',
        component: () => import('@/pages/app/account/AccountProfilePage.vue'),
      },
      {
        path: 'rewards',
        redirect: { name: 'customer-account-profile' },
      },
      {
        path: 'notifications',
        name: 'customer-account-notifications',
        component: () => import('@/pages/app/account/AccountNotificationsPage.vue'),
      },
      {
        path: 'settings',
        name: 'customer-account-settings',
        component: () => import('@/pages/app/account/AccountSettingsPage.vue'),
      },
    ],
  },
]
