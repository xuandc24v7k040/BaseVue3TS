import { describe, expect, it } from 'vitest'
import { supplierFormSchema } from './supplier-form.schema'

describe('supplierFormSchema', () => {
  it('accepts a valid supplier and trims its values', () => {
    expect(
      supplierFormSchema.parse({
        name: '  Nhà sách Alpha  ',
        phone: '+84 912 345 678',
        email: 'contact@alpha.vn',
        address: '  Cần Thơ  ',
      }),
    ).toEqual({
      name: 'Nhà sách Alpha',
      phone: '+84 912 345 678',
      email: 'contact@alpha.vn',
      address: 'Cần Thơ',
    })
  })

  it('rejects invalid contact values', () => {
    expect(
      supplierFormSchema.safeParse({
        name: 'Alpha',
        phone: '123',
        email: 'not-an-email',
      }).success,
    ).toBe(false)
  })
})
