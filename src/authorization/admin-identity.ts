import type {
  AuthMeBranchAssignmentDto,
  AuthMeResponseDto,
  AuthMeRoleDto,
} from '@/api/generated/models'

const ROLE_LABELS: Readonly<Record<string, string>> = {
  SUPER_ADMIN: 'Super Admin',
  BRANCH_ADMIN: 'Branch Admin',
  STAFF: 'Nhân viên',
  INVENTORY: 'Nhân viên kho',
  CASHIER: 'Thu ngân',
}

function highestRole(roles: readonly AuthMeRoleDto[]): AuthMeRoleDto | null {
  return [...roles].sort((left, right) => right.level - left.level)[0] ?? null
}

export function resolveAdminRoleLabel(
  principal: AuthMeResponseDto | null,
  selectedAssignment: AuthMeBranchAssignmentDto | null,
): string {
  if (!principal) return 'Quản trị viên'
  if (principal.type === 'SYSTEM') {
    if (principal.isSuperAdmin) return ROLE_LABELS.SUPER_ADMIN!
    const role = highestRole(principal.globalRoles)
    return role ? ROLE_LABELS[role.code] ?? role.code : 'Quản trị hệ thống'
  }
  if (principal.type === 'BRANCH') {
    const role = highestRole(selectedAssignment?.roles ?? [])
    return role ? ROLE_LABELS[role.code] ?? role.code : 'Nhân sự chi nhánh'
  }
  return 'Khách hàng'
}
