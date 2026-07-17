import { describe, expect, it } from 'vitest'
import { roleKeys } from './role-query-keys'

describe('role query keys', () => {
  it('are global and separate list/detail invalidation scopes', () => {
    const params = { page: 1, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const }
    expect(roleKeys.list(params)).toEqual(['role-management', 'list', params])
    expect(roleKeys.detail('role-id')).toEqual(['role-management', 'detail', 'role-id'])
    expect(roleKeys.list(params)).not.toContain('system')
  })
})
