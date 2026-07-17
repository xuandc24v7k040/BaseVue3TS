import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rolesList: vi.fn(), rolesGet: vi.fn() }))
vi.mock('@/api/generated/endpoints/roles/roles', () => ({
  rolesList: mocks.rolesList,
  rolesGet: mocks.rolesGet,
  rolesCreate: vi.fn(),
  rolesUpdate: vi.fn(),
  rolesDeactivate: vi.fn(),
}))

import { getRole, listRoles } from './role-api'

describe('role API wrapper', () => {
  beforeEach(() => vi.clearAllMocks())

  it('never sends a synthetic branch header for the global catalog', async () => {
    const params = { page: 2, limit: 20, isActive: false, sortBy: 'createdAt' as const, sortOrder: 'desc' as const }
    await listRoles(params)
    await getRole('01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T')
    expect(mocks.rolesList).toHaveBeenCalledWith(params, undefined, undefined)
    expect(mocks.rolesGet).toHaveBeenCalledWith('01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T', undefined, undefined)
  })
})
