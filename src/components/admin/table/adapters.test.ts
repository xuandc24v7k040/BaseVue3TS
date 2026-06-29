import { describe, expect, it } from 'vitest'
import type { DataTableQuery } from './interface'
import {
  normalizeDataTableDateRangeFilter,
  serializeDataTableFilters,
  serializeDataTableSort,
  toDataTableApiParams,
} from './adapters'

function baseQuery(overrides: Partial<DataTableQuery> = {}): DataTableQuery {
  return {
    page: 2,
    pageSize: 20,
    ...overrides,
  }
}

describe('toDataTableApiParams', () => {
  it('serializes pageBase 1 by default', () => {
    expect(toDataTableApiParams(baseQuery())).toEqual({
      page: 2,
      limit: 20,
    })
  })

  it('serializes pageBase 0', () => {
    expect(toDataTableApiParams(baseQuery(), { pageBase: 0 })).toEqual({
      page: 1,
      limit: 20,
    })
  })

  it('serializes csv sort and applies sortKeyMap', () => {
    const params = toDataTableApiParams(
      baseQuery({
        sort: [
          { id: 'name', desc: false },
          { id: 'createdAt', desc: true },
        ],
      }),
      {
        sortKeyMap: {
          createdAt: 'created_at',
        },
      },
    )

    expect(params.sort).toBe('name:asc,created_at:desc')
  })

  it('serializes filterKeyMap, arrays, booleans, numbers, and local date ranges', () => {
    const params = toDataTableApiParams(
      baseQuery({
        search: { value: 'abc', columnIds: ['name', 'email'] },
        filters: [
          { id: 'role', value: ['admin', 'manager'], operator: 'in' },
          { id: 'active', value: true, operator: 'equals' },
          { id: 'amount', value: 100, operator: 'gte' },
          {
            id: 'createdAt',
            value: { start: '2026-06-01', end: '2026-06-10' },
            operator: 'between',
          },
        ],
      }),
      {
        includeSearchBy: true,
        filterKeyMap: {
          role: 'roles',
          createdAt: 'created_at',
        },
      },
    )

    expect(params).toEqual({
      page: 2,
      limit: 20,
      search: 'abc',
      searchBy: ['name', 'email'],
      roles: ['admin', 'manager'],
      active: true,
      amount: 100,
      created_atFrom: '2026-06-01',
      created_atTo: '2026-06-10',
    })
  })

  it('skips empty filters by default', () => {
    const params = toDataTableApiParams(
      baseQuery({
        filters: [
          { id: 'name', value: '', operator: 'contains' },
          { id: 'role', value: [], operator: 'in' },
        ],
      }),
    )

    expect(params).toEqual({
      page: 2,
      limit: 20,
    })
  })

  it('uses global search metadata when query.search is absent', () => {
    expect(
      toDataTableApiParams(
        baseQuery({
          metadata: {
            globalSearch: {
              value: 'metadata-search',
              columnIds: ['name'],
            },
          },
        }),
        {
          includeSearchBy: true,
        },
      ),
    ).toEqual({
      page: 2,
      limit: 20,
      search: 'metadata-search',
      searchBy: ['name'],
    })
  })

  it('does not serialize empty search values', () => {
    expect(
      toDataTableApiParams(
        baseQuery({
          search: { value: '', columnIds: ['name'] },
        }),
        {
          includeSearchBy: true,
        },
      ),
    ).toEqual({
      page: 2,
      limit: 20,
    })
  })

  it('does not mutate input query', () => {
    const query = baseQuery({
      search: { value: 'abc', columnIds: ['name'] },
      sort: [{ id: 'createdAt', desc: true }],
      filters: [{ id: 'role', value: ['admin'], operator: 'in' }],
    })
    const before = JSON.stringify(query)

    toDataTableApiParams(query, {
      includeSearchBy: true,
      sortKeyMap: { createdAt: 'created_at' },
      filterKeyMap: { role: 'roles' },
    })

    expect(JSON.stringify(query)).toBe(before)
  })
})

describe('DataTable API adapter helpers', () => {
  it('supports array and object sort formats', () => {
    const sort: DataTableQuery['sort'] = [
      { id: 'name', desc: false },
      { id: 'createdAt', desc: true },
    ]

    expect(serializeDataTableSort(sort, { sortFormat: 'array' })).toEqual([
      'name:asc',
      'createdAt:desc',
    ])
    expect(serializeDataTableSort(sort, { sortFormat: 'object' })).toEqual({
      name: 'asc',
      createdAt: 'desc',
    })
  })

  it('serializes filters independently for custom adapters', () => {
    expect(
      serializeDataTableFilters(
        [
          { id: 'role', value: ['admin'], operator: 'in' },
          { id: 'active', value: false, operator: 'equals' },
        ],
        { filterKeyMap: { role: 'roles' } },
      ),
    ).toEqual({
      roles: ['admin'],
      active: false,
    })
  })

  it('keeps local date range values by default', () => {
    expect(
      normalizeDataTableDateRangeFilter({
        start: '2026-06-01T08:30',
        end: '2026-06-10T17:45',
      }),
    ).toEqual({
      from: '2026-06-01T08:30',
      to: '2026-06-10T17:45',
    })
  })

  it('converts local date ranges to ISO only when timezone is explicit', () => {
    expect(
      normalizeDataTableDateRangeFilter(
        {
          start: '2026-06-01',
          end: '2026-06-10T17:45',
        },
        {
          dateFormat: 'iso',
          timezone: '+07:00',
        },
      ),
    ).toEqual({
      from: '2026-05-31T17:00:00.000Z',
      to: '2026-06-10T10:45:00.000Z',
    })
  })
})
