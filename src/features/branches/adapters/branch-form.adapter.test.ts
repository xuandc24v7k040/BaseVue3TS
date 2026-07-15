import { describe, expect, it } from 'vitest'
import {
  applyLocation,
  branchToForm,
  formToLocation,
  toCreatePayload,
  toUpdatePayload,
  validateBranchForm,
} from './branch-form.adapter'

const branch = {
  id: '01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T',
  code: 'ct-nk',
  name: 'Bookora Ninh Kiều',
  address: '12 Đường 30 tháng 4',
  phone: '02923888888',
  province: 'Thành phố Cần Thơ',
  ward: 'Phường Ninh Kiều',
  latitude: 10.0452,
  longitude: 105.7469,
  isActive: true,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
}

describe('branch form adapter', () => {
  it('defaults Create to active and hydrates either Update status', () => {
    expect(validateBranchForm({
      ...branchToForm(branch),
      isActive: true,
    }).success).toBe(true)
    expect(branchToForm({ ...branch, isActive: false }).isActive).toBe(false)
  })

  it('sends the explicit selected status in create and update payloads', () => {
    const result = validateBranchForm({ ...branchToForm(branch), isActive: false })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(toCreatePayload(result.data).isActive).toBe(false)
    expect(toUpdatePayload(result.data).isActive).toBe(false)
  })

  it('uses a friendly Vietnamese branch-code validation message', () => {
    const result = validateBranchForm({ ...branchToForm(branch), code: 'CT_NK' })
    expect(result.success).toBe(false)
    if (result.success) return
    const message = result.error.issues.find((issue) => issue.path[0] === 'code')?.message
    expect(message).toBe('Mã chi nhánh phải bắt đầu bằng chữ thường và chỉ gồm chữ thường, số hoặc dấu gạch ngang (-).')
    expect(message).not.toContain('regular expression')
    expect(message).not.toContain('/^')
  })

  it.each([
    '0912 345 678',
    '0912.345.678',
    '0912-345-678',
    '+84 912 345 678',
    '0292 000 0001',
  ])('accepts the Vietnamese phone format %s', (phone) => {
    const result = validateBranchForm({ ...branchToForm(branch), phone: `  ${phone}  ` })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe(phone)
  })

  it('distinguishes required and invalid Vietnamese phone errors', () => {
    const empty = validateBranchForm({ ...branchToForm(branch), phone: '   ' })
    expect(empty.success).toBe(false)
    if (!empty.success) {
      expect(empty.error.issues.find((issue) => issue.path[0] === 'phone')?.message)
        .toBe('Số điện thoại là bắt buộc.')
    }

    for (const phone of ['84123456789', '0912_345_678', '+84 123', '09abc45678']) {
      const invalid = validateBranchForm({ ...branchToForm(branch), phone })
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error.issues.find((issue) => issue.path[0] === 'phone')?.message)
          .toBe('Số điện thoại không đúng định dạng Việt Nam.')
      }
    }
  })

  it('maps only contract fields into an exact create payload', () => {
    const result = validateBranchForm(branchToForm(branch))
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(toCreatePayload(result.data)).toEqual({
      code: branch.code,
      name: branch.name,
      phone: branch.phone,
      province: branch.province,
      ward: branch.ward,
      address: branch.address,
      latitude: branch.latitude,
      longitude: branch.longitude,
      isActive: true,
    })
    expect(toCreatePayload(result.data)).not.toHaveProperty('email')
    expect(toCreatePayload(result.data)).not.toHaveProperty('district')
    expect(toCreatePayload(result.data)).toHaveProperty('isActive', true)
  })

  it('accepts manual addresses without coordinates and enforces coordinate pairs and bounds', () => {
    const form = branchToForm(branch)
    form.latitude = null
    form.longitude = null
    const manualResult = validateBranchForm(form)
    expect(manualResult.success).toBe(true)
    if (manualResult.success) {
      expect(toCreatePayload(manualResult.data)).toMatchObject({
        province: branch.province,
        ward: branch.ward,
        address: branch.address,
        latitude: null,
        longitude: null,
      })
    }

    form.longitude = branch.longitude
    expect(validateBranchForm(form).success).toBe(false)
    form.latitude = 91
    expect(validateBranchForm(form).success).toBe(false)
    form.latitude = 0
    form.longitude = 0
    expect(validateBranchForm(form).success).toBe(false)
  })

  it('uses Vietnamese location errors and never mutates code in the update payload', () => {
    const form = branchToForm(branch)
    form.latitude = null
    const invalid = validateBranchForm(form)
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe('Vui lòng nhập đầy đủ vĩ độ và kinh độ.')
    }

    const valid = validateBranchForm(branchToForm(branch))
    expect(valid.success).toBe(true)
    if (!valid.success) return
    expect(toUpdatePayload(valid.data)).not.toHaveProperty('code')
    expect(toUpdatePayload(valid.data)).toHaveProperty('isActive', true)
  })

  it('does not change committed form fields until a location is explicitly applied', () => {
    const form = branchToForm(branch)
    const candidate = {
      latitude: 10.1,
      longitude: 106.1,
      province: 'Thành phố Hồ Chí Minh',
      ward: 'Phường Bến Thành',
      address: '1 Lê Lợi',
      displayAddress: '1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh',
    }
    expect(form.latitude).toBe(branch.latitude)
    applyLocation(form, candidate)
    expect(formToLocation(form)).toEqual(candidate)
  })
})
