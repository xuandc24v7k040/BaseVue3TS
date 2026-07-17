import { describe, expect, it } from 'vitest'
import { permissionFormSchema } from './permission-form.schema'

const valid = { code: 'shipments.read', name: 'Xem vận chuyển', resource: 'shipments', action: 'read', guardName: 'web', description: '' } as const

describe('permission form schema', () => {
  it('accepts the exact create contract', () => {
    expect(permissionFormSchema.parse(valid)).toEqual(valid)
  })

  it.each([
    [{ ...valid, code: '' }, 'Mã quyền là bắt buộc.'],
    [{ ...valid, name: '' }, 'Tên quyền là bắt buộc.'],
    [{ ...valid, resource: 'Shipments' }, 'Tài nguyên chỉ được gồm chữ thường, số và dấu gạch dưới.'],
    [{ ...valid, code: 'orders.read' }, 'Mã quyền phải khớp với tài nguyên và hành động.'],
  ])('returns Vietnamese validation for %o', (value, message) => {
    const result = permissionFormSchema.safeParse(value)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((issue) => issue.message === message)).toBe(true)
  })
})
