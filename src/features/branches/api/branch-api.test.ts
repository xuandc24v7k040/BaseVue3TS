import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  branchesList: vi.fn(),
  branchesGet: vi.fn(),
}))

vi.mock('@/api/generated/endpoints/branches/branches', () => ({
  branchesList: mocks.branchesList,
  branchesGet: mocks.branchesGet,
  branchesCreate: vi.fn(),
  branchesUpdate: vi.fn(),
  branchesDeactivate: vi.fn(),
}))
vi.mock('@/api/generated/endpoints/vietmap/vietmap', () => ({
  vietMapReverse: vi.fn(),
  vietMapAutocomplete: vi.fn(),
  vietMapPlace: vi.fn(),
}))

import { getBranch, listBranches } from './branch-api'

describe('branch API wrapper scope', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not send a synthetic header for global scope', async () => {
    await listBranches({
      page: 2,
      limit: 20,
      search: 'CT',
      isActive: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }, null)
    expect(mocks.branchesList).toHaveBeenCalledWith(
      {
        page: 2,
        limit: 20,
        search: 'CT',
        isActive: false,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      undefined,
      undefined,
    )
  })

  it('uses the real selected branch id for optional scoped reads', async () => {
    await getBranch('branch-id', 'selected-branch')
    expect(mocks.branchesGet).toHaveBeenCalledWith(
      'branch-id',
      { headers: { 'X-Branch-Id': 'selected-branch' } },
      undefined,
    )
  })
})
