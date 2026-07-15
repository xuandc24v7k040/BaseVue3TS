export const ADMIN_PERMISSIONS = {
  DASHBOARD_READ: 'dashboard.read',
  USERS_READ: 'users.read',
  STAFF_READ: 'staff.read',
  STAFF_CREATE: 'staff.create',
  BRANCHES_READ: 'branches.read',
  BRANCHES_CREATE: 'branches.create',
  BRANCHES_UPDATE: 'branches.update',
  BRANCHES_DELETE: 'branches.delete',
  ROLES_READ: 'roles.read',
  PERMISSIONS_READ: 'permissions.read',
  PRODUCTS_READ: 'products.read',
  INVENTORY_READ: 'inventory.read',
  STOCK_MOVEMENTS_READ: 'stock_movements.read',
  ORDERS_READ: 'orders.read',
  PAYMENTS_CREATE: 'payments.create',
} as const

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS]
