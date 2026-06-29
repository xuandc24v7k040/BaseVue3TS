import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/vue-table'
import type { LocationQueryRaw } from 'vue-router'
import type {
  DataTableConfig,
  DataTableQuery,
  DataTableRouteSyncMode,
} from '../../interface'

export interface RouteSyncedTableState {
  columnFilters?: ColumnFiltersState
  globalFilter?: string
  pagination?: Partial<PaginationState>
  sorting?: SortingState
}

export interface ResolvedRouteSyncConfig {
  mode: DataTableRouteSyncMode
  keyPrefix: string
  page: boolean
  pageSize: boolean
  search: boolean
  sorting: boolean
  filters: boolean
  replace: boolean
  paramNames: {
    search: string
    page: string
    pageSize: string
    sort: string
  }
  filterParamMap: Record<string, string>
  arrayFormat: 'comma' | 'repeated'
}

export interface RouteSyncDefaults {
  pageIndex: number
  pageSize: number
  maxPageSize?: number
  /** All known table column IDs. Used to reject unknown route-provided sort/filter ids. */
  columnIds?: string[]
  /** Column IDs allowed for route-provided sorting. Defaults to columnIds when omitted. */
  sortIds?: string[]
  filterIds?: string[]
  arrayFilterIds?: string[]
  stringFilterIds?: string[]
  numericFilterIds?: string[]
  booleanFilterIds?: string[]
  /** Column IDs that should be parsed as date ranges (From/To params). */
  dateColumnIds?: string[]
}

export interface SerializeRouteQueryOptions {
  currentQuery: LocationQueryRaw
  tableQuery: DataTableQuery
  config: ResolvedRouteSyncConfig
  defaults: RouteSyncDefaults
}

function getDuplicateValues(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value)
    }
    seen.add(value)
  })

  return Array.from(duplicates)
}

function assertNoDuplicateRouteKeys(keys: string[], context: string): void {
  const duplicates = getDuplicateValues(keys)
  if (!duplicates.length) return

  throw new Error(
    `[DataTable RouteSync] Duplicate route query key(s) "${duplicates.join(', ')}" in ${context}. ` +
      'Route sync would be ambiguous; use unique paramNames/filterParamMap values.',
  )
}

export function resolveRouteSyncConfig<TData>(
  config: DataTableConfig<TData>,
): ResolvedRouteSyncConfig | null {
  if (!config.routeSync) return null

  const routeSync = typeof config.routeSync === 'object' ? config.routeSync : {}
  if (routeSync.enabled === false) return null

  const keyPrefix = routeSync.keyPrefix ?? config.tableId

  if (!keyPrefix) {
    if (import.meta.env.DEV) {
      console.warn(
        '[DataTable] routeSync requires tableId or routeSync.keyPrefix. Route sync disabled.'
      )
    }
    return null
  }

  const mode = routeSync.mode ?? 'namespaced'
  const paramNames = {
    search: routeSync.paramNames?.search ?? 'q',
    page: routeSync.paramNames?.page ?? 'page',
    pageSize: routeSync.paramNames?.pageSize ?? 'limit',
    sort: routeSync.paramNames?.sort ?? 'sort',
  }
  const filterParamMap = routeSync.filterParamMap ?? {}

  if (mode === 'compact') {
    assertNoDuplicateRouteKeys(Object.values(paramNames), 'routeSync.paramNames')

    const reservedKeys = new Set(Object.values(paramNames))
    Object.entries(filterParamMap).forEach(([colId, paramKey]) => {
      if (reservedKeys.has(paramKey as string)) {
        throw new Error(
          `[DataTable RouteSync] filterParamMap["${colId}"] = "${paramKey}" collides with compact route paramNames. ` +
            'Use a unique query key for this filter.',
        )
      }
    })
    assertNoDuplicateRouteKeys(Object.values(filterParamMap), 'routeSync.filterParamMap')
  }

  return {
    mode,
    keyPrefix,
    page: routeSync.page ?? true,
    pageSize: routeSync.pageSize ?? true,
    search: routeSync.search ?? true,
    sorting: routeSync.sorting ?? true,
    filters: routeSync.filters ?? true,
    replace: routeSync.replace ?? true,
    paramNames,
    filterParamMap,
    arrayFormat: routeSync.arrayFormat ?? 'comma',
  }
}
