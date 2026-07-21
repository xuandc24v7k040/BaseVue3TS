import { describe, expect, it } from 'vitest'
import { toAuthorListParams } from './author-list-query.adapter'

describe('toAuthorListParams', () => {
  it('maps the real usageCount column filter to usageStatus API params', () => {
    expect(
      toAuthorListParams({
        page: 2,
        pageSize: 50,
        filters: [{ id: 'usageCount', value: ['UNUSED'], operator: 'in' }],
      }),
    ).toMatchObject({
      page: 2,
      limit: 50,
      usageStatus: 'UNUSED',
    })
  })
})
