import type { CreateRoleDto, RolesListParams, UpdateRoleDto } from '@/api/generated/models'
import {
  rolesCreate,
  rolesDeactivate,
  rolesGet,
  rolesList,
  rolesUpdate,
} from '@/api/generated/endpoints/roles/roles'

export function listRoles(params: RolesListParams, signal?: AbortSignal) {
  return rolesList(params, undefined, signal)
}

export function getRole(id: string, signal?: AbortSignal) {
  return rolesGet(id, undefined, signal)
}

export function createRole(payload: CreateRoleDto) {
  return rolesCreate(payload)
}

export function updateRole(id: string, payload: UpdateRoleDto) {
  return rolesUpdate(id, payload)
}

export function deactivateRole(id: string) {
  return rolesDeactivate(id)
}
