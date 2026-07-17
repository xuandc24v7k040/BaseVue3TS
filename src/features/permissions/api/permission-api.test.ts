import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ permissionsList: vi.fn(), permissionsGet: vi.fn() }))
vi.mock('@/api/generated/endpoints/permissions/permissions', () => ({
  permissionsList: mocks.permissionsList, permissionsGet: mocks.permissionsGet,
  permissionsCreate: vi.fn(), permissionsUpdate: vi.fn(), permissionsRemove: vi.fn(),
}))
import { getPermission, listPermissions } from './permission-api'

describe('permission API wrapper', () => {
  beforeEach(() => vi.clearAllMocks())
  it('keeps the global catalog free of synthetic branch headers', async () => {
    const params = { page: 2, limit: 20, resource: 'roles', sortBy: 'createdAt' as const, sortOrder: 'desc' as const }
    await listPermissions(params); await getPermission('01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T')
    expect(mocks.permissionsList).toHaveBeenCalledWith(params, undefined, undefined)
    expect(mocks.permissionsGet).toHaveBeenCalledWith('01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T', undefined, undefined)
  })
})
