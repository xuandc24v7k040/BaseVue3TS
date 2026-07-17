import { describe, expect, it } from 'vitest'
import editorSource from './RolePermissionEditorDialog.vue?raw'
import fieldSource from './RolePermissionField.vue?raw'
import groupSource from './RolePermissionGroup.vue?raw'
import formSource from './RoleFormDialog.vue?raw'

describe('role permission editor UI contract', () => {
  it('keeps fixed dialog regions, internal scrolling and responsive columns', () => {
    expect(editorSource).toContain('grid-rows-[auto_auto_minmax(0,1fr)_auto]')
    expect(editorSource).toContain('<ScrollArea class="h-full">')
    expect(editorSource.indexOf('</ScrollArea>')).toBeLessThan(editorSource.indexOf('<DialogFooter'))
    expect(editorSource).toContain('columns-1')
    expect(editorSource).toContain('md:columns-2')
    expect(groupSource).toContain('break-inside-avoid')
    expect(groupSource).not.toMatch(/<section class="[^"]*(?:h-full|min-h-|flex-1)/)
    expect(editorSource).toContain('max-h-[90dvh]')
  })

  it('exposes accessible two-level checkboxes and locked reasons', () => {
    expect(groupSource).toContain("'mixed'")
    expect(groupSource).toContain('<TooltipContent')
    expect(groupSource).toContain('Quyền nhạy cảm')
    expect(fieldSource).toContain('aria-haspopup="dialog"')
  })

  it('keeps checkbox changes as a draft until the role form is submitted', () => {
    expect(editorSource).toContain("emit('apply', new Set(draftSelectedIds.value))")
    expect(editorSource).not.toMatch(/assignRolePermission|removeRolePermission/)
    expect(formSource).toContain('persistPermissions')
    expect(formSource).toContain('Thử lại quyền hạn')
  })
})
