import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ permissionsList: vi.fn() }))
vi.mock('@/api/generated/endpoints/permissions/permissions', () => ({
  permissionsList: mocks.permissionsList,
  permissionsGet: vi.fn(),
  permissionsCreate: vi.fn(),
  permissionsUpdate: vi.fn(),
  permissionsRemove: vi.fn(),
}))

import { listPermissionCatalog } from './permission-api'

describe('permission catalog loader', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches every page sequentially using authoritative meta', async () => {
    mocks.permissionsList
      .mockResolvedValueOnce({ data: [{ id: 'p1' }], meta: { page: 1, lastPage: 2, hasNextPage: true } })
      .mockResolvedValueOnce({ data: [{ id: 'p2' }], meta: { page: 2, lastPage: 2, hasNextPage: false } })

    await expect(listPermissionCatalog()).resolves.toEqual([{ id: 'p1' }, { id: 'p2' }])
    expect(mocks.permissionsList).toHaveBeenNthCalledWith(
      1,
      { page: 1, limit: 100, sortBy: 'code', sortOrder: 'asc' },
      undefined,
      undefined,
    )
    expect(mocks.permissionsList).toHaveBeenNthCalledWith(
      2,
      { page: 2, limit: 100, sortBy: 'code', sortOrder: 'asc' },
      undefined,
      undefined,
    )
  })
})
