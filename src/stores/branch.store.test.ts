// @vitest-environment happy-dom

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type {
  AuthMeBranchAssignmentDto,
  AuthMeBranchDto,
  AuthMeResponseDto,
} from '@/api/generated/models'
import { STORAGE_KEYS } from '@/constants/storage-key.constant'
import { queryClient } from '@/lib/query-client'
import { useBranchStore } from '@/stores/branch.store'

const USER_A = '01K0000000000000000000000A'
const USER_B = '01K0000000000000000000000B'
const BRANCH_A = '01K00000000000000000000001'
const BRANCH_B = '01K00000000000000000000002'
const BRANCH_C = '01K00000000000000000000003'

function branch(id: string, name: string, isPrimary = false): AuthMeBranchDto {
  return { id, name, code: name.toLowerCase(), isPrimary }
}

function assignment(
  target: AuthMeBranchDto,
  permissions: string[],
  options: { active?: boolean; primary?: boolean } = {},
): AuthMeBranchAssignmentDto {
  return {
    branchId: target.id,
    userBranchId: `assignment-${target.id}`,
    branch: target,
    isPrimary: options.primary ?? false,
    isActive: options.active ?? true,
    roles: [],
    permissions,
    maxRoleLevel: 0,
  }
}

function principal(options: {
  id?: string
  type?: AuthMeResponseDto['type']
  branches?: AuthMeBranchDto[]
  assignments?: AuthMeBranchAssignmentDto[]
  primaryBranchId?: string | null
  globalPermissions?: string[]
} = {}): AuthMeResponseDto {
  const type = options.type ?? 'SYSTEM'
  return {
    id: options.id ?? USER_A,
    email: 'admin@example.com',
    fullName: 'Admin',
    phone: null,
    gender: null,
    birthday: null,
    type,
    roles: [],
    permissions: [],
    globalRoles: [],
    globalPermissions: options.globalPermissions ?? [],
    branchAssignments: options.assignments ?? [],
    maxRoleLevel: 0,
    isSuperAdmin: type === 'SYSTEM',
    branches: options.branches ?? [],
    primaryBranchId: options.primaryBranchId ?? null,
  }
}

function persist(userId: string, branchId: string | null): void {
  localStorage.setItem(
    STORAGE_KEYS.adminBranchContext,
    JSON.stringify({ userId, branchId }),
  )
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  queryClient.clear()
})

describe('admin branch context for SYSTEM users', () => {
  const branches = [branch(BRANCH_A, 'Cần Thơ'), branch(BRANCH_B, 'Hậu Giang')]

  it('defaults to system scope without a persisted branch', () => {
    const store = useBranchStore()
    store.initialize(principal({ branches, globalPermissions: ['system.read'] }))

    expect(store.selectedBranchId).toBeNull()
    expect(store.isSystemScope).toBe(true)
    expect(store.scopeLabel).toBe('Toàn hệ thống')
    expect(store.effectivePermissions).toEqual(['system.read'])
  })

  it('restores only an active branch persisted for the same user', () => {
    persist(USER_A, BRANCH_B)
    const store = useBranchStore()
    store.initialize(principal({ branches }))
    expect(store.selectedBranchId).toBe(BRANCH_B)

    persist(USER_B, BRANCH_A)
    store.initialize(principal({ branches }))
    expect(store.selectedBranchId).toBeNull()
  })

  it('falls back to system scope for missing or inactive persisted branches', () => {
    persist(USER_A, BRANCH_C)
    const store = useBranchStore()
    store.initialize(principal({ branches }))
    expect(store.selectedBranchId).toBeNull()
  })

  it('selects a real branch and returns to system scope without fake values', async () => {
    const store = useBranchStore()
    store.initialize(principal({ branches }))

    await expect(store.setSelectedBranch(BRANCH_A)).resolves.toBe(true)
    expect(store.selectedBranch?.name).toBe('Cần Thơ')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.adminBranchContext) ?? '')).toEqual({
      userId: USER_A,
      branchId: BRANCH_A,
    })

    await expect(store.setSelectedBranch(null)).resolves.toBe(true)
    expect(store.selectedBranchId).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.adminBranchContext)).not.toContain('all')
    expect(localStorage.getItem(STORAGE_KEYS.adminBranchContext)).not.toContain('system')
  })
})

