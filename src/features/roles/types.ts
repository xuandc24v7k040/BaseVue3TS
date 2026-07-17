import type { RoleDetailResponseDto, RoleResponseDto } from '@/api/generated/models'

export type Role = RoleResponseDto
export type RoleDetail = RoleDetailResponseDto
export type RoleFormMode = 'create' | 'update'

export interface RoleFormState {
  code: string
  name: string
  description: string
  type: Role['type']
  level: string | number
  guardName: string
}
