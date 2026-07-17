import { describe, expect, it } from 'vitest'
import { toPermissionListParams } from './permission-list-query.adapter'

describe('permission list query adapter', () => {
  it('maps URL/table state to exact server query params', () => {
    expect(toPermissionListParams({
      page: 2, pageSize: 20, search: { value: '  role  ', columnIds: ['code'] },
      filters: [
        { id: 'resource', value: ['roles'], operator: 'in' },
        { id: 'action', value: ['read'], operator: 'in' },
        { id: 'createdAt', value: { start: '2026-07-01', end: '2026-07-02' }, operator: 'between' },
      ],
      sort: [{ id: 'name', desc: false }],
    })).toEqual({
      page: 2, limit: 20, search: 'role', resource: 'roles', action: 'read',
      createdFrom: '2026-07-01', createdTo: '2026-07-02', sortBy: 'name', sortOrder: 'asc',
    })
  })

  it('falls back to the backend default sort', () => {
    expect(toPermissionListParams({ page: 1, pageSize: 10, sort: [{ id: 'usageCount', desc: false }] }))
      .toMatchObject({ sortBy: 'createdAt', sortOrder: 'desc' })
  })
})
