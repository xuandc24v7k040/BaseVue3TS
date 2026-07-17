import { describe, expect, it } from 'vitest'
import { toRoleListParams } from './role-list-query.adapter'

describe('role list query adapter', () => {
  it('maps pagination, search, filters, date and sorting to server params', () => {
    expect(toRoleListParams({
      page: 3,
      pageSize: 20,
      search: { value: '  SALE  ', columnIds: ['code', 'name'] },
      filters: [
        { id: 'type', value: ['BRANCH'], operator: 'in' },
        { id: 'isActive', value: ['false'], operator: 'in' },
        { id: 'isSystem', value: ['false'], operator: 'in' },
        { id: 'createdAt', value: { start: '2026-07-01', end: '2026-07-15' }, operator: 'between' },
      ],
      sort: [{ id: 'level', desc: false }],
    })).toEqual({
      page: 3, limit: 20, search: 'SALE', type: 'BRANCH', isActive: false,
      isSystem: false, createdFrom: '2026-07-01', createdTo: '2026-07-15',
      sortBy: 'level', sortOrder: 'asc',
    })
  })

  it('falls back to the authoritative default and drops unsupported values', () => {
    expect(toRoleListParams({
      page: 1, pageSize: 10,
      filters: [{ id: 'type', value: ['UNKNOWN'], operator: 'in' }],
      sort: [{ id: 'permissionCount', desc: false }],
    })).toEqual({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
  })
})
