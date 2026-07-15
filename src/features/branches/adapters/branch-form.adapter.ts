import type { BranchResponseDto, CreateBranchDto, UpdateBranchDto } from '@/api/generated/models'
import { branchFormSchema, type BranchFormPayload } from '../schemas/branch-form.schema'
import type { BranchFormState, BranchLocation } from '../types'

export function emptyBranchForm(): BranchFormState {
  return {
    code: '',
    name: '',
    phone: '',
    province: '',
    ward: '',
    address: '',
    latitude: null,
    longitude: null,
    isActive: true,
  }
}

export function branchToForm(branch: BranchResponseDto): BranchFormState {
  return {
    code: branch.code,
    name: branch.name,
    phone: branch.phone ?? '',
    province: branch.province ?? '',
    ward: branch.ward ?? '',
    address: branch.address,
    latitude: branch.latitude,
    longitude: branch.longitude,
    isActive: branch.isActive,
  }
}

export function formToLocation(form: BranchFormState): BranchLocation | null {
  if (form.latitude === null || form.longitude === null) return null
  const displayAddress = [form.address, form.ward, form.province]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
  return {
    latitude: form.latitude,
    longitude: form.longitude,
    province: form.province.trim() || null,
    ward: form.ward.trim() || null,
    address: form.address.trim(),
    displayAddress,
  }
}

export function applyLocation(form: BranchFormState, location: BranchLocation): void {
  form.latitude = location.latitude
  form.longitude = location.longitude
  form.province = location.province ?? ''
  form.ward = location.ward ?? ''
  form.address = location.address
}

export function validateBranchForm(form: BranchFormState) {
  return branchFormSchema.safeParse({
    code: form.code,
    name: form.name,
    phone: form.phone,
    province: form.province,
    ward: form.ward,
    address: form.address,
    latitude: form.latitude,
    longitude: form.longitude,
    isActive: form.isActive,
  })
}

export function toCreatePayload(payload: BranchFormPayload): CreateBranchDto {
  return { ...payload }
}

export function toUpdatePayload(payload: BranchFormPayload): UpdateBranchDto {
  return {
    name: payload.name,
    phone: payload.phone,
    province: payload.province,
    ward: payload.ward,
    address: payload.address,
    latitude: payload.latitude,
    longitude: payload.longitude,
    isActive: payload.isActive,
  }
}
