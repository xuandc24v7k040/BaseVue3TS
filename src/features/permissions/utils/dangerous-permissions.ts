// Mirrors the authoritative backend DANGEROUS_PERMISSION_CODES catalog.
export const DANGEROUS_PERMISSION_CODES = new Set([
  'roles.create', 'roles.update', 'roles.delete', 'roles.assign_permission',
  'permissions.create', 'permissions.update', 'permissions.delete',
  'branches.create', 'branches.update', 'branches.delete', 'branches.assign',
  'staff.assign_branch', 'super_admin.assign', 'branch_admin.assign',
])

export function isDangerousPermission(code: string): boolean {
  return DANGEROUS_PERMISSION_CODES.has(code)
}
