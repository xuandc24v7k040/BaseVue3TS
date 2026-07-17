import type { CreatePermissionDto, PermissionsListParams, UpdatePermissionDto } from '@/api/generated/models'
import type { Permission } from '../types'
import {
  permissionsCreate,
  permissionsGet,
  permissionsList,
  permissionsRemove,
  permissionsUpdate,
} from '@/api/generated/endpoints/permissions/permissions'

export function listPermissions(params: PermissionsListParams, signal?: AbortSignal) {
  return permissionsList(params, undefined, signal)
}

export async function listPermissionCatalog(signal?: AbortSignal) {
  const permissions: Permission[] = []
  let page = 1
  const limit = 100

  while (true) {
    const response = await listPermissions(
      { page, limit, sortBy: 'code', sortOrder: 'asc' },
      signal,
    )
    permissions.push(...response.data)
    if (!response.meta.hasNextPage) return permissions
    if (response.meta.page >= response.meta.lastPage) {
      throw new Error('Permission catalog pagination không nhất quán.')
    }
    page += 1
  }
}

export function getPermission(id: string, signal?: AbortSignal) {
  return permissionsGet(id, undefined, signal)
}

export function createPermission(payload: CreatePermissionDto) {
  return permissionsCreate(payload)
}

export function updatePermission(id: string, payload: UpdatePermissionDto) {
  return permissionsUpdate(id, payload)
}

export function deletePermission(id: string) {
  return permissionsRemove(id)
}
