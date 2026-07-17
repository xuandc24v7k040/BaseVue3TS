import {
  rolesAssignPermission,
  rolesPermissions,
  rolesRemovePermission,
} from '@/api/generated/endpoints/roles/roles'

export function listRolePermissions(roleId: string, signal?: AbortSignal) {
  return rolesPermissions(roleId, undefined, signal)
}

export function assignRolePermission(roleId: string, permissionId: string) {
  return rolesAssignPermission(roleId, permissionId)
}

export function removeRolePermission(roleId: string, permissionId: string) {
  return rolesRemovePermission(roleId, permissionId)
}
