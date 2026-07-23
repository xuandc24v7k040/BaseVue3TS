import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type Router,
} from "vue-router";
import type {
  AuthMeResponseDto,
  AuthMeResponseDtoType,
} from "@/api/generated/models";
import { resolveFirstAllowedAdminRoute } from "@/authorization/admin-menu";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import {
  createPermissionPolicy,
  type AdminBranchAuthorizationContext,
} from "@/authorization/permission-policy";
import AuthLayout from "@/layouts/AuthLayout.vue";
import DashboardLayout from "@/layouts/DashboardLayout.vue";
import LoginPage from "@/pages/auth/LoginPage.vue";
import AccessDeniedPage from "@/pages/errors/AccessDeniedPage.vue";
import AuthUnavailablePage from "@/pages/errors/AuthUnavailablePage.vue";
import NotFoundPage from "@/pages/errors/NotFoundPage.vue";
import { clientRoutes } from "@/router/client.routes";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";

const ULID_ROUTE_PATTERN = "[0-9A-HJKMNP-TV-Z]{26}";

interface AuthGuardStore {
  status: "unknown" | "anonymous" | "authenticated";
  user: AuthMeResponseDto | null;
  bootstrapError: unknown | null;
  isLogoutNavigationPending?: boolean;
  ensureBootstrapped: () => Promise<void>;
}

interface BranchGuardStore extends AdminBranchAuthorizationContext {
  isInitialized: boolean;
  selectedBranchId: string | null;
  effectivePermissions: readonly string[];
  initialize: (principal: AuthMeResponseDto) => void;
}

export function adminLandingRouteForUserType(
  userType: AuthMeResponseDtoType,
): RouteLocationRaw {
  if (userType === "SYSTEM" || userType === "BRANCH")
    return { name: "admin-home" };
  return { name: "access-denied" };
}

export function customerLandingRouteForUserType(
  userType: AuthMeResponseDtoType,
): RouteLocationRaw {
  if (userType === "SYSTEM" || userType === "BRANCH") {
    return adminLandingRouteForUserType(userType);
  }
  return { name: "client-home" };
}

export function safeRedirectForUser(
  routerInstance: Router,
  candidate: unknown,
  userType: AuthMeResponseDtoType,
): RouteLocationRaw | null {
  if (
    typeof candidate !== "string" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//")
  ) {
    return null;
  }

  try {
    const resolved = routerInstance.resolve(candidate);
    const matchedRoute = resolved.matched.at(-1);
    const allowedUserTypes = resolved.matched.flatMap(
      (record) => record.meta.allowedUserTypes ?? [],
    );

    const targetsAdminArea =
      resolved.path.startsWith("/super-admin") ||
      resolved.path.startsWith("/branch-admin");
    const isPublicOrCustomerRoute =
      allowedUserTypes.length === 0 || allowedUserTypes.includes("CUSTOMER");

    if (
      !matchedRoute ||
      matchedRoute.path.includes(":pathMatch") ||
      resolved.meta.guestOnly ||
      (userType === "CUSTOMER" &&
        (targetsAdminArea || !isPublicOrCustomerRoute)) ||
      (userType !== "CUSTOMER" &&
        (allowedUserTypes.length === 0 || !allowedUserTypes.includes(userType)))
    ) {
      return null;
    }

    return { path: resolved.fullPath };
  } catch {
    return null;
  }
}

const ADMIN_REDIRECT_BLOCKED_ROUTE_NAMES = new Set([
  "admin-login",
  "customer-login",
  "customer-register",
  "access-denied",
  "branch-required",
  "auth-unavailable",
]);

