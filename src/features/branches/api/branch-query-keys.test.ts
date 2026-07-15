import { describe, expect, it } from 'vitest'
import { branchKeys } from './branch-query-keys'

describe('branch query keys', () => {
  it('separates global and selected-branch caches', () => {
    const params = {
      page: 1,
      limit: 10,
      search: 'can tho',
      isActive: true,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
      createdFrom: '2026-06-01',
      createdTo: '2026-06-30',
    }
    expect(branchKeys.list(null, params)).not.toEqual(
      branchKeys.list('01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T', params),
    )
    expect(branchKeys.detail(null, 'branch')).not.toEqual(
      branchKeys.detail('selected', 'branch'),
    )
    expect(branchKeys.list(null, params)).not.toEqual(
      branchKeys.list(null, { ...params, isActive: false }),
    )
    expect(branchKeys.list(null, params)).not.toEqual(
      branchKeys.list(null, { ...params, createdTo: '2026-07-01' }),
    )
  })
})
