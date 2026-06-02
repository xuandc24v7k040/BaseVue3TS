import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/vue-table'
import { ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableConfig, DataTableQuery } from '../interface'
import {
  areColumnFiltersEqual,
  arePaginationStatesEqual,
  areRouteQueriesEqual,
  areSortingStatesEqual,
  parseRouteQuery,
  resolveRouteSyncConfig,
  serializeRouteQuery,
  type RouteSyncDefaults,
  type RouteSyncedTableState,
} from './route-sync'

interface UseDataTableRouteSyncProps<TData> {
  config: Ref<DataTableConfig<TData>>
  query: Ref<DataTableQuery>
  columnFilters: Ref<ColumnFiltersState>
  globalFilter: Ref<string>
  pagination: Ref<PaginationState>
  sorting: Ref<SortingState>
  defaults: Ref<RouteSyncDefaults>
}

export function getDataTableRouteSyncedState<TData>(
  config: DataTableConfig<TData>,
  defaults: RouteSyncDefaults = { pageIndex: 0, pageSize: config.pageSize ?? 10 },
): RouteSyncedTableState {
  if (typeof window === 'undefined') return {}

  const routeSync = resolveRouteSyncConfig(config)
  if (!routeSync) return {}

  const searchParams = new URLSearchParams(window.location.search)
  const routeQuery = Array.from(searchParams.keys()).reduce<Record<string, string | string[]>>(
    (query, key) => {
      const values = searchParams.getAll(key)
      query[key] = values.length > 1 ? values : values[0]
      return query
    },
    {},
  )

  return parseRouteQuery(routeQuery, routeSync, defaults)
}

export function useDataTableRouteSync<TData>({
  config,
  query,
  columnFilters,
  globalFilter,
  pagination,
  sorting,
  defaults,
}: UseDataTableRouteSyncProps<TData>): void {
  const route = useRoute()
  const router = useRouter()
  const syncingFromRoute = ref(false)
  const syncingToRoute = ref(false)

  watch(
    query,
    async (nextQuery) => {
      const routeSync = resolveRouteSyncConfig(config.value)
      if (!routeSync || syncingFromRoute.value) return

      const nextRouteQuery = serializeRouteQuery({
        currentQuery: route.query,
        tableQuery: nextQuery,
        config: routeSync,
        defaults: defaults.value,
      })

      if (areRouteQueriesEqual(route.query, nextRouteQuery, routeSync, defaults.value)) return

      syncingToRoute.value = true
      try {
        if (routeSync.replace) {
          await router.replace({ query: nextRouteQuery })
        } else {
          await router.push({ query: nextRouteQuery })
        }
      } finally {
        syncingToRoute.value = false
      }
    },
    { deep: true },
  )

  watch(
    () => route.query,
    (nextRouteQuery) => {
      const routeSync = resolveRouteSyncConfig(config.value)
      if (!routeSync) return

      if (syncingToRoute.value) {
        const expectedRouteQuery = serializeRouteQuery({
          currentQuery: nextRouteQuery,
          tableQuery: query.value,
          config: routeSync,
          defaults: defaults.value,
        })

        if (areRouteQueriesEqual(nextRouteQuery, expectedRouteQuery, routeSync, defaults.value)) return
      }

      const nextState = parseRouteQuery(nextRouteQuery, routeSync, defaults.value)
      syncingFromRoute.value = true

      try {
        if (
          nextState.columnFilters &&
          !areColumnFiltersEqual(columnFilters.value, nextState.columnFilters)
        ) {
          columnFilters.value = nextState.columnFilters
        }

        if (
          typeof nextState.globalFilter === 'string' &&
          globalFilter.value !== nextState.globalFilter
        ) {
          globalFilter.value = nextState.globalFilter
        }

        if (nextState.pagination) {
          const nextPagination = {
            ...pagination.value,
            ...nextState.pagination,
          }

          if (!arePaginationStatesEqual(pagination.value, nextPagination)) {
            pagination.value = nextPagination
          }
        }

        if (nextState.sorting && !areSortingStatesEqual(sorting.value, nextState.sorting)) {
          sorting.value = nextState.sorting
        }
      } finally {
        syncingFromRoute.value = false
      }
    },
    { deep: true },
  )
}
