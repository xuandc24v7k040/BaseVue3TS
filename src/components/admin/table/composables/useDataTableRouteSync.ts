import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/vue-table'
import { computed, getCurrentInstance, onUnmounted, watch, type Ref } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import type { DataTableConfig, DataTableQuery } from '../interface'
import { stableStringify } from '../utils'
import {
  areColumnFiltersEqual,
  arePaginationStatesEqual,
  areRouteQueriesEqual,
  areSortingStatesEqual,
  hasManagedRouteQuery,
  parseRouteQuery,
  resolveRouteSyncConfig,
  serializeRouteQuery,
  type RouteSyncDefaults,
  type RouteSyncedTableState,
} from './route-sync'
import { filterValueKey, routeQueryKey } from './route-sync/keys'
import type { ResolvedRouteSyncConfig } from './route-sync/types'

function getTableRouteParamKeys(
  config: ResolvedRouteSyncConfig,
  defaults: RouteSyncDefaults,
  failOnDuplicates = false,
): string[] {
  const keys: string[] = []

  if (config.mode === 'compact') {
    if (config.search) keys.push(config.paramNames.search)
    if (config.page) keys.push(config.paramNames.page)
    if (config.pageSize) keys.push(config.paramNames.pageSize)
    if (config.sorting) keys.push(config.paramNames.sort)

    if (config.filters) {
      const dateColumnIds = new Set(defaults.dateColumnIds ?? [])
      const compactFilterIds = Array.from(
        new Set([...(defaults.filterIds ?? []), ...Object.keys(config.filterParamMap)]),
      )
      compactFilterIds.forEach((filterId) => {
        const base = config.filterParamMap[filterId] ?? filterId
        keys.push(base)

        if (dateColumnIds.has(filterId)) {
          keys.push(`${base}From`)
          keys.push(`${base}To`)
        }
      })
    }
  } else {
    keys.push(
      routeQueryKey(config, 'page'),
      routeQueryKey(config, 'pageSize'),
      routeQueryKey(config, 'search'),
      routeQueryKey(config, 'sort'),
      routeQueryKey(config, 'sortBy'),
      routeQueryKey(config, 'sortOrder'),
    )
    if (config.filters) {
      const filterIds = defaults.filterIds ?? []
      const dateColumnIds = new Set(defaults.dateColumnIds ?? [])
      filterIds.forEach((filterId) => {
        keys.push(filterValueKey(config, filterId))
        if (dateColumnIds.has(filterId)) {
          keys.push(`${filterValueKey(config, filterId)}From`)
          keys.push(`${filterValueKey(config, filterId)}To`)
        }
      })
    }
  }

  if (failOnDuplicates) {
    const seen = new Set<string>()
    const duplicates = new Set<string>()

    keys.forEach((key) => {
      if (seen.has(key)) {
        duplicates.add(key)
      }
      seen.add(key)
    })

    if (duplicates.size > 0) {
      throw new Error(
        `[DataTable RouteSync] Duplicate route query key(s) "${Array.from(duplicates).join(', ')}" detected within the same table configuration. ` +
          'Check paramNames, filterParamMap, filterIds, and dateColumnIds.',
      )
    }
  }

  return Array.from(new Set(keys))
}

interface UseDataTableRouteSyncProps<TData> {
  config: Ref<DataTableConfig<TData>>
  query: Ref<DataTableQuery>
  columnFilters: Ref<ColumnFiltersState>
  globalFilter: Ref<string>
  pagination: Ref<PaginationState>
  sorting: Ref<SortingState>
  defaults: Ref<RouteSyncDefaults>
  onRouteStateApplied?: () => void
  route?: ReturnType<typeof useRoute>
}

export function getDataTableRouteSyncedState<TData>(
  config: DataTableConfig<TData>,
  defaults: RouteSyncDefaults = { pageIndex: 0, pageSize: config.pageSize ?? 10 },
  routeQuery?: LocationQuery | Record<string, unknown>,
): RouteSyncedTableState {
  const routeSync = resolveRouteSyncConfig(config)
  if (!routeSync) return {}
  getTableRouteParamKeys(routeSync, defaults, true)

  let resolvedQuery: Record<string, unknown> | undefined = routeQuery
    ? { ...routeQuery }
    : undefined

  if (!resolvedQuery) {
    if (typeof window === 'undefined') return {}

    let search = window.location.search
    if (!search && window.location.hash.includes('?')) {
      const qIndex = window.location.hash.indexOf('?')
      search = window.location.hash.slice(qIndex)
    }
    const searchParams = new URLSearchParams(search)
    resolvedQuery = Array.from(searchParams.keys()).reduce<Record<string, string | string[]>>(
      (query, key) => {
        const values = searchParams.getAll(key)
        query[key] = values.length > 1 ? values : (values[0] ?? '')
        return query
      },
      {},
    )
  }

  // If URL has no table-managed query keys at all, return empty state
  // so initialFilters/initialSorting/initialSearch/persisted state can take over.
  if (!hasManagedRouteQuery(resolvedQuery, routeSync, defaults)) {
    return {}
  }

  return parseRouteQuery(resolvedQuery, routeSync, defaults)
}

