import { describe, expect, it } from 'vitest'
import { toUserListParams } from './user-list-query.adapter'

describe('toUserListParams', () => {
  it('composes server-side search, filters, pagination and supported sorting', () => {
    expect(toUserListParams({
      page: 3,
      pageSize: 20,
      search: { value: '  an@example.com  ', columnIds: ['fullName', 'email', 'phone'] },
      filters: [
        { id: 'type', operator: 'in', value: ['CUSTOMER'] },
        { id: 'provider', operator: 'in', value: ['LOCAL'] },
        { id: 'isActive', operator: 'in', value: ['false'] },
      ],
      sort: [{ id: 'lastLoginAt', desc: false }],
    })).toEqual({
      page: 3,
      limit: 20,
      search: 'an@example.com',
      type: 'CUSTOMER',
      provider: 'LOCAL',
      isActive: false,
      sortBy: 'lastLoginAt',
      sortOrder: 'asc',
    })
  })

  it('falls back to stable createdAt descending for an unsupported column', () => {
    expect(toUserListParams({ page: 1, pageSize: 10, sort: [{ id: 'actions', desc: false }] }))
      .toMatchObject({ sortBy: 'createdAt', sortOrder: 'desc' })
  })
})
