import type { RolePermissionResponseDto } from '@/api/generated/models'
import type { Permission } from '@/features/permissions/types'
import { isDangerousPermission } from '@/features/permissions/utils/dangerous-permissions'
import {
  formatPermissionLabel,
  formatPermissionResource,
} from '@/features/permissions/utils/permission-labels'

export type RolePermissionFilter = 'all' | 'selected' | 'unselected'
export type RolePermissionTriState = 'checked' | 'indeterminate' | 'unchecked'
export type RolePermissionMutationKind = 'add' | 'remove'

export interface RolePermissionGroup {
  resource: string
  label: string
  permissions: Permission[]
}

export interface RolePermissionPolicyContext {
  isSystemRole: boolean
  isRoleActive: boolean
  roleGuardName: string
  roleLevel: number
  actorIsSuperAdmin: boolean
  actorMaxRoleLevel: number
  actorPermissionCodes: ReadonlySet<string>
}

export interface RolePermissionCapability {
  canAdd: boolean
  canRemove: boolean
  dangerous: boolean
  reason: string | null
}

export interface RolePermissionDiff {
  toAdd: Permission[]
  toRemove: Permission[]
}

export function normalizeRolePermissions(
  mappings: readonly RolePermissionResponseDto[],
): Permission[] {
  return mappings.map(({ permission }) => permission)
}

export function selectedPermissionIds(
  mappings: readonly RolePermissionResponseDto[],
): Set<string> {
  return new Set(mappings.map(({ permission }) => permission.id))
}

export function groupPermissions(
  permissions: readonly Permission[],
): RolePermissionGroup[] {
  const groups = new Map<string, Permission[]>()
  for (const permission of permissions) {
    const group = groups.get(permission.resource) ?? []
    group.push(permission)
    groups.set(permission.resource, group)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'vi'))
    .map(([resource, items]) => ({
      resource,
      label: formatPermissionResource(resource),
      permissions: [...items].sort((left, right) =>
        formatPermissionLabel(left).localeCompare(formatPermissionLabel(right), 'vi')
        || left.code.localeCompare(right.code),
      ),
    }))
}

export function getPermissionCapability(
  permission: Permission,
  selected: boolean,
  context: RolePermissionPolicyContext,
): RolePermissionCapability {
  const dangerous = isDangerousPermission(permission.code)
  if (context.isSystemRole) {
    return lockedCapability(dangerous, 'Vai trò hệ thống chỉ có thể xem.')
  }
  if (dangerous) {
    return lockedCapability(
      true,
      'Quyền nhạy cảm được hệ thống bảo vệ và không thể gán cho vai trò.',
    )
  }
  if (permission.guardName !== context.roleGuardName) {
    return lockedCapability(false, 'Guard của quyền không tương thích với vai trò.')
  }
  if (
    !context.actorIsSuperAdmin
    && (
      !context.actorPermissionCodes.has('roles.assign_permission')
      || !context.actorPermissionCodes.has(permission.code)
      || context.roleLevel >= context.actorMaxRoleLevel
    )
  ) {
    return lockedCapability(false, 'Bạn không có quyền ủy quyền quyền hạn này.')
  }
  if (!context.isRoleActive && !selected) {
    return lockedCapability(false, 'Không thể gán thêm quyền cho vai trò ngừng hoạt động.')
  }
  return { canAdd: !selected, canRemove: selected, dangerous: false, reason: null }
}

export function getGroupTriState(
  group: RolePermissionGroup,
  selectedIds: ReadonlySet<string>,
  capabilities: ReadonlyMap<string, RolePermissionCapability>,
): RolePermissionTriState {
  const mutable = group.permissions.filter((permission) => {
    const capability = capabilities.get(permission.id)
    return capability?.canAdd || capability?.canRemove
  })
  if (!mutable.length) return 'unchecked'
  const selectedCount = mutable.filter(({ id }) => selectedIds.has(id)).length
  if (selectedCount === 0) return 'unchecked'
  if (selectedCount === mutable.length) return 'checked'
  return 'indeterminate'
}

export function togglePermissionGroup(
  group: RolePermissionGroup,
  selectedIds: ReadonlySet<string>,
  capabilities: ReadonlyMap<string, RolePermissionCapability>,
): Set<string> {
  const next = new Set(selectedIds)
  const state = getGroupTriState(group, selectedIds, capabilities)
  for (const permission of group.permissions) {
    const capability = capabilities.get(permission.id)
    if (state === 'checked' && capability?.canRemove) next.delete(permission.id)
    if (state !== 'checked' && capability?.canAdd) next.add(permission.id)
  }
  return next
}

export function filterPermissionGroups(
  groups: readonly RolePermissionGroup[],
  selectedIds: ReadonlySet<string>,
  search: string,
  filter: RolePermissionFilter,
): RolePermissionGroup[] {
  const normalizedSearch = search.trim().toLocaleLowerCase('vi-VN')
  return groups.flatMap((group) => {
    const permissions = group.permissions.filter((permission) => {
      const selected = selectedIds.has(permission.id)
      if (filter === 'selected' && !selected) return false
      if (filter === 'unselected' && selected) return false
      if (!normalizedSearch) return true
      return [
        formatPermissionLabel(permission),
        permission.code,
        permission.resource,
        permission.action,
        permission.name,
        permission.description ?? '',
      ].some((value) => value.toLocaleLowerCase('vi-VN').includes(normalizedSearch))
    })
    return permissions.length ? [{ ...group, permissions }] : []
  })
}

export function computePermissionDiff(
  catalog: readonly Permission[],
  initialIds: ReadonlySet<string>,
  targetIds: ReadonlySet<string>,
  context: RolePermissionPolicyContext,
): RolePermissionDiff {
  const toAdd: Permission[] = []
  const toRemove: Permission[] = []
  for (const permission of catalog) {
    const initiallySelected = initialIds.has(permission.id)
    const targetSelected = targetIds.has(permission.id)
    if (initiallySelected === targetSelected) continue
    const capability = getPermissionCapability(permission, initiallySelected, context)
    if (targetSelected && capability.canAdd) toAdd.push(permission)
    if (!targetSelected && capability.canRemove) toRemove.push(permission)
  }
  return { toAdd, toRemove }
}

function lockedCapability(
  dangerous: boolean,
  reason: string,
): RolePermissionCapability {
  return { canAdd: false, canRemove: false, dangerous, reason }
}
