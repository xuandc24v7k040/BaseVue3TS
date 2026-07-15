import { describe, expect, it } from 'vitest'
import { toBranchListParams } from './branch-list-query.adapter'

describe('branch list query adapter', () => {
  it('maps server pagination, status and sorting without client filtering', () => {
    expect(toBranchListParams({
      page: 3,
      pageSize: 20,
      search: { value: '  CT  ', columnIds: ['code', 'name'] },
      filters: [
        { id: 'isActive', value: ['false'], operator: 'in' },
        { id: 'createdAt', value: { start: '2026-06-01', end: '2026-06-30' }, operator: 'between' },
      ],
      sort: [{ id: 'createdAt', desc: true }],
    })).toEqual({
      page: 3,
      limit: 20,
      search: 'CT',
      isActive: false,
      createdFrom: '2026-06-01',
      createdTo: '2026-06-30',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  })

  it('omits the all-status filter and rejects unsupported sorting', () => {
    expect(toBranchListParams({
      page: 1,
      pageSize: 10,
      filters: [],
      sort: [{ id: 'phone', desc: true }],
    })).toEqual({ page: 1, limit: 10, sortBy: 'code', sortOrder: 'desc' })
  })

  it('keeps the default code sorting descending when sorting is cleared', () => {
    expect(toBranchListParams({ page: 1, pageSize: 10, filters: [], sort: [] })).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'code',
      sortOrder: 'desc',
    })
  })

  it.each([
    [{ start: '2026-06-01' }, { createdFrom: '2026-06-01' }],
    [{ end: '2026-06-30' }, { createdTo: '2026-06-30' }],
  ])('supports one-sided created date ranges', (value, expected) => {
    expect(toBranchListParams({
      page: 1,
      pageSize: 10,
      filters: [{ id: 'createdAt', value, operator: 'between' }],
    })).toMatchObject(expected)
  })
})