export function resolveAdminPostAuthRoute(
  routerInstance: Router,
  candidate: unknown,
  principal: AuthMeResponseDto,
  branchStore: BranchGuardStore,
): RouteLocationRaw {
  if (
    (principal.type === "SYSTEM" || principal.type === "BRANCH") &&
    !branchStore.isInitialized
  ) {
    branchStore.initialize(principal);
  }

  const policy = createPermissionPolicy(principal, branchStore);
  const hasSelectedBranch = branchStore.selectedBranchId !== null;
  const safeLanding = resolveFirstAllowedAdminRoute(
    principal.type,
    policy,
    hasSelectedBranch,
  ) ?? { name: "access-denied" };
  const safeRedirect = safeRedirectForUser(
    routerInstance,
    candidate,
    principal.type,
  );

  if (!safeRedirect || typeof candidate !== "string") return safeLanding;

  const resolved = routerInstance.resolve(candidate);
  if (
    typeof resolved.name === "string" &&
    ADMIN_REDIRECT_BLOCKED_ROUTE_NAMES.has(resolved.name)
  ) {
    return safeLanding;
  }
  if (
    resolved.matched.some((record) => record.meta.requiresSelectedBranch) &&
    !hasSelectedBranch
  ) {
    return safeLanding;
  }

  const requiredPermissions = resolved.meta.requiredPermissions ?? [];
  const isAllowed =
    resolved.meta.permissionMode === "any"
      ? policy.canAny(requiredPermissions)
      : policy.canAll(requiredPermissions);

  return isAllowed ? safeRedirect : safeLanding;
}

function hasMeta(
  to: RouteLocationNormalized,
  key:
    | "requiresAuth"
    | "guestOnly"
    | "skipAuthBootstrap"
    | "requiresSelectedBranch",
): boolean {
  return to.matched.some((record) => record.meta[key]);
}

export async function resolveAuthNavigation(
  to: RouteLocationNormalized,
  authStore: AuthGuardStore,
  routerInstance: Router,
  branchStore?: BranchGuardStore,
): Promise<true | RouteLocationRaw> {
  const isGuestRoute = hasMeta(to, "guestOnly");
  const isCustomerProtectedRoute = to.matched.some((record) =>
    record.meta.allowedUserTypes?.includes("CUSTOMER"),
  );
  const shouldBootstrap =
    hasMeta(to, "requiresAuth") || !hasMeta(to, "skipAuthBootstrap");

  if (shouldBootstrap) {
    await authStore.ensureBootstrapped();
  }

  if (
    authStore.status === "unknown" &&
    authStore.bootstrapError &&
    !isGuestRoute
  ) {
    return {
      name: "auth-unavailable",
      query: { redirect: to.fullPath },
    };
  }

  if (hasMeta(to, "requiresAuth") && authStore.status === "anonymous") {
    if (authStore.isLogoutNavigationPending) {
      return {
        name: isCustomerProtectedRoute ? "customer-login" : "admin-login",
      };
    }

    return {
      name: isCustomerProtectedRoute ? "customer-login" : "admin-login",
      query: { redirect: to.fullPath },
    };
  }

  if (authStore.status === "authenticated" && authStore.user) {
    const allowedUserTypes = to.matched.flatMap(
      (record) => record.meta.allowedUserTypes ?? [],
    );

    if (
      allowedUserTypes.length > 0 &&
      !allowedUserTypes.includes(authStore.user.type)
    ) {
      if (isCustomerProtectedRoute) {
        return customerLandingRouteForUserType(authStore.user.type);
      }

      return {
        name: "access-denied",
        query: { from: to.fullPath },
      };
    }

    if (isGuestRoute) {
      if (to.name === "customer-login" || to.name === "customer-register") {
        return (
          safeRedirectForUser(
            routerInstance,
            to.query.redirect,
            authStore.user.type,
          ) ?? customerLandingRouteForUserType(authStore.user.type)
        );
      }

      return branchStore
        ? resolveAdminPostAuthRoute(
            routerInstance,
            to.query.redirect,
            authStore.user,
            branchStore,
          )
        : adminLandingRouteForUserType(authStore.user.type);
    }

    if (
      branchStore &&
      (authStore.user.type === "SYSTEM" || authStore.user.type === "BRANCH") &&
      !branchStore.isInitialized
    ) {
      branchStore.initialize(authStore.user);
    }

    if (
      hasMeta(to, "requiresSelectedBranch") &&
      (!branchStore?.isInitialized || branchStore.selectedBranchId === null)
    ) {
      return {
        name: "branch-required",
        query: { redirect: to.fullPath },
      };
    }

    const policy = createPermissionPolicy(authStore.user, branchStore ?? null);

    if (to.meta.resolvesAdminHome) {
      return (
        resolveFirstAllowedAdminRoute(
          authStore.user.type,
          policy,
          branchStore?.selectedBranchId !== null &&
            branchStore?.selectedBranchId !== undefined,
        ) ?? {
          name: "access-denied",
          query: { from: to.fullPath },
        }
      );
    }

    const requiredPermissions = to.meta.requiredPermissions ?? [];
    if (requiredPermissions.length > 0) {
      const isAllowed =
        to.meta.permissionMode === "any"
          ? policy.canAny(requiredPermissions)
          : policy.canAll(requiredPermissions);
      if (!isAllowed) {
        return {
          name: "access-denied",
          query: { from: to.fullPath },
        };
      }
    }
  }

  return true;
}

