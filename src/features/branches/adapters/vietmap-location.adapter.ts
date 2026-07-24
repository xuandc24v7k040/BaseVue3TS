import type { VietMapLocationResponseDto } from '@/api/generated/models'
import type { BranchLocation } from '../types'

export function toBranchLocation(value: VietMapLocationResponseDto): BranchLocation {
  return {
    latitude: Number(value.latitude),
    longitude: Number(value.longitude),
    countryCode: value.countryCode?.trim().toUpperCase() || null,
    province: value.province?.trim() || null,
    ward: value.ward?.trim() || null,
    address: value.address.trim(),
    displayAddress: value.displayAddress.trim(),
  }
}
