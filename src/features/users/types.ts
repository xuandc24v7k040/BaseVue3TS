import type { UserResponseDto } from '@/api/generated/models'

export type User = UserResponseDto
export type UserFormMode = 'create' | 'update'

export interface UserFormState {
  fullName: string
  email: string
  phone: string
  gender: string
  birthday: string
}
