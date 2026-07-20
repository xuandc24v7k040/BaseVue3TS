import type { Component } from 'vue'
import {
  Boxes,
  Building2,
  ClipboardList,
  Gauge,
  Package,
  Users,
} from '@lucide/vue'
import type { AuthMeResponseDtoType } from '@/api/generated/models'
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from '@/authorization/admin-permissions'
import type { PermissionPolicy } from '@/authorization/permission-policy'

type AdminPrincipalType = Extract<AuthMeResponseDtoType, 'SYSTEM' | 'BRANCH'>

interface AdminMenuRoute {
  SYSTEM?: string
  BRANCH?: string
}

export interface AdminMenuItem {
  id: string
  label: string
  icon?: Component
  routeNames?: AdminMenuRoute
  requiredPermissions?: readonly AdminPermission[]
  permissionMode?: 'all' | 'any'
  requiresSelectedBranch?: boolean
  children?: readonly AdminMenuItem[]
  status?: 'active' | 'placeholder'
}

export interface ResolvedAdminMenuItem {
  id: string
  title: string
  icon: Component
  routeName?: string
  children?: ResolvedAdminMenuChild[]
}

export interface ResolvedAdminMenuChild {
  id: string
  title: string
  routeName: string
}

export const ADMIN_MENU: readonly AdminMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    icon: Gauge,
    routeNames: {
      SYSTEM: 'super-admin-dashboard',
      BRANCH: 'branch-admin-dashboard',
    },
    requiredPermissions: [ADMIN_PERMISSIONS.DASHBOARD_READ],
  },
  {
    id: 'organization',
    label: 'Tổ chức & phân quyền',
    icon: Building2,
    children: [
      {
        id: 'branches',
        label: 'Chi nhánh',
        routeNames: { SYSTEM: 'super-admin-branches' },
        requiredPermissions: [ADMIN_PERMISSIONS.BRANCHES_READ],
      },
      {
        id: 'users',
        label: 'Người dùng hệ thống',
        routeNames: { SYSTEM: 'super-admin-users' },
        requiredPermissions: [ADMIN_PERMISSIONS.USERS_READ],
      },
      {
        id: 'roles',
        label: 'Vai trò',
        routeNames: { SYSTEM: 'super-admin-roles' },
        requiredPermissions: [ADMIN_PERMISSIONS.ROLES_READ],
      },
      {
        id: 'permissions',
        label: 'Quyền',
        routeNames: { SYSTEM: 'super-admin-permissions' },
        requiredPermissions: [ADMIN_PERMISSIONS.PERMISSIONS_READ],
      },
    ],
  },
  {
    id: 'staff-management',
    label: 'Quản lý nhân sự',
    icon: Users,
    children: [
      {
        id: 'branch-admins',
        label: 'Quản trị viên chi nhánh',
        routeNames: { SYSTEM: 'super-admin-branch-admins' },
        requiredPermissions: [
          ADMIN_PERMISSIONS.USERS_READ,
          ADMIN_PERMISSIONS.BRANCHES_READ,
        ],
      },
      {
        id: 'staff',
        label: 'Nhân viên chi nhánh',
        routeNames: {
          SYSTEM: 'super-admin-staff',
          BRANCH: 'branch-admin-staff',
        },
        requiredPermissions: [ADMIN_PERMISSIONS.STAFF_READ],
        requiresSelectedBranch: true,
        status: 'placeholder',
      },
    ],
  },
  {
    id: 'products',
    label: 'Sản phẩm & danh mục',
    icon: Package,
    children: [
      {
        id: 'product-list',
        label: 'Sản phẩm',
        routeNames: {
          SYSTEM: 'super-admin-products',
          BRANCH: 'branch-admin-products',
        },
        requiredPermissions: [ADMIN_PERMISSIONS.PRODUCTS_READ],
        status: 'placeholder',
      },
      {
        id: 'categories',
        label: 'Danh mục',
        routeNames: { SYSTEM: 'super-admin-categories' },
        requiredPermissions: [ADMIN_PERMISSIONS.CATEGORIES_READ],
      },
    ],
  },
  {
    id: 'inventory',
    label: 'Kho & tồn',
    icon: Boxes,
    children: [
      {
        id: 'inventory-list',
        label: 'Tồn kho',
        routeNames: {
          SYSTEM: 'super-admin-inventory',
          BRANCH: 'branch-admin-inventory',
        },
        requiredPermissions: [ADMIN_PERMISSIONS.INVENTORY_READ],
        status: 'placeholder',
      },
      {
        id: 'stock-movements',
        label: 'Lịch sử nhập/xuất kho',
        routeNames: { BRANCH: 'branch-admin-stock-movements' },
        requiredPermissions: [ADMIN_PERMISSIONS.STOCK_MOVEMENTS_READ],
        requiresSelectedBranch: true,
        status: 'placeholder',
      },
    ],
  },
  {
    id: 'sales',
    label: 'Đơn hàng & thanh toán',
    icon: ClipboardList,
    children: [
      {
        id: 'orders',
        label: 'Đơn hàng',
        routeNames: {
          SYSTEM: 'super-admin-orders',
          BRANCH: 'branch-admin-orders',
        },
        requiredPermissions: [ADMIN_PERMISSIONS.ORDERS_READ],
        status: 'placeholder',
      },
    ],
  },
] as const

function isAllowed(item: AdminMenuItem, policy: PermissionPolicy): boolean {
  const required = item.requiredPermissions ?? []
  if (required.length === 0) return true
  return item.permissionMode === 'any'
    ? policy.canAny(required)
    : policy.canAll(required)
}

function routeNameFor(item: AdminMenuItem, type: AdminPrincipalType): string | null {
  return item.routeNames?.[type] ?? null
}

export function resolveVisibleAdminMenu(
  type: AuthMeResponseDtoType | null | undefined,
  policy: PermissionPolicy,
): ResolvedAdminMenuItem[] {
  if (type !== 'SYSTEM' && type !== 'BRANCH') return []

  return ADMIN_MENU.flatMap((item): ResolvedAdminMenuItem[] => {
    if (item.children) {
      const children = item.children.flatMap((child): ResolvedAdminMenuChild[] => {
        const routeName = routeNameFor(child, type)
        return routeName && isAllowed(child, policy)
          ? [{ id: child.id, title: child.label, routeName }]
          : []
      })
      return children.length > 0 && item.icon
        ? [{ id: item.id, title: item.label, icon: item.icon, children }]
        : []
    }

    const routeName = routeNameFor(item, type)
    return routeName && item.icon && isAllowed(item, policy)
      ? [{ id: item.id, title: item.label, icon: item.icon, routeName }]
      : []
  })
}

export function resolveFirstAllowedAdminRoute(
  type: AuthMeResponseDtoType,
  policy: PermissionPolicy,
  hasSelectedBranch: boolean,
): { name: string } | null {
  if (type !== 'SYSTEM' && type !== 'BRANCH') return null

  for (const item of ADMIN_MENU) {
    for (const candidate of item.children ?? [item]) {
      const routeName = routeNameFor(candidate, type)
      if (
        routeName
        && isAllowed(candidate, policy)
        && (!candidate.requiresSelectedBranch || hasSelectedBranch)
      ) {
        return { name: routeName }
      }
    }
  }
  return null
}
