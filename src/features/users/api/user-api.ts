import type { CreateUserDto, UpdateUserDto, UsersFindAllParams } from '@/api/generated/models'
import {
  usersActivate,
  usersCreate,
  usersFindAll,
  usersFindOne,
  usersRemove,
  usersUpdate,
} from '@/api/generated/endpoints/users/users'

export function listUsers(params: UsersFindAllParams, signal?: AbortSignal) {
  return usersFindAll(params, undefined, signal)
}

export function getUser(id: string, signal?: AbortSignal) {
  return usersFindOne(id, undefined, signal)
}

export function createUser(payload: CreateUserDto) {
  return usersCreate(payload)
}

export function updateUser(id: string, payload: UpdateUserDto) {
  return usersUpdate(id, payload)
}

export function disableUser(id: string) {
  return usersRemove(id)
}

export function activateUser(id: string) {
  return usersActivate(id)
}
