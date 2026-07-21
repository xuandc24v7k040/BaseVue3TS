import { describe, expect, it } from 'vitest'
import { toProductAttributeListParams } from './product-attribute-list-query.adapter'

describe('toProductAttributeListParams', () => {
  it('maps type and usage filters to the generated API contract', () => {
    expect(
      toProductAttributeListParams({
        page: 1,
        pageSize: 10,
        filters: [
          { id: 'type', value: ['MULTI_SELECT'], operator: 'in' },
          { id: 'usageCount', value: ['USED'], operator: 'in' },
        ],
        sort: [{ id: 'usageCount', desc: true }],
      }),
    ).toEqual({
      page: 1,
      limit: 10,
      type: 'MULTI_SELECT',
      usageStatus: 'USED',
      sortBy: 'usageCount',
      sortOrder: 'desc',
    })
  })
})
