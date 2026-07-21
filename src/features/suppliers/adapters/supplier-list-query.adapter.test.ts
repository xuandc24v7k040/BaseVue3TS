import { describe, expect, it } from 'vitest'
import { toSupplierListParams } from './supplier-list-query.adapter'

describe('toSupplierListParams', () => {
  it('maps supplier filters, date range and sorting', () => {
    expect(
      toSupplierListParams({
        page: 2,
        pageSize: 25,
        search: { value: '  Alpha  ', columnIds: ['name'] },
        filters: [
          { id: 'usageCount', value: ['UNUSED'], operator: 'in' },
          { id: 'phone', value: ['true'], operator: 'in' },
          { id: 'email', value: ['false'], operator: 'in' },
          {
            id: 'createdAt',
            value: { start: '2026-07-01', end: '2026-07-20' },
            operator: 'between',
          },
        ],
        sort: [{ id: 'name', desc: false }],
      }),
    ).toEqual({
      page: 2,
      limit: 25,
      search: 'Alpha',
      usageStatus: 'UNUSED',
      hasPhone: true,
      hasEmail: false,
      createdFrom: '2026-07-01',
      createdTo: '2026-07-20',
      sortBy: 'name',
      sortOrder: 'asc',
    })
  })
})
