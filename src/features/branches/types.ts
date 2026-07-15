import type { BranchResponseDto } from '@/api/generated/models'

export interface BranchLocation {
  latitude: number
  longitude: number
  province: string | null
  ward: string | null
  address: string
  displayAddress: string
}

export interface BranchFormState {
  code: string
  name: string
  phone: string
  province: string
  ward: string
  address: string
  latitude: number | null
  longitude: number | null
  isActive: boolean
}

export type BranchFormMode = 'create' | 'update'
export type Branch = BranchResponseDto

export interface VietnamProvince {
  code: number
  name: string
  codename: string
  divisionType: string
}

export interface VietnamWard {
  code: number
  name: string
  codename: string
  divisionType: string
  provinceCode: number
}

export interface AdministrativeUnitOption {
  code: number
  name: string
}
