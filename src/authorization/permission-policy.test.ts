import { describe, expect, it } from 'vitest'
import type { AuthMeResponseDto } from '@/api/generated/models'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import { createPermissionPolicy, normalizePermissions } from '@/authorization/permission-policy'

function principal(options: Partial<AuthMeResponseDto> = {}): AuthMeResponseDto {
  return {
    id: '01K0000000000000000000000A',
    email: 'admin@example.com',
    fullName: 'Admin',
    type: 'SYSTEM',
    roles: [],
    permissions: [],
    globalRoles: [],
    globalPermissions: [],
    branchAssignments: [],
    maxRoleLevel: 0,
    isSuperAdmin: false,
    branches: [],
    primaryBranchId: null,
    ...options,
    phone: options.phone ?? null,
    gender: options.gender ?? null,
    birthday: options.birthday ?? null,
  }
}

describe('permission policy', () => {
  it('normalizes valid exact codes without mutating the source', () => {
    const source = ['staff.read', 'staff.read', '', ' staff.create ', null]
    expect([...normalizePermissions(source)]).toEqual(['staff.read'])
    expect(source).toEqual(['staff.read', 'staff.read', '', ' staff.create ', null])
  })

  it('supports exact can/canAny/canAll semantics', () => {
    const policy = createPermissionPolicy(principal({
      globalPermissions: ['staff.read', 'staff.create'],
    }), { isInitialized: true, effectivePermissions: [] })

    expect(policy.can(ADMIN_PERMISSIONS.STAFF_READ)).toBe(true)
    expect(policy.can(ADMIN_PERMISSIONS.USERS_READ)).toBe(false)
    expect(policy.can('staff' as typeof ADMIN_PERMISSIONS.STAFF_READ)).toBe(false)
    expect(policy.can('' as typeof ADMIN_PERMISSIONS.STAFF_READ)).toBe(false)
    expect(policy.canAny([ADMIN_PERMISSIONS.USERS_READ, ADMIN_PERMISSIONS.STAFF_READ])).toBe(true)
    expect(policy.canAny([])).toBe(false)
    expect(policy.canAll([ADMIN_PERMISSIONS.STAFF_READ, ADMIN_PERMISSIONS.STAFF_CREATE])).toBe(true)
    expect(policy.canAll([ADMIN_PERMISSIONS.STAFF_READ, ADMIN_PERMISSIONS.USERS_READ])).toBe(false)
    expect(policy.canAll([])).toBe(true)
  })

  it('fails closed before initialization and never bypasses from SYSTEM type alone', () => {
    const system = principal({ globalPermissions: [ADMIN_PERMISSIONS.USERS_READ] })
    expect(createPermissionPolicy(system, null).can(ADMIN_PERMISSIONS.USERS_READ)).toBe(false)
    expect(createPermissionPolicy(system, { isInitialized: false, effectivePermissions: [] })
      .can(ADMIN_PERMISSIONS.USERS_READ)).toBe(false)
    expect(createPermissionPolicy(system, { isInitialized: true, effectivePermissions: [] })
      .can(ADMIN_PERMISSIONS.STAFF_READ)).toBe(false)
  })

  it('bypasses only for a verified super admin', () => {
    const policy = createPermissionPolicy(principal({ isSuperAdmin: true }), {
      isInitialized: true,
      effectivePermissions: [],
    })
    expect(policy.can(ADMIN_PERMISSIONS.PERMISSIONS_READ)).toBe(true)
  })

  it('uses only effective permissions for a BRANCH principal', () => {
    const branchUser = principal({
      type: 'BRANCH',
      globalPermissions: [ADMIN_PERMISSIONS.USERS_READ],
    })
    const policy = createPermissionPolicy(branchUser, {
      isInitialized: true,
      effectivePermissions: [ADMIN_PERMISSIONS.INVENTORY_READ],
    })
    expect(policy.can(ADMIN_PERMISSIONS.INVENTORY_READ)).toBe(true)
    expect(policy.can(ADMIN_PERMISSIONS.USERS_READ)).toBe(false)
  })
})
