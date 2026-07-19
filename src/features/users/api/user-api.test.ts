import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  usersActivate,
  usersCreate,
  usersFindAll,
  usersFindOne,
  usersRemove,
  usersUpdate,
} from '@/api/generated/endpoints/users/users'
import { activateUser, createUser, disableUser, getUser, listUsers, updateUser } from './user-api'

vi.mock('@/api/generated/endpoints/users/users', () => ({
  usersActivate: vi.fn(),
  usersCreate: vi.fn(),
  usersFindAll: vi.fn(),
  usersFindOne: vi.fn(),
  usersRemove: vi.fn(),
  usersUpdate: vi.fn(),
}))

describe('Users global API wrapper', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not attach branch-scoped request options to list or detail', () => {
    const signal = new AbortController().signal
    listUsers({ page: 2, limit: 20 }, signal)
    getUser('01JVCY8VZ10XWBQ9M3B0EG9D7K', signal)

    expect(usersFindAll).toHaveBeenCalledWith({ page: 2, limit: 20 }, undefined, signal)
    expect(usersFindOne).toHaveBeenCalledWith('01JVCY8VZ10XWBQ9M3B0EG9D7K', undefined, signal)
  })

  it('uses only the generated Users operations for lifecycle mutations', () => {
    createUser({ fullName: 'Khách hàng', email: 'customer@example.com' })
    updateUser('user-id', { fullName: 'Tên mới' })
    disableUser('user-id')
    activateUser('user-id')

    expect(usersCreate).toHaveBeenCalledWith({ fullName: 'Khách hàng', email: 'customer@example.com' })
    expect(usersUpdate).toHaveBeenCalledWith('user-id', { fullName: 'Tên mới' })
    expect(usersRemove).toHaveBeenCalledWith('user-id')
    expect(usersActivate).toHaveBeenCalledWith('user-id')
  })
})
