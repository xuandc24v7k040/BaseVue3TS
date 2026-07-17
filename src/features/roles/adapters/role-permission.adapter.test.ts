import { describe, expect, it } from 'vitest'
import type { Permission } from '@/features/permissions/types'
import {
  computePermissionDiff,
  filterPermissionGroups,
  getGroupTriState,
  getPermissionCapability,
  groupPermissions,
  selectedPermissionIds,
  togglePermissionGroup,
} from './role-permission.adapter'
import type {
  RolePermissionCapability,
  RolePermissionPolicyContext,
} from './role-permission.adapter'

const permissions = [
  permission('p-read', 'roles.read', 'roles', 'read'),
  permission('p-create', 'roles.create', 'roles', 'create'),
  permission('o-read', 'orders.read', 'orders', 'read', 'Xem đơn'),
]
const superAdminContext: RolePermissionPolicyContext = {
  isSystemRole: false,
  isRoleActive: true,
  roleGuardName: 'web',
  roleLevel: 20,
  actorIsSuperAdmin: true,
  actorMaxRoleLevel: 100,
  actorPermissionCodes: new Set(),
}

describe('role permission adapter', () => {
  it('normalizes the nested response and groups with stable friendly labels', () => {
    expect(selectedPermissionIds([{ permission: permissions[0]! }])).toEqual(new Set(['p-read']))
    const groups = groupPermissions(permissions)
    expect(groups.map(({ resource }) => resource)).toEqual(['orders', 'roles'])
    const roleCodes = groups.find(({ resource }) => resource === 'roles')?.permissions.map(({ code }) => code) ?? []
    expect(new Set(roleCodes)).toEqual(new Set(['roles.read', 'roles.create']))
    expect(groupPermissions(permissions).find(({ resource }) => resource === 'roles')?.permissions.map(({ code }) => code))
      .toEqual(roleCodes)
  })

  it('computes none, all and partial parent tri-state using mutable children only', () => {
    const group = groupPermissions(permissions).find(({ resource }) => resource === 'roles')!
    const capabilities = new Map<string, RolePermissionCapability>(group.permissions.map((item) => [
      item.id,
      { canAdd: true, canRemove: true, dangerous: false, reason: null },
    ]))
    expect(getGroupTriState(group, new Set(), capabilities)).toBe('unchecked')
    expect(getGroupTriState(group, new Set([group.permissions[0]!.id]), capabilities)).toBe('indeterminate')
    expect(getGroupTriState(group, new Set(group.permissions.map(({ id }) => id)), capabilities)).toBe('checked')
  })

  it('selects and deselects a group without changing locked children', () => {
    const group = groupPermissions(permissions).find(({ resource }) => resource === 'roles')!
    const lockedId = group.permissions.find(({ code }) => code === 'roles.create')!.id
    const capabilities = new Map<string, RolePermissionCapability>(group.permissions.map((item) => [
      item.id,
      item.id === lockedId
        ? { canAdd: false, canRemove: false, dangerous: true, reason: 'locked' }
        : { canAdd: true, canRemove: true, dangerous: false, reason: null },
    ]))
    const selected = togglePermissionGroup(group, new Set([lockedId]), capabilities)
    expect(selected.has(lockedId)).toBe(true)
    expect(selected.has(group.permissions.find(({ id }) => id !== lockedId)!.id)).toBe(true)
  })

  it('locks dangerous, guard-mismatched and undelegable permissions', () => {
    expect(getPermissionCapability(permissions[1]!, false, superAdminContext).dangerous).toBe(true)
    expect(getPermissionCapability(
      { ...permissions[0]!, guardName: 'api' },
      false,
      superAdminContext,
    ).reason).toContain('Guard')
    expect(getPermissionCapability(permissions[0]!, false, {
      ...superAdminContext,
      actorIsSuperAdmin: false,
      actorMaxRoleLevel: 10,
      actorPermissionCodes: new Set(['roles.assign_permission', 'roles.read']),
    }).reason).toContain('ủy quyền')
  })

  it('filters locally without mutating the draft selection', () => {
    const selected = new Set(['o-read'])
    const result = filterPermissionGroups(groupPermissions(permissions), selected, 'Xem đơn', 'selected')
    expect(result.flatMap(({ permissions: items }) => items.map(({ id }) => id))).toEqual(['o-read'])
    expect(selected).toEqual(new Set(['o-read']))
  })

  it('builds add/remove diffs and excludes locked dangerous changes', () => {
    const diff = computePermissionDiff(
      permissions,
      new Set(['p-read']),
      new Set(['p-create', 'o-read']),
      superAdminContext,
    )
    expect(diff.toAdd.map(({ id }) => id)).toEqual(['o-read'])
    expect(diff.toRemove.map(({ id }) => id)).toEqual(['p-read'])
  })
})

function permission(
  id: string,
  code: string,
  resource: string,
  action: string,
  name = code,
): Permission {
  return {
    id,
    code,
    name,
    resource,
    action,
    guardName: 'web',
    description: null,
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  }
}
