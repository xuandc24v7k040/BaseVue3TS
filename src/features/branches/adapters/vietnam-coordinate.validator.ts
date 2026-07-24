import { findUniqueAdministrativeUnit } from './administrative-unit.adapter'
import type { BranchLocation, VietnamProvince, VietnamWard } from '../types'

export type CoordinateInputResult =
  | { valid: true; coordinate: { latitude: number; longitude: number } }
  | { valid: false; message: string }

export type VietnamLocationVerification =
  | { status: 'idle' | 'pending' | 'valid'; message?: undefined }
  | {
      status: 'invalid' | 'network-error'
      code:
        | 'BRANCH_LOCATION_OUTSIDE_VIETNAM'
        | 'BRANCH_LOCATION_ADMIN_MAPPING_INVALID'
        | 'VIETMAP_PROVIDER_UNAVAILABLE'
      message: string
    }

export function parseBranchCoordinates(latitudeValue: string, longitudeValue: string): CoordinateInputResult {
  const latitudeText = latitudeValue.trim()
  const longitudeText = longitudeValue.trim()
  if (!latitudeText || !longitudeText) {
    return { valid: false, message: 'Vui lòng nhập đầy đủ vĩ độ và kinh độ.' }
  }

  const latitude = Number(latitudeText)
  const longitude = Number(longitudeText)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { valid: false, message: 'Vĩ độ phải nằm trong khoảng -90 đến 90.' }
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { valid: false, message: 'Kinh độ phải nằm trong khoảng -180 đến 180.' }
  }
  if (latitude === 0 && longitude === 0) {
    return {
      valid: false,
      message: 'Tọa độ 0, 0 không phải vị trí hợp lệ của chi nhánh tại Việt Nam.',
    }
  }
  return { valid: true, coordinate: { latitude, longitude } }
}

export async function verifyVietnamAdministrativeLocation(
  location: BranchLocation,
  loadProvinces: () => Promise<VietnamProvince[]>,
  loadWards: (provinceCode: number) => Promise<VietnamWard[]>,
): Promise<VietnamLocationVerification> {
  if (!location.province?.trim() || !location.ward?.trim()) {
    return {
      status: 'invalid',
      code:
        location.countryCode && location.countryCode !== 'VN'
          ? 'BRANCH_LOCATION_OUTSIDE_VIETNAM'
          : 'BRANCH_LOCATION_ADMIN_MAPPING_INVALID',
      message:
        location.countryCode && location.countryCode !== 'VN'
          ? 'Vị trí đã chọn nằm ngoài lãnh thổ Việt Nam.'
          : 'Đã nhận diện vị trí tại Việt Nam nhưng chưa thể đối chiếu đơn vị hành chính. Vui lòng kiểm tra hoặc chọn lại địa chỉ.',
    }
  }

  const province = findUniqueAdministrativeUnit(await loadProvinces(), location.province)
  if (!province) {
    return {
      status: 'invalid',
      code:
        location.countryCode && location.countryCode !== 'VN'
          ? 'BRANCH_LOCATION_OUTSIDE_VIETNAM'
          : 'BRANCH_LOCATION_ADMIN_MAPPING_INVALID',
      message:
        location.countryCode && location.countryCode !== 'VN'
          ? 'Vị trí đã chọn nằm ngoài lãnh thổ Việt Nam.'
          : 'Đã nhận diện vị trí tại Việt Nam nhưng chưa thể đối chiếu đơn vị hành chính. Vui lòng kiểm tra hoặc chọn lại địa chỉ.',
    }
  }

  const ward = findUniqueAdministrativeUnit(await loadWards(province.code), location.ward)
  if (!ward || ward.provinceCode !== province.code) {
    return {
      status: 'invalid',
      code: 'BRANCH_LOCATION_ADMIN_MAPPING_INVALID',
      message: 'Đã nhận diện vị trí tại Việt Nam nhưng chưa thể đối chiếu đơn vị hành chính. Vui lòng kiểm tra hoặc chọn lại địa chỉ.',
    }
  }

  return { status: 'valid' }
}