const activeKeysRegistry = import.meta.env.DEV ? new Map<string, string>() : null

export function useDataTableRouteSync<TData>(props: UseDataTableRouteSyncProps<TData>): void {
  const {
    config,
    query,
    columnFilters,
    globalFilter,
    pagination,
    sorting,
    defaults,
    onRouteStateApplied,
  } = props
  const initialRouteSync = resolveRouteSyncConfig(config.value)
  if (!initialRouteSync) return

  let route = props.route
  let router: ReturnType<typeof useRouter> | undefined
  try {
    if (!route) {
      route = useRoute()
    }
    router = useRouter()
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[DataTable RouteSync] No vue-router context found. Route sync disabled.')
    }
    return
  }

  if (!route || !router) return

  const initialRouteKeys = getTableRouteParamKeys(initialRouteSync, defaults.value, true)

  const queryKey = computed(() => stableStringify(query.value))
  let isMounted = true
  onUnmounted(() => {
    isMounted = false
  })

  if (import.meta.env.DEV && activeKeysRegistry) {
    const instance = getCurrentInstance()
    if (instance) {
      const keys = initialRouteKeys
      const tableIdentifier = initialRouteSync.keyPrefix || 'default'
      const instanceId = `${tableIdentifier}#${instance.uid}`

      setTimeout(() => {
        if (!isMounted) return
        keys.forEach((key) => {
          const existing = activeKeysRegistry.get(key)
          if (existing && existing !== instanceId) {
            const existingPrefix = existing.split('#')[0] || 'default'
            throw new Error(
              `[DataTable RouteSync] Query parameter key collision detected. Key "${key}" is managed by multiple tables ` +
                `(current prefix: "${tableIdentifier}", existing prefix: "${existingPrefix}"). ` +
                'Use namespaced mode or distinct key prefixes.',
            )
          } else {
            activeKeysRegistry.set(key, instanceId)
          }
        })
      }, 0)

      onUnmounted(() => {
        keys.forEach((key) => {
          if (activeKeysRegistry.get(key) === instanceId) {
            activeKeysRegistry.delete(key)
          }
        })
      })
    }
  }

  watch(queryKey, async () => {
    const routeSync = resolveRouteSyncConfig(config.value)
    if (!routeSync || !route || !router) return

    const nextRouteQuery = serializeRouteQuery({
      currentQuery: route.query,
      tableQuery: query.value,
      config: routeSync,
      defaults: defaults.value,
    })

    if (areRouteQueriesEqual(route.query, nextRouteQuery, routeSync, defaults.value)) return

    try {
      if (routeSync.replace) {
        await router.replace({ query: nextRouteQuery })
      } else {
        await router.push({ query: nextRouteQuery })
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[DataTable RouteSync] Failed to sync route query', error)
      }
    }
  })

  const tableRouteQueryKey = computed(() => {
    const routeSync = resolveRouteSyncConfig(config.value)
    if (!routeSync || !route) return ''
    const keys = getTableRouteParamKeys(routeSync, defaults.value, true)
    const subQuery: Record<string, unknown> = {}
    keys.forEach((key) => {
      const val = route.query[key]
      if (val !== undefined) {
        subQuery[key] = val
      }
    })
    return stableStringify(subQuery)
  })

  watch(tableRouteQueryKey, (nextKey, prevKey) => {
    if (nextKey === prevKey) return

    const routeSync = resolveRouteSyncConfig(config.value)
    if (!routeSync || !route) return

    const nextRouteQuery = serializeRouteQuery({
      currentQuery: route.query,
      tableQuery: query.value,
      config: routeSync,
      defaults: defaults.value,
    })

    if (areRouteQueriesEqual(route.query, nextRouteQuery, routeSync, defaults.value)) {
      return
    }

    const nextState = parseRouteQuery(route.query, routeSync, defaults.value)
    let didApplyRouteState = false

    if (
      nextState.columnFilters &&
      !areColumnFiltersEqual(columnFilters.value, nextState.columnFilters)
    ) {
      columnFilters.value = nextState.columnFilters
      didApplyRouteState = true
    }

    if (
      typeof nextState.globalFilter === 'string' &&
      globalFilter.value !== nextState.globalFilter
    ) {
      globalFilter.value = nextState.globalFilter
      didApplyRouteState = true
    }

    if (nextState.pagination) {
      const nextPagination = {
        pageIndex:
          nextState.pagination.pageIndex !== undefined
            ? nextState.pagination.pageIndex
            : pagination.value.pageIndex,
        pageSize:
          nextState.pagination.pageSize !== undefined
            ? nextState.pagination.pageSize
            : pagination.value.pageSize,
      }

      if (!arePaginationStatesEqual(pagination.value, nextPagination)) {
        pagination.value = nextPagination
        didApplyRouteState = true
      }
    }

    if (nextState.sorting && !areSortingStatesEqual(sorting.value, nextState.sorting)) {
      sorting.value = nextState.sorting
      didApplyRouteState = true
    }

    if (didApplyRouteState) {
      onRouteStateApplied?.()
    }
  })
}