describe('admin branch context for BRANCH users', () => {
  const branchA = branch(BRANCH_A, 'Cần Thơ', true)
  const branchB = branch(BRANCH_B, 'Hậu Giang')
  const assignments = [
    assignment(branchA, ['staff.read', 'orders.read'], { primary: true }),
    assignment(branchB, ['inventory.read']),
  ]

  it('uses a valid persisted assigned branch', () => {
    persist(USER_A, BRANCH_B)
    const store = useBranchStore()
    store.initialize(principal({
      type: 'BRANCH', branches: [branchA, branchB], assignments, primaryBranchId: BRANCH_A,
    }))
    expect(store.selectedBranchId).toBe(BRANCH_B)
  })

  it('falls back from an invalid persisted branch to the valid primary branch', () => {
    persist(USER_A, BRANCH_C)
    const store = useBranchStore()
    store.initialize(principal({
      type: 'BRANCH', branches: [branchA, branchB], assignments, primaryBranchId: BRANCH_A,
    }))
    expect(store.selectedBranchId).toBe(BRANCH_A)
  })

  it('reconciles a tampered branch to the cashier assignment and overwrites persistence', () => {
    const hauGiang = branch(BRANCH_B, 'Hậu Giang', true)
    persist(USER_A, BRANCH_A)
    const store = useBranchStore()

    store.initialize(principal({
      type: 'BRANCH',
      branches: [hauGiang],
      assignments: [assignment(hauGiang, ['orders.read'], { primary: true })],
      primaryBranchId: BRANCH_B,
    }))

    expect(store.selectedBranchId).toBe(BRANCH_B)
    expect(store.availableBranches.map(({ id }) => id)).toEqual([BRANCH_B])
    expect(store.effectivePermissions).toEqual(['orders.read'])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.adminBranchContext) ?? '')).toEqual({
      userId: USER_A,
      branchId: BRANCH_B,
    })
  })

  it('falls back to the first backend-ordered active assignment when primary is invalid', () => {
    const store = useBranchStore()
    store.initialize(principal({
      type: 'BRANCH', branches: [branchA, branchB], assignments, primaryBranchId: BRANCH_C,
    }))
    expect(store.selectedBranchId).toBe(BRANCH_A)
  })

  it('keeps an unassigned user authenticated with a null branch', () => {
    const store = useBranchStore()
    store.initialize(principal({ type: 'BRANCH' }))
    expect(store.selectedBranchId).toBeNull()
    expect(store.availableBranches).toEqual([])
    expect(store.scopeLabel).toBe('Chưa được phân công chi nhánh')
  })

  it('excludes inactive assignments and branches absent from the active server list', () => {
    const store = useBranchStore()
    store.initialize(principal({
      type: 'BRANCH',
      branches: [branchA],
      assignments: [
        assignment(branchA, ['active'], { active: false }),
        assignment(branchB, ['inactive-branch']),
      ],
    }))
    expect(store.availableBranches).toEqual([])
    expect(store.selectedBranchId).toBeNull()
  })

  it('rejects system scope and branches outside active assignments', async () => {
    const store = useBranchStore()
    store.initialize(principal({ type: 'BRANCH', branches: [branchA], assignments: [assignments[0]!] }))

    await expect(store.setSelectedBranch(null)).resolves.toBe(false)
    await expect(store.setSelectedBranch(BRANCH_B)).resolves.toBe(false)
    expect(store.selectedBranchId).toBe(BRANCH_A)
  })

  it('uses permissions only from the selected assignment', async () => {
    const store = useBranchStore()
    store.initialize(principal({ type: 'BRANCH', branches: [branchA, branchB], assignments }))
    expect(store.effectivePermissions).toEqual(['staff.read', 'orders.read'])

    await store.setSelectedBranch(BRANCH_B)
    expect(store.effectivePermissions).toEqual(['inventory.read'])
    expect(store.effectivePermissions).not.toContain('staff.read')
  })

  it('clears an invalid selected branch but keeps allowed options for recovery', async () => {
    const store = useBranchStore()
    store.initialize(principal({
      type: 'BRANCH', branches: [branchA, branchB], assignments,
    }))

    await store.clearSelectedBranch()

    expect(store.selectedBranchId).toBeNull()
    expect(store.availableBranches.map(({ id }) => id)).toEqual([BRANCH_A, BRANCH_B])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.adminBranchContext) ?? '')).toEqual({
      userId: USER_A,
      branchId: null,
    })
  })
})

describe('admin branch persistence and lifecycle', () => {
  it('ignores malformed persistence without crashing', () => {
    localStorage.setItem(STORAGE_KEYS.adminBranchContext, '{broken')
    const store = useBranchStore()
    expect(() => store.initialize(principal())).not.toThrow()
    expect(store.selectedBranchId).toBeNull()
  })

  it('reset clears state and persistence on logout or session expiry', () => {
    const store = useBranchStore()
    store.initialize(principal())
    store.reset()
    expect(store.isInitialized).toBe(false)
    expect(localStorage.getItem(STORAGE_KEYS.adminBranchContext)).toBeNull()
  })

  it('does not inherit another account selection', () => {
    const branches = [branch(BRANCH_A, 'Cần Thơ')]
    persist(USER_A, BRANCH_A)
    const store = useBranchStore()
    store.initialize(principal({ id: USER_B, branches }))
    expect(store.selectedBranchId).toBeNull()
  })

  it('reconciles a removed branch on the next /auth/me result', () => {
    const branches = [branch(BRANCH_A, 'Cần Thơ')]
    persist(USER_A, BRANCH_A)
    const store = useBranchStore()
    store.initialize(principal({ branches }))
    expect(store.selectedBranchId).toBe(BRANCH_A)

    store.initialize(principal({ branches: [] }))
    expect(store.selectedBranchId).toBeNull()
  })
})
