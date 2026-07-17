import { describe, expect, it } from 'vitest'
import listSource from '../pages/RoleListPage.vue?raw'
import detailSource from '../pages/RoleDetailPage.vue?raw'
import formSource from './RoleFormDialog.vue?raw'
import actionsSource from './RoleActionsMenu.vue?raw'
import deactivateSource from './RoleDeactivateDialog.vue?raw'

describe('role UI contract', () => {
  it('gates every action and keeps system roles read-only', () => {
    expect(listSource).toContain('ADMIN_PERMISSIONS.ROLES_CREATE')
    expect(listSource).toContain('ADMIN_PERMISSIONS.ROLES_UPDATE')
    expect(listSource).toContain('ADMIN_PERMISSIONS.ROLES_DELETE')
    expect(listSource).toContain(':can-update="can(ADMIN_PERMISSIONS.ROLES_UPDATE)"')
    expect(listSource).toContain(':can-delete="can(ADMIN_PERMISSIONS.ROLES_DELETE)"')
    expect(actionsSource).toContain('Vai trò hệ thống được bảo vệ và không thể chỉnh sửa.')
    expect(actionsSource).toContain(':disabled="Boolean(editDisabledMessage())"')
    expect(actionsSource).toContain(':disabled="Boolean(deactivateDisabledMessage())"')
    expect(actionsSource).toContain('<TooltipContent')
    expect(actionsSource).toContain('role.isSystem || role.isActive')
    expect(detailSource).toContain('role.isSystem ? \'Hệ thống\' : \'Tùy chỉnh\'')
    expect(detailSource).toContain('Nội dung chỉ đọc')
  })

  it('keeps the form body scrollable without placing the footer over fields', () => {
    expect(formSource).toContain('grid-rows-[auto_minmax(0,1fr)_auto]')
    expect(formSource).toContain('<div class="min-h-0 overflow-hidden"><ScrollArea class="h-full">')
    expect(formSource.indexOf('</ScrollArea></div>')).toBeLessThan(formSource.indexOf('<DialogFooter'))
    expect(formSource).toContain('flex-col-reverse')
    expect(formSource).toContain('w-full sm:w-auto')
    expect(formSource).toContain('novalidate @submit.prevent="submit"')
    expect(formSource).toContain('@input="validateField(\'level\')"')
  })

  it('uses exact lifecycle semantics and scoped cache invalidation', () => {
    expect(formSource).not.toMatch(/permissionIds|rolesAssignPermission|rolesRemovePermission/)
    expect(deactivateSource).toContain('không xóa dữ liệu vật lý')
    expect(deactivateSource).toContain('không có API kích hoạt lại')
    expect(deactivateSource).toContain('roleKeys.lists()')
    expect(deactivateSource).toContain('roleKeys.detail(props.role.id)')
    expect(deactivateSource).not.toMatch(/reactivate|optimistic/i)
  })
})
