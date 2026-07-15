import type { AuthMeResponseDto } from '@/api/generated/models'
import type { AdminPermission } from '@/authorization/admin-permissions'

export interface AdminBranchAuthorizationContext {
  isInitialized: boolean
  effectivePermissions: unknown
}

export interface PermissionPolicy {
  permissions: ReadonlySet<string>
  can: (permission: AdminPermission) => boolean
  canAny: (permissions: readonly AdminPermission[]) => boolean
  canAll: (permissions: readonly AdminPermission[]) => boolean
}

function isPermissionCode(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value === value.trim()
}

export function normalizePermissions(source: unknown): ReadonlySet<string> {
  if (!Array.isArray(source)) return new Set()
  return new Set(source.filter(isPermissionCode))
}

export function createPermissionPolicy(
  principal: AuthMeResponseDto | null,
  branchContext: AdminBranchAuthorizationContext | null,
): PermissionPolicy {
  const isReady = principal !== null && branchContext?.isInitialized === true
  const isSuperAdmin = isReady
    && principal.type === 'SYSTEM'
    && principal.isSuperAdmin === true
  const source = !isReady
    ? []
    : principal.type === 'SYSTEM'
      ? principal.globalPermissions
      : principal.type === 'BRANCH'
        ? branchContext.effectivePermissions
        : []
  const permissions = normalizePermissions(source)

  const can = (permission: AdminPermission): boolean => {
    return isPermissionCode(permission)
      && (isSuperAdmin || permissions.has(permission))
  }

  return {
    permissions,
    can,
    canAny: (required) => required.length > 0 && required.some(can),
    canAll: (required) => required.every(can),
  }
}
