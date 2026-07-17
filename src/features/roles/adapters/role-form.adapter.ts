import type { CreateRoleDto, UpdateRoleDto } from '@/api/generated/models'
import type { Role, RoleFormState } from '../types'
import type { RoleFormData } from '../schemas/role-form.schema'

export function emptyRoleForm(): RoleFormState {
  return { code: '', name: '', description: '', type: 'BRANCH', level: '', guardName: 'web' }
}

export function roleToForm(role: Role): RoleFormState {
  return {
    code: role.code,
    name: role.name,
    description: role.description ?? '',
    type: role.type,
    level: String(role.level),
    guardName: role.guardName,
  }
}

export function toCreateRolePayload(value: RoleFormData): CreateRoleDto {
  return {
    code: value.code,
    name: value.name,
    ...(value.description ? { description: value.description } : {}),
    type: value.type,
    level: value.level,
    guardName: value.guardName,
  }
}

export function toUpdateRolePayload(value: RoleFormData, original: Role): UpdateRoleDto {
  const payload: UpdateRoleDto = {}
  if (value.code !== original.code) payload.code = value.code
  if (value.name !== original.name) payload.name = value.name
  if (value.description !== (original.description ?? '')) payload.description = value.description
  if (value.type !== original.type) payload.type = value.type
  if (value.level !== original.level) payload.level = value.level
  if (value.guardName !== original.guardName) payload.guardName = value.guardName
  return payload
}
