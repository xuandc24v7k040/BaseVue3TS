import { describe, expect, it, vi } from 'vitest'
import { parseBranchCoordinates, verifyVietnamAdministrativeLocation } from './vietnam-coordinate.validator'

const provinces = [
  { code: 1, name: 'Thành phố Hà Nội', codename: 'ha_noi', divisionType: 'thành phố trung ương' },
  { code: 92, name: 'Thành phố Cần Thơ', codename: 'can_tho', divisionType: 'thành phố trung ương' },
]
const wards = {
  1: [{ code: 101, name: 'Phường Hoàn Kiếm', codename: 'hoan_kiem', divisionType: 'phường', provinceCode: 1 }],
  92: [
    { code: 9201, name: 'Phường Ninh Kiều', codename: 'ninh_kieu', divisionType: 'phường', provinceCode: 92 },
    { code: 31473, name: 'Phường Long Bình', codename: 'long_binh', divisionType: 'phường', provinceCode: 92 },
  ],
}

const loadProvinces = vi.fn(async () => provinces)
const loadWards = vi.fn(async (provinceCode: number) => wards[provinceCode as keyof typeof wards] ?? [])

function location(province: string | null, ward: string | null, countryCode: string | null = 'VN') {
  return {
    latitude: 10.0452,
    longitude: 105.7469,
    countryCode,
    province,
    ward,
    address: 'Địa chỉ',
    displayAddress: 'Địa chỉ nhận diện',
  }
}

describe('Vietnam coordinate validation', () => {
  it.each([
    ['10.0452', '105.7469'],
    ['21.0285', '105.8542'],
  ])('accepts valid Vietnam numeric coordinates %s,%s', (latitude, longitude) => {
    expect(parseBranchCoordinates(latitude, longitude).valid).toBe(true)
  })

  it.each([
    ['', '105.7469', 'Vui lòng nhập đầy đủ vĩ độ và kinh độ.'],
    ['10.0452', '', 'Vui lòng nhập đầy đủ vĩ độ và kinh độ.'],
    ['0', '0', 'Tọa độ 0, 0 không phải vị trí hợp lệ của chi nhánh tại Việt Nam.'],
    ['91', '105', 'Vĩ độ phải nằm trong khoảng -90 đến 90.'],
    ['10', '181', 'Kinh độ phải nằm trong khoảng -180 đến 180.'],
  ])('rejects invalid input %s,%s', (latitude, longitude, message) => {
    expect(parseBranchCoordinates(latitude, longitude)).toEqual({ valid: false, message })
  })

  it.each([
    ['Thành phố Cần Thơ', 'Phường Ninh Kiều'],
    ['Thành phố Cần Thơ', 'Phường Long Bình'],
    ['Thành phố Hà Nội', 'Phường Hoàn Kiếm'],
  ])('accepts a matched official province/ward pair', async (province, ward) => {
    await expect(verifyVietnamAdministrativeLocation(
      location(province, ward),
      loadProvinces,
      loadWards,
    )).resolves.toEqual({ status: 'valid' })
  })

  it('blocks locations outside Vietnam or with a ward outside the matched province', async () => {
    await expect(verifyVietnamAdministrativeLocation(
      location('Phnom Penh', 'Chamkar Mon', 'KH'),
      loadProvinces,
      loadWards,
    )).resolves.toMatchObject({
      status: 'invalid',
      code: 'BRANCH_LOCATION_OUTSIDE_VIETNAM',
      message: 'Vị trí đã chọn nằm ngoài lãnh thổ Việt Nam.',
    })

    await expect(verifyVietnamAdministrativeLocation(
      location('Thành phố Cần Thơ', 'Phường Hoàn Kiếm'),
      loadProvinces,
      loadWards,
    )).resolves.toMatchObject({ status: 'invalid' })
  })

  it('blocks sea/unresolved results without administrative units', async () => {
    await expect(verifyVietnamAdministrativeLocation(
      location(null, null, null),
      loadProvinces,
      loadWards,
    )).resolves.toEqual({
      status: 'invalid',
      code: 'BRANCH_LOCATION_ADMIN_MAPPING_INVALID',
      message: 'Đã nhận diện vị trí tại Việt Nam nhưng chưa thể đối chiếu đơn vị hành chính. Vui lòng kiểm tra hoặc chọn lại địa chỉ.',
    })
  })

  it('keeps network failures distinct from invalid locations', async () => {
    await expect(verifyVietnamAdministrativeLocation(
      location('Thành phố Cần Thơ', 'Phường Ninh Kiều'),
      async () => { throw new Error('network') },
      loadWards,
    )).rejects.toThrow('network')
  })
})
