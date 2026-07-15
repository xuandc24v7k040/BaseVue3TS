import { describe, expect, it } from 'vitest'
import type { AuthMeBranchAssignmentDto, AuthMeResponseDto } from '@/api/generated/models'
import { resolveAdminRoleLabel } from '@/authorization/admin-identity'

const principal = { type: 'BRANCH', isSuperAdmin: false } as AuthMeResponseDto

function assignment(roles: AuthMeBranchAssignmentDto['roles']): AuthMeBranchAssignmentDto {
  return { roles } as AuthMeBranchAssignmentDto
}

describe('admin identity label', () => {
  it('uses the highest selected assignment role', () => {
    expect(resolveAdminRoleLabel(principal, assignment([
      { id: 'staff', code: 'STAFF', level: 10, type: 'BRANCH', isSystem: true },
      { id: 'inventory', code: 'INVENTORY', level: 20, type: 'BRANCH', isSystem: true },
    ]))).toBe('Nhân viên kho')
  })

  it('does not label an empty BRANCH assignment as Branch Admin', () => {
    expect(resolveAdminRoleLabel(principal, assignment([]))).toBe('Nhân sự chi nhánh')
  })

  it('uses a safe custom-role fallback', () => {
    expect(resolveAdminRoleLabel(principal, assignment([
      { id: 'custom', code: 'STORE_LEAD', level: 30, type: 'BRANCH', isSystem: false },
    ]))).toBe('STORE_LEAD')
  })
})
