import { describe, expect, it } from 'vitest'
import form from './UserFormDialog.vue?raw'
import state from './UserStateDialog.vue?raw'
import list from '../pages/UserListPage.vue?raw'
import detail from '../pages/UserDetailPage.vue?raw'
import api from '../api/user-api.ts?raw'
import errors from '../utils/user-errors.ts?raw'
import actions from './UserActionsMenu.vue?raw'
import columns from './user-columns.ts?raw'
import userStatus from './UserStatusBadge.vue?raw'

describe('Users Phase 8E UI contract', () => {
  it('keeps create/update bounded to profile fields with a fixed dialog layout', () => {
    expect(form).toContain('grid-rows-[auto_minmax(0,1fr)_auto]')
    expect(form).toContain('<ScrollArea class="h-full">')
    expect(form).toContain('Tạo hồ sơ khách hàng')
    expect(form).not.toMatch(/password|roleIds|permissionIds|branchIds/i)
  })

  it('uses soft-disable wording and maps the BRANCH activation invariant', () => {
    expect(state).toContain('Dữ liệu người dùng không bị xóa')
    expect(state).toContain('Người dùng phải đăng nhập lại')
    expect(errors).toContain('USER_ACTIVATION_REQUIRES_ACTIVE_BRANCH')
  })

  it('does not expose CUSTOMER conversion or authorization graph editing', () => {
    const feature = [list, detail, api].join('\n')
    expect(feature).not.toMatch(/branchAdminsConvert|staffConvert|CUSTOMER\s*→/)
    expect(feature).not.toMatch(/assignRole|assignPermission|assignBranch/)
  })

  it('applies the bounded Users UI polish without removing update wiring', () => {
    expect(columns).toContain("accessorKey: 'provider'")
    expect(columns).toContain('enableHiding: false')
    expect(list).toContain('initialColumnVisibility: { provider: false, updatedAt: false }')
    expect(userStatus).not.toContain("@/components/ui/badge")
    expect(userStatus).toContain('text-emerald-600')
    expect(userStatus).toContain('text-red-600')
    expect(actions).toContain('<DropdownMenuItem v-if="canUpdate" disabled')
    expect(actions).toContain(`@select="$emit('edit')"`)
    expect(detail).toContain('<Button disabled variant="outline" @click="editOpen = true">')
    expect(detail).toContain('<UserFormDialog')
    expect(detail).not.toContain('Phạm vi quản lý')
    expect(detail).not.toContain('scopeText')
  })
})
