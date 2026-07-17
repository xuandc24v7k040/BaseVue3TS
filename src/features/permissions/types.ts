import type { PermissionDetailResponseDto, PermissionResponseDto } from '@/api/generated/models'

export type Permission = PermissionResponseDto
export type PermissionDetail = PermissionDetailResponseDto
export type PermissionFormMode = 'create' | 'update'

export interface PermissionFormState {
  code: string
  name: string
  resource: string
  action: string
  guardName: string
  description: string
}
