import { describe, expect, it } from 'vitest'
import { roleFormSchema } from '../schemas/role-form.schema'
import { roleToForm, toCreateRolePayload, toUpdateRolePayload } from './role-form.adapter'

const role = {
  id: '01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T', code: 'SALES', name: 'Sales', description: null,
  guardName: 'web', type: 'BRANCH' as const, level: 20, isSystem: false, isActive: true,
  createdAt: '2026-07-15T00:00:00.000Z', updatedAt: '2026-07-15T00:00:00.000Z',
}

describe('role form schema and adapter', () => {
  it('uses Vietnamese validation for required, format, integer and range errors', () => {
    const invalid = roleFormSchema.safeParse({ ...roleToForm(role), code: 'sales-role', name: '', level: '1.5' })
    expect(invalid.success).toBe(false)
    if (invalid.success) return
    const messages = invalid.error.issues.map((issue) => issue.message)
    expect(messages).toContain('Mã vai trò chỉ được gồm chữ in hoa, số và dấu gạch dưới (_).')
    expect(messages).toContain('Tên vai trò là bắt buộc.')
    expect(messages).toContain('Cấp độ vai trò phải là số nguyên.')
    expect(messages.join(' ')).not.toMatch(/regular expression|Expected|Invalid enum/i)
  })

  it.each([
    ['DOM string', '30'],
    ['number', 30],
  ])('normalizes a valid %s level to a number payload', (_label, level) => {
    const parsed = roleFormSchema.safeParse({ ...roleToForm(role), level })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    const payload = toCreateRolePayload(parsed.data)
    expect(payload.level).toBe(30)
    expect(typeof payload.level).toBe('number')
  })

  it.each([
    ['', 'Cấp độ vai trò là bắt buộc.'],
    ['abc', 'Cấp độ vai trò phải là số.'],
    ['1.5', 'Cấp độ vai trò phải là số nguyên.'],
    ['0', 'Cấp độ vai trò phải từ 1 đến 99.'],
    ['100', 'Cấp độ vai trò phải từ 1 đến 99.'],
  ])('returns a Vietnamese level error for %j', (level, message) => {
    const parsed = roleFormSchema.safeParse({ ...roleToForm(role), level })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.find((issue) => issue.path[0] === 'level')?.message).toBe(message)
  })

  it.each(['1', '99'])('accepts the level boundary %s', (level) => {
    expect(roleFormSchema.safeParse({ ...roleToForm(role), level }).success).toBe(true)
  })

  it('accepts a corrected level immediately after an invalid value', () => {
    expect(roleFormSchema.safeParse({ ...roleToForm(role), level: 'abc' }).success).toBe(false)
    expect(roleFormSchema.safeParse({ ...roleToForm(role), level: '30' }).success).toBe(true)
  })

  it('maps exact create fields and never sends lifecycle or permissions', () => {
    const parsed = roleFormSchema.safeParse({ ...roleToForm(role), code: '  SALES_2  ', name: ' Sales 2 ', description: '  Team  ' })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    const payload = toCreateRolePayload(parsed.data)
    expect(payload).toEqual({ code: 'SALES_2', name: 'Sales 2', description: 'Team', type: 'BRANCH', level: 20, guardName: 'web' })
    expect(payload).not.toHaveProperty('isSystem')
    expect(payload).not.toHaveProperty('isActive')
    expect(payload).not.toHaveProperty('permissionIds')
  })

  it('sends only changed update fields', () => {
    const parsed = roleFormSchema.safeParse({ ...roleToForm(role), name: 'Sales team', level: '30' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      const payload = toUpdateRolePayload(parsed.data, role)
      expect(payload).toEqual({ name: 'Sales team', level: 30 })
      expect(typeof payload.level).toBe('number')
    }
  })
})
