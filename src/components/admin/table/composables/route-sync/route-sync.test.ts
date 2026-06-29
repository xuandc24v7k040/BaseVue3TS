import { describe, expect, it } from 'vitest'
import type { DataTableQuery, DataTableRouteSyncConfig } from '../../interface'
import { getDataTableRouteSyncedState } from '../useDataTableRouteSync'
import {
  parseRouteQuery,
  resolveRouteSyncConfig,
  serializeRouteQuery,
  type RouteSyncDefaults,
} from './index'
import { clearTableRouteQueryKeys } from './keys'
import type { ResolvedRouteSyncConfig } from './types'

const baseDefaults: RouteSyncDefaults = {
  pageIndex: 0,
  pageSize: 10,
  columnIds: ['name', 'createdAt', 'role', 'status', 'published', 'amount'],
  sortIds: ['name', 'createdAt'],
  filterIds: ['role', 'status', 'createdAt', 'published', 'amount'],
  arrayFilterIds: ['role'],
  stringFilterIds: ['role', 'status'],
  booleanFilterIds: ['published'],
  numericFilterIds: ['amount'],
  dateColumnIds: ['createdAt'],
}

function compactConfig(
  overrides: DataTableRouteSyncConfig = {},
): ResolvedRouteSyncConfig {
  const config = resolveRouteSyncConfig({
    tableId: 'orders',
    routeSync: {
      mode: 'compact',
      ...overrides,
    },
  })

  if (!config) throw new Error('Expected compact route sync config')
  return config
}

function namespacedConfig(): ResolvedRouteSyncConfig {
  const config = resolveRouteSyncConfig({
    tableId: 'orders',
    routeSync: {
      mode: 'namespaced',
    },
  })

  if (!config) throw new Error('Expected namespaced route sync config')
  return config
}

describe('DataTable route sync parser', () => {
  it('parses a valid compact query', () => {
    const state = parseRouteQuery(
      {
        q: 'abc',
        page: '2',
        limit: '20',
        sort: 'name:asc,createdAt:desc',
        role: 'admin,manager',
        status: 'active',
      },
      compactConfig(),
      baseDefaults,
    )

    expect(state.globalFilter).toBe('abc')
    expect(state.pagination).toEqual({ pageIndex: 1, pageSize: 20 })
    expect(state.sorting).toEqual([
      { id: 'name', desc: false },
      { id: 'createdAt', desc: true },
    ])
    expect(state.columnFilters).toEqual([
      { id: 'role', value: ['admin', 'manager'] },
      { id: 'status', value: 'active' },
    ])
  })

  it('parses comma array filters', () => {
    const state = parseRouteQuery(
      { role: 'admin,manager' },
      compactConfig({ arrayFormat: 'comma' }),
      baseDefaults,
    )

    expect(state.columnFilters).toEqual([{ id: 'role', value: ['admin', 'manager'] }])
  })

  it('parses repeated array filters', () => {
    const state = parseRouteQuery(
      { role: ['admin', 'manager'] },
      compactConfig({ arrayFormat: 'repeated' }),
      baseDefaults,
    )

    expect(state.columnFilters).toEqual([{ id: 'role', value: ['admin', 'manager'] }])
  })

  it('parses compact date ranges', () => {
    expect(
      parseRouteQuery(
        { createdAtFrom: '2026-06-01', createdAtTo: '2026-06-10' },
        compactConfig(),
        baseDefaults,
      ).columnFilters,
    ).toEqual([
      {
        id: 'createdAt',
        value: { start: '2026-06-01', end: '2026-06-10' },
      },
    ])

    expect(
      parseRouteQuery(
        { createdAtFrom: '2026-06-01T08:30', createdAtTo: '2026-06-10T17:45' },
        compactConfig(),
        baseDefaults,
      ).columnFilters,
    ).toEqual([
      {
        id: 'createdAt',
        value: { start: '2026-06-01T08:30', end: '2026-06-10T17:45' },
      },
    ])
  })

  it.each([
    '2026-02-30',
    '2026-06-01T99:99',
    '2026-06-01T08:30Z',
    '2026-06-01T08:30+07:00',
  ])('rejects invalid compact date value %s', (createdAtFrom) => {
    const state = parseRouteQuery(
      { createdAtFrom },
      compactConfig(),
      baseDefaults,
    )

    expect(state.columnFilters).toEqual([])
  })

  it('rejects reversed compact date ranges', () => {
    const state = parseRouteQuery(
      { createdAtFrom: '2026-06-11', createdAtTo: '2026-06-10' },
      compactConfig(),
      baseDefaults,
    )

    expect(state.columnFilters).toEqual([])
  })

  it('parses valid compact sorting and drops invalid sorting safely', () => {
    expect(
      parseRouteQuery(
        { sort: 'name:asc,createdAt:desc' },
        compactConfig(),
        baseDefaults,
      ).sorting,
    ).toEqual([
      { id: 'name', desc: false },
      { id: 'createdAt', desc: true },
    ])

    expect(parseRouteQuery({ sort: 'name:up' }, compactConfig(), baseDefaults).sorting).toEqual([])
    expect(parseRouteQuery({ sort: 'unknown:asc' }, compactConfig(), baseDefaults).sorting).toEqual([])
    expect(parseRouteQuery({ sort: 'name' }, compactConfig(), baseDefaults).sorting).toEqual([])
  })

  it('parses legacy namespaced query fallback', () => {
    const state = parseRouteQuery(
      {
        'orders.search': 'abc',
        'orders.page': '2',
        'orders.pageSize': '20',
        'orders.sort': JSON.stringify([{ id: 'name', desc: false }]),
        'orders.filters': JSON.stringify([
          { id: 'status', value: ['active'], operator: 'in' },
        ]),
      },
      namespacedConfig(),
      baseDefaults,
    )

    expect(state.globalFilter).toBe('abc')
    expect(state.pagination).toEqual({ pageIndex: 1, pageSize: 20 })
    expect(state.sorting).toEqual([{ id: 'name', desc: false }])
    expect(state.columnFilters).toEqual([{ id: 'status', value: ['active'] }])
  })

  it('prioritizes compact query over namespaced fallback when compact mode is active', () => {
    const state = parseRouteQuery(
      {
        q: 'compact',
        'orders.search': 'legacy',
        sort: 'name:asc',
        'orders.sortBy': 'createdAt',
        'orders.sortOrder': 'desc',
      },
      compactConfig(),
      baseDefaults,
    )

    expect(state.globalFilter).toBe('compact')
    expect(state.sorting).toEqual([{ id: 'name', desc: false }])
  })

  it('clears managed route keys without removing unrelated query params', () => {
    const nextQuery = clearTableRouteQueryKeys(
      {
        q: 'abc',
        page: '2',
        role: 'admin',
        outside: 'keep',
      },
      compactConfig(),
      baseDefaults,
    )

    expect(nextQuery).toEqual({
      q: undefined,
      page: undefined,
      role: undefined,
      outside: 'keep',
    })
  })
})

