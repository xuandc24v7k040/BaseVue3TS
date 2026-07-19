import type { CreateUserDto, UpdateUserDto } from '@/api/generated/models'
import type { User, UserFormState } from '../types'
import type { UserFormData } from '../schemas/user-form.schema'

export function emptyUserForm(): UserFormState {
  return { fullName: '', email: '', phone: '', gender: '', birthday: '' }
}

export function userToForm(user: User): UserFormState {
  return {
    fullName: user.fullName ?? '',
    email: user.email,
    phone: user.phone ?? '',
    gender: user.gender ?? '',
    birthday: user.birthday ?? '',
  }
}

function nullable(value: string): string | null {
  const normalized = value.trim()
  return normalized || null
}

export function toCreateUserPayload(value: UserFormData): CreateUserDto {
  return {
    fullName: value.fullName,
    email: value.email.toLowerCase(),
    phone: nullable(value.phone),
    gender: nullable(value.gender),
    birthday: nullable(value.birthday),
  }
}

export function toUpdateUserPayload(value: UserFormData): UpdateUserDto {
  return {
    fullName: value.fullName,
    email: value.email.toLowerCase(),
    phone: nullable(value.phone),
    gender: nullable(value.gender),
    birthday: nullable(value.birthday),
  }
}
