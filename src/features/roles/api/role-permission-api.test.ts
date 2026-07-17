import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  assign: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@/api/generated/endpoints/roles/roles', () => ({
  rolesPermissions: mocks.list,
  rolesAssignPermission: mocks.assign,
  rolesRemovePermission: mocks.remove,
}))

import {
  assignRolePermission,
  listRolePermissions,
  removeRolePermission,
} from './role-permission-api'

describe('role permission API wrapper', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses global generated operations without branch request options', async () => {
    await listRolePermissions('role-id')
    await assignRolePermission('role-id', 'permission-id')
    await removeRolePermission('role-id', 'permission-id')
    expect(mocks.list).toHaveBeenCalledWith('role-id', undefined, undefined)
    expect(mocks.assign).toHaveBeenCalledWith('role-id', 'permission-id')
    expect(mocks.remove).toHaveBeenCalledWith('role-id', 'permission-id')
  })
})
