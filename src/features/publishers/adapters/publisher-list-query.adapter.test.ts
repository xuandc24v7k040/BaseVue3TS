import { describe, expect, it } from 'vitest'
import { toPublisherListParams } from './publisher-list-query.adapter'

describe('toPublisherListParams', () => {
  it('maps the real usageCount column filter to usageStatus API params', () => {
    expect(
      toPublisherListParams({
        page: 3,
        pageSize: 20,
        filters: [{ id: 'usageCount', value: ['USED'], operator: 'in' }],
      }),
    ).toMatchObject({
      page: 3,
      limit: 20,
      usageStatus: 'USED',
    })
  })
})