describe('DataTable route sync duplicate key validation', () => {
  it('throws when compact paramNames collide', () => {
    expect(() =>
      resolveRouteSyncConfig({
        tableId: 'orders',
        routeSync: {
          mode: 'compact',
          paramNames: { page: 'q' },
        },
      }),
    ).toThrow(/Duplicate route query key/)
  })

  it('throws when filterParamMap collides with reserved compact keys', () => {
    expect(() =>
      resolveRouteSyncConfig({
        tableId: 'orders',
        routeSync: {
          mode: 'compact',
          filterParamMap: { status: 'q' },
        },
      }),
    ).toThrow(/collides with compact route paramNames/)
  })

  it('throws when two filters map to the same compact query param', () => {
    expect(() =>
      resolveRouteSyncConfig({
        tableId: 'orders',
        routeSync: {
          mode: 'compact',
          filterParamMap: { role: 'f', status: 'f' },
        },
      }),
    ).toThrow(/Duplicate route query key/)
  })

  it('throws when a date range suffix collides with another filter key', () => {
    expect(() =>
      getDataTableRouteSyncedState(
        {
          tableId: 'orders',
          routeSync: { mode: 'compact' },
        },
        {
          ...baseDefaults,
          filterIds: ['createdAt', 'createdAtFrom'],
          dateColumnIds: ['createdAt'],
        },
        {},
      ),
    ).toThrow(/createdAtFrom/)
  })
})

describe('DataTable route sync serializer', () => {
  it('round-trips compact table state through route query', () => {
    const config = compactConfig()
    const query: DataTableQuery = {
      page: 3,
      pageSize: 50,
      search: { value: 'abc', columnIds: ['name'] },
      sort: [
        { id: 'name', desc: false },
        { id: 'createdAt', desc: true },
      ],
      filters: [
        { id: 'role', value: ['admin', 'manager'], operator: 'in' },
        { id: 'published', value: true, operator: 'equals' },
        { id: 'amount', value: 100, operator: 'gte' },
        {
          id: 'createdAt',
          value: { start: '2026-06-01', end: '2026-06-10' },
          operator: 'between',
        },
      ],
    }

    const serialized = serializeRouteQuery({
      currentQuery: { unrelated: 'keep' },
      tableQuery: query,
      config,
      defaults: baseDefaults,
    })
    const parsed = parseRouteQuery(serialized, config, baseDefaults)

    expect(serialized.unrelated).toBe('keep')
    expect(parsed.globalFilter).toBe('abc')
    expect(parsed.pagination).toEqual({ pageIndex: 2, pageSize: 50 })
    expect(parsed.sorting).toEqual(query.sort)
    expect(parsed.columnFilters).toEqual([
      { id: 'role', value: ['admin', 'manager'] },
      { id: 'createdAt', value: { start: '2026-06-01', end: '2026-06-10' } },
      { id: 'published', value: true },
      { id: 'amount', value: 100 },
    ])
  })
})
