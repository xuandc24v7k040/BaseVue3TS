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
  filterIds?: string[]
}

export interface SerializeRouteQueryOptions {
  currentQuery: LocationQueryRaw
  tableQuery: DataTableQuery
  config: ResolvedRouteSyncConfig
  defaults: RouteSyncDefaults
}

export function resolveRouteSyncConfig<TData>(
  config: DataTableConfig<TData>,
): ResolvedRouteSyncConfig | null {
  if (!config.routeSync) return null

  const routeSync = typeof config.routeSync === 'object' ? config.routeSync : {}
  if (routeSync.enabled === false) return null

  const keyPrefix = routeSync.keyPrefix ?? config.tableId ?? 'dt'

  return {
    mode: routeSync.mode ?? 'namespaced',
    keyPrefix,
    page: routeSync.page ?? true,
    pageSize: routeSync.pageSize ?? true,
    search: routeSync.search ?? true,
    sorting: routeSync.sorting ?? true,
    filters: routeSync.filters ?? true,
    replace: routeSync.replace ?? true,
    paramNames: {
      search: routeSync.paramNames?.search ?? 'q',
      page: routeSync.paramNames?.page ?? 'page',
      pageSize: routeSync.paramNames?.pageSize ?? 'limit',
      sort: routeSync.paramNames?.sort ?? 'sort',
    },
    filterParamMap: routeSync.filterParamMap ?? {},
    arrayFormat: routeSync.arrayFormat ?? 'comma',
  }
}
