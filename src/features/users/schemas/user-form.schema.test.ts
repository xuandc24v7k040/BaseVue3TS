import { describe, expect, it } from 'vitest'
import { toCreateUserPayload, toUpdateUserPayload } from '../adapters/user-form.adapter'
import { userFormSchema } from './user-form.schema'

describe('Users profile form boundary', () => {
  it('creates a CUSTOMER-profile payload containing only the five allowed fields', () => {
    const value = userFormSchema.parse({
      fullName: '  Nguyễn Văn An  ',
      email: '  USER@EXAMPLE.COM ',
      phone: '',
      gender: '  Nam ',
      birthday: '1995-08-17',
    })

    expect(toCreateUserPayload(value)).toEqual({
      fullName: 'Nguyễn Văn An',
      email: 'user@example.com',
      phone: null,
      gender: 'Nam',
      birthday: '1995-08-17',
    })
    expect(toUpdateUserPayload(value)).not.toHaveProperty('type')
    expect(toUpdateUserPayload(value)).not.toHaveProperty('provider')
    expect(toUpdateUserPayload(value)).not.toHaveProperty('isActive')
    expect(toUpdateUserPayload(value)).not.toHaveProperty('roleIds')
    expect(toUpdateUserPayload(value)).not.toHaveProperty('branchIds')
  })

  it.each([
    [{ fullName: '', email: 'a@example.com', phone: '', gender: '', birthday: '' }, 'Vui lòng nhập họ và tên.'],
    [{ fullName: 'An', email: 'invalid', phone: '', gender: '', birthday: '' }, 'Email không đúng định dạng.'],
    [{ fullName: 'An', email: 'a@example.com', phone: '', gender: 'x'.repeat(21), birthday: '' }, 'Giới tính không được vượt quá 20 ký tự.'],
    [{ fullName: 'An', email: 'a@example.com', phone: '', gender: '', birthday: '1995-02-31' }, 'Ngày sinh không hợp lệ.'],
  ])('returns Vietnamese validation for invalid profile input', (input, message) => {
    const result = userFormSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toContain(message)
  })
})