export const routes: RouteRecordRaw[] = [
  ...clientRoutes,
  {
    path: "/admin-home",
    name: "admin-home",
    component: AccessDeniedPage,
    meta: {
      requiresAuth: true,
      allowedUserTypes: ["SYSTEM", "BRANCH"],
      resolvesAdminHome: true,
    },
  },
  {
    path: "/branch-required",
    component: DashboardLayout,
    meta: {
      requiresAuth: true,
      allowedUserTypes: ["SYSTEM", "BRANCH"],
    },
    children: [
      {
        path: "",
        name: "branch-required",
        component: () => import("@/pages/errors/BranchRequiredPage.vue"),
      },
    ],
  },
  {
    path: "/admin",
    component: AuthLayout,
    children: [
      {
        path: "login",
        name: "admin-login",
        component: LoginPage,
        meta: { guestOnly: true, skipAuthBootstrap: true },
      },
    ],
  },
  {
    path: "/super-admin",
    component: DashboardLayout,
    meta: { requiresAuth: true, allowedUserTypes: ["SYSTEM"] },
    redirect: { name: "admin-home" },
    children: [
      {
        path: "dashboard",
        name: "super-admin-dashboard",
        component: () => import("@/pages/super-admin/DashboardPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.DASHBOARD_READ] },
      },
      {
        path: "users",
        name: "super-admin-users",
        component: () => import("@/features/users/pages/UserListPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.USERS_READ] },
      },
      {
        path: "users/:id",
        name: "super-admin-user-detail",
        component: () => import("@/features/users/pages/UserDetailPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.USERS_READ] },
      },
      {
        path: "branches",
        name: "super-admin-branches",
        component: () => import("@/pages/super-admin/BranchesPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.BRANCHES_READ] },
      },
      {
        path: "branches/:id",
        name: "super-admin-branch-detail",
        component: () =>
          import("@/features/branches/pages/BranchDetailPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.BRANCHES_READ] },
      },
      {
        path: "roles",
        name: "super-admin-roles",
        component: () => import("@/features/roles/pages/RoleListPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.ROLES_READ] },
      },
      {
        path: "roles/:id",
        name: "super-admin-role-detail",
        component: () => import("@/features/roles/pages/RoleDetailPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.ROLES_READ] },
      },
      {
        path: "permissions",
        name: "super-admin-permissions",
        component: () =>
          import("@/features/permissions/pages/PermissionListPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.PERMISSIONS_READ] },
      },
      {
        path: "permissions/:id",
        name: "super-admin-permission-detail",
        component: () =>
          import("@/features/permissions/pages/PermissionDetailPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.PERMISSIONS_READ] },
      },
      {
        path: "branch-admins",
        name: "super-admin-branch-admins",
        component: () =>
          import("@/features/branch-admins/pages/BranchAdminListPage.vue"),
        meta: {
          requiredPermissions: [
            ADMIN_PERMISSIONS.USERS_READ,
            ADMIN_PERMISSIONS.BRANCHES_READ,
          ],
        },
      },
      {
        path: "branch-admins/:id",
        name: "super-admin-branch-admin-detail",
        component: () =>
          import("@/features/branch-admins/pages/BranchAdminDetailPage.vue"),
        meta: {
          requiredPermissions: [
            ADMIN_PERMISSIONS.USERS_READ,
            ADMIN_PERMISSIONS.BRANCHES_READ,
          ],
        },
      },
      {
        path: "staff",
        name: "super-admin-staff",
        component: () => import("@/features/staff/pages/StaffListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STAFF_READ],
          requiresSelectedBranch: true,
        },
      },
      {
        path: "staff/:id",
        name: "super-admin-staff-detail",
        component: () => import("@/features/staff/pages/StaffDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STAFF_READ],
          requiresSelectedBranch: true,
        },
      },
      {
        path: "products",
        name: "super-admin-products",
        component: () =>
          import("@/features/products/pages/ProductListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PRODUCTS_READ],
        },
      },
      {
        path: "products/new",
        name: "super-admin-product-new",
        component: () =>
          import("@/features/products/pages/ProductFormPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PRODUCTS_CREATE],
        },
      },
      {
        path: "products/:id",
        name: "super-admin-product-detail",
        component: () =>
          import("@/features/products/pages/ProductDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PRODUCTS_READ],
        },
      },
      {
        path: "products/:id/edit",
        name: "super-admin-product-edit",
        component: () =>
          import("@/features/products/pages/ProductFormPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PRODUCTS_UPDATE],
        },
      },
      {
        path: "categories",
        name: "super-admin-categories",
        component: () =>
          import("@/features/categories/pages/CategoryListPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.CATEGORIES_READ] },
      },
      {
        path: "categories/:id",
        name: "super-admin-category-detail",
        component: () =>
          import("@/features/categories/pages/CategoryDetailPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.CATEGORIES_READ] },
      },
      {
        path: "suppliers",
        name: "super-admin-suppliers",
        component: () =>
          import("@/features/suppliers/pages/SupplierListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.SUPPLIERS_READ],
          requiresSelectedBranch: false,
        },
      },
      {
        path: "suppliers/:id",
        name: "super-admin-supplier-detail",
        component: () =>
          import("@/features/suppliers/pages/SupplierDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.SUPPLIERS_READ],
          requiresSelectedBranch: false,
        },
      },
      {
        path: "publishers",
        name: "super-admin-publishers",
        component: () =>
          import("@/features/publishers/pages/PublisherListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PUBLISHERS_READ],
          requiresSelectedBranch: false,
        },
      },
      {
        path: "publishers/:id",
        name: "super-admin-publisher-detail",
        component: () =>
          import("@/features/publishers/pages/PublisherDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PUBLISHERS_READ],
          requiresSelectedBranch: false,
        },
      },
      {
        path: "authors",
        name: "super-admin-authors",
        component: () => import("@/features/authors/pages/AuthorListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.AUTHORS_READ],
          requiresSelectedBranch: false,
        },
      },
      {
        path: "authors/:id",
        name: "super-admin-author-detail",
        component: () =>
          import("@/features/authors/pages/AuthorDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.AUTHORS_READ],
          requiresSelectedBranch: false,
        },
      },
      {
        path: "product-attributes",
        name: "super-admin-product-attributes",
        component: () =>
          import("@/features/product-attributes/pages/ProductAttributeListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PRODUCT_ATTRIBUTES_READ],
          requiresSelectedBranch: false,
        },
      },
      {
        path: "product-attributes/:id",
        name: "super-admin-product-attribute-detail",
        component: () =>
          import("@/features/product-attributes/pages/ProductAttributeDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PRODUCT_ATTRIBUTES_READ],
          requiresSelectedBranch: false,
        },
      },
      {
        path: "inventory",
        redirect: { name: "super-admin-inventory" },
      },
      {
        path: "inventory/stocks",
        name: "super-admin-inventory",
        component: () =>
          import("@/features/inventory/pages/InventoryStocksPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.INVENTORY_READ],
          requiresSelectedBranch: true,
        },
      },
      {
        path: "inventory/receipts",
        name: "super-admin-stock-receipts",
        component: () =>
          import("@/features/inventory/pages/StockReceiptListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STOCK_RECEIPTS_READ],
          requiresSelectedBranch: true,
        },
      },
      {
        path: "inventory/receipts/create",
        name: "super-admin-stock-receipt-create",
        component: () =>
          import("@/features/inventory/pages/StockReceiptFormPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STOCK_RECEIPTS_CREATE],
          requiresSelectedBranch: true,
        },
      },
      {
        path: "inventory/receipts/:id/edit",
        name: "super-admin-stock-receipt-edit",
        component: () =>
          import("@/features/inventory/pages/StockReceiptFormPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STOCK_RECEIPTS_UPDATE],
          requiresSelectedBranch: true,
        },
      },
      {
        path: "inventory/receipts/:id",
        name: "super-admin-stock-receipt-detail",
        component: () =>
          import("@/features/inventory/pages/StockReceiptDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STOCK_RECEIPTS_READ],
          requiresSelectedBranch: true,
        },
      },
      {
        path: "orders",
        name: "super-admin-orders",
        component: () => import("@/pages/admin/AdminModulePlaceholderPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.ORDERS_READ],
          pageTitle: "Đơn hàng",
          pageDescription:
            "Module đơn hàng chưa có API backend trong contract hiện tại.",
        },
      },
    ],
  },
  {
    path: "/branch-admin",
    component: DashboardLayout,
    meta: {
      requiresAuth: true,
      allowedUserTypes: ["BRANCH"],
      requiresSelectedBranch: true,
    },
    redirect: { name: "admin-home" },
    children: [
      {
        path: "dashboard",
        name: "branch-admin-dashboard",
        component: () => import("@/pages/branch-admin/DashboardPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.DASHBOARD_READ] },
      },
      {
        path: "staff",
        name: "branch-admin-staff",
        component: () => import("@/features/staff/pages/StaffListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STAFF_READ],
        },
      },
      {
        path: "staff/:id",
        name: "branch-admin-staff-detail",
        component: () => import("@/features/staff/pages/StaffDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STAFF_READ],
        },
      },
      {
        path: "products",
        name: "branch-admin-products",
        component: () =>
          import("@/features/products/pages/ProductListPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PRODUCTS_READ],
        },
      },
      {
        path: "products/new",
        name: "branch-admin-product-new-denied",
        redirect: { name: "access-denied" },
      },
      {
        path: `products/:id(${ULID_ROUTE_PATTERN})/edit`,
        name: "branch-admin-product-edit-denied",
        redirect: { name: "access-denied" },
      },
      {
        path: `products/:id(${ULID_ROUTE_PATTERN})`,
        name: "branch-admin-product-detail",
        component: () =>
          import("@/features/products/pages/ProductDetailPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.PRODUCTS_READ],
        },
      },
      {
        path: "orders",
        name: "branch-admin-orders",
        component: () => import("@/pages/branch-admin/OrdersPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.ORDERS_READ] },
      },
      {
        path: "inventory",
        redirect: { name: "branch-admin-inventory" },
      },
      {
        path: "inventory/stocks",
        name: "branch-admin-inventory",
        component: () =>
          import("@/features/inventory/pages/InventoryStocksPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.INVENTORY_READ] },
      },
      {
        path: "inventory/receipts",
        name: "branch-admin-stock-receipts",
        component: () =>
          import("@/features/inventory/pages/StockReceiptListPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.STOCK_RECEIPTS_READ] },
      },
      {
        path: "inventory/receipts/create",
        name: "branch-admin-stock-receipt-create",
        component: () =>
          import("@/features/inventory/pages/StockReceiptFormPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STOCK_RECEIPTS_CREATE],
        },
      },
      {
        path: "inventory/receipts/:id/edit",
        name: "branch-admin-stock-receipt-edit",
        component: () =>
          import("@/features/inventory/pages/StockReceiptFormPage.vue"),
        meta: {
          requiredPermissions: [ADMIN_PERMISSIONS.STOCK_RECEIPTS_UPDATE],
        },
      },
      {
        path: "inventory/receipts/:id",
        name: "branch-admin-stock-receipt-detail",
        component: () =>
          import("@/features/inventory/pages/StockReceiptDetailPage.vue"),
        meta: { requiredPermissions: [ADMIN_PERMISSIONS.STOCK_RECEIPTS_READ] },
      },
    ],
  },
  {
    path: "/access-denied",
    name: "access-denied",
    component: AccessDeniedPage,
    meta: { skipAuthBootstrap: true },
  },
  {
    path: "/auth-unavailable",
    name: "auth-unavailable",
    component: AuthUnavailablePage,
    meta: { skipAuthBootstrap: true },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFoundPage,
    meta: { skipAuthBootstrap: true },
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash };
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  return resolveAuthNavigation(to, useAuthStore(), router, useBranchStore());
});
