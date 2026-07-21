import { describe, expect, it } from 'vitest'
import { toProductListParams } from './product-list-query.adapter'

describe('toProductListParams', () => {
  it('maps server paging, filters and stable sorting', () => {
    expect(toProductListParams({
      page: 2,
      pageSize: 25,
      search: { value: '  clean code  ', columnIds: ['name'] },
      sort: [{ id: 'name', desc: false }],
      filters: [
        { id: 'status', value: ['ACTIVE'], operator: 'in' },
        { id: 'categories', value: ['01K0000000000000000000000A'], operator: 'in' },
        { id: 'createdAt', value: { start: '2026-01-01', end: '2026-01-31' }, operator: 'between' },
      ],
    })).toMatchObject({
      page: 2, limit: 25, search: 'clean code', status: 'ACTIVE',
      categoryId: '01K0000000000000000000000A', createdFrom: '2026-01-01', createdTo: '2026-01-31',
      sortBy: 'name', sortOrder: 'asc',
    })
  })

  it('falls back to newest products for unsupported client sorting', () => {
    const params = toProductListParams({ page: 1, pageSize: 10, sort: [{ id: 'slug', desc: false }] })
    expect(params).toMatchObject({ sortBy: 'createdAt', sortOrder: 'desc' })
    expect(params).not.toHaveProperty('search')
  })
})
