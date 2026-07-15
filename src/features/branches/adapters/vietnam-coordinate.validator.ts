import { findUniqueAdministrativeUnit } from './administrative-unit.adapter'
import type { BranchLocation, VietnamProvince, VietnamWard } from '../types'

export type CoordinateInputResult =
  | { valid: true; coordinate: { latitude: number; longitude: number } }
  | { valid: false; message: string }

export type VietnamLocationVerification =
  | { status: 'idle' | 'pending' | 'valid'; message?: undefined }
  | { status: 'invalid' | 'network-error'; message: string }

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
      message: 'Không thể xác minh vị trí này thuộc một đơn vị hành chính của Việt Nam. Vui lòng chọn lại vị trí.',
    }
  }

  const province = findUniqueAdministrativeUnit(await loadProvinces(), location.province)
  if (!province) {
    return {
      status: 'invalid',
      message: 'Vị trí đã chọn nằm ngoài lãnh thổ Việt Nam hoặc không xác định được đơn vị hành chính hợp lệ.',
    }
  }

  const ward = findUniqueAdministrativeUnit(await loadWards(province.code), location.ward)
  if (!ward || ward.provinceCode !== province.code) {
    return {
      status: 'invalid',
      message: 'Vị trí đã chọn nằm ngoài lãnh thổ Việt Nam hoặc không xác định được đơn vị hành chính hợp lệ.',
    }
  }

  return { status: 'valid' }
}
