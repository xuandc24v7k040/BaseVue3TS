import { ref, computed, watch, onBeforeUnmount, unref, type Ref } from 'vue'
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/vue-table'
import type {
  DataTableConfig,
  DataTableFilterableColumn,
  DataTableFilterOperator,
  DataTableFilterQuery,
  DataTableQuery,
  DataTableSearchableColumn,
  DataTableDateColumn,
} from '../interface'
import {
  isDateRangeValue,
  toDataTableFilterValue,
  stableStringify,
} from '../utils'
import type { DataTableFilterValue } from '../interface'

function toSearchText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function cloneQuerySnapshot(query: DataTableQuery): DataTableQuery {
  try {
    return JSON.parse(JSON.stringify(query))
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[DataTable Query] Failed to clone query snapshot', error)
    }
    return query
  }
}

function getFilterOperator(value: unknown): DataTableFilterOperator {
  if (isDateRangeValue(value)) return 'between'
  if (Array.isArray(value)) return 'in'
  if (typeof value === 'string') return 'contains'
  return 'equals'
}

interface UseDataTableQueryProps<TData> {
  resolvedConfig: Ref<DataTableConfig<TData>>
  globalFilter: Ref<string>
  columnFilters: Ref<ColumnFiltersState>
  sorting: Ref<SortingState>
  pageCount: Ref<number | undefined>
  rowCount: Ref<number | undefined>
  resolvedColumnIdSet: Ref<Set<string>>
  resolvedSearchColumnIds: Ref<string[]>
  columnSearchIdSet: Ref<Set<string>>
  facetedFilterIdSet: Ref<Set<string>>
  dateFilterIdSet: Ref<Set<string>>
  resolvedSearchableColumns: Ref<DataTableSearchableColumn[]>
  resolvedFilterableColumns: Ref<DataTableFilterableColumn[]>
  resolvedDateColumns: Ref<DataTableDateColumn[]>
  initialPageIndex: number
  initialPageSize: number
  onQueryChange?: (query: DataTableQuery) => void
}

export function useDataTableQuery<TData>({
  resolvedConfig,
  globalFilter,
  columnFilters,
  sorting,
  pageCount,
  rowCount,
  resolvedColumnIdSet,
  resolvedSearchColumnIds,
  columnSearchIdSet,
  facetedFilterIdSet,
  dateFilterIdSet,
  resolvedSearchableColumns,
  resolvedFilterableColumns,
  resolvedDateColumns,
  initialPageIndex,
  initialPageSize,
  onQueryChange,
}: UseDataTableQueryProps<TData>) {
  const pagination = ref<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  })

  function isKnownColumnId(columnId: string): boolean {
    return resolvedColumnIdSet.value.has(columnId)
  }

  function getConfiguredFilterOperator(filterId: string, value: unknown): DataTableFilterOperator {
    const searchableColumn = resolvedSearchableColumns.value.find((column) => column.id === filterId)
    if (searchableColumn) return searchableColumn.operator ?? 'contains'

    const filterableColumn = resolvedFilterableColumns.value.find((column) => column.id === filterId)
    if (filterableColumn) return filterableColumn.operator ?? 'in'

    const dateColumn = resolvedDateColumns.value.find((column) => column.id === filterId)
    if (dateColumn) return dateColumn.operator ?? 'between'

    return getFilterOperator(value)
  }

  function getFilterQuery(filter: ColumnFiltersState[number]): DataTableFilterQuery {
    const value = toDataTableFilterValue(filter.value)
    return {
      id: filter.id,
      value,
      operator: getConfiguredFilterOperator(filter.id, value),
    }
  }

  /**
   * Checks if a filter value is meaningful (non-empty) and worth including
   * in the query. Protects backend from empty/junk filter entries.
   */
  function isMeaningfulFilterValue(value: DataTableFilterValue): boolean {
    if (typeof value === 'string') return value.trim() !== ''
    if (typeof value === 'number' || typeof value === 'boolean') return true
    if (Array.isArray(value)) return value.length > 0
    if (isDateRangeValue(value)) return Boolean(value.start || value.end)
    return false
  }

  function getFilterMetadata(filters: DataTableFilterQuery[]): DataTableQuery['metadata'] {
    const metadata: DataTableQuery['metadata'] = {}
    const searchValue = toSearchText(globalFilter.value).trim()

    if (searchValue && resolvedSearchColumnIds.value.length > 0) {
      metadata.globalSearch = {
        value: searchValue,
        columnIds: resolvedSearchColumnIds.value,
      }
    }

    if (filters.length > 0) {
      metadata.columnSearch = filters.filter((filter) => columnSearchIdSet.value.has(filter.id))
      metadata.facetedFilters = filters.filter((filter) => facetedFilterIdSet.value.has(filter.id))
      metadata.dateFilters = filters.filter((filter) => dateFilterIdSet.value.has(filter.id))
    }

    const hasMetadata =
      Boolean(metadata.globalSearch) ||
      (metadata.columnSearch?.length ?? 0) > 0 ||
      (metadata.facetedFilters?.length ?? 0) > 0 ||
      (metadata.dateFilters?.length ?? 0) > 0

    return hasMetadata ? metadata : undefined
  }

  const query = computed<DataTableQuery>(() => {
    const searchValue = toSearchText(globalFilter.value).trim()
    const filters =
      columnFilters.value.length > 0
        ? columnFilters.value
            .filter((filter) => isKnownColumnId(filter.id))
            .map((filter) => getFilterQuery(filter))
            .filter((filter) => isMeaningfulFilterValue(filter.value))
        : []
    const sanitizedSorting = sorting.value.filter((sort) => isKnownColumnId(sort.id))

    return {
      page: pagination.value.pageIndex + 1,
      pageSize: pagination.value.pageSize,
      search:
        searchValue && resolvedSearchColumnIds.value.length > 0
          ? {
              value: searchValue,
              columnIds: resolvedSearchColumnIds.value,
            }
          : undefined,
      sort: sanitizedSorting.length > 0 ? sanitizedSorting : undefined,
      filters: filters.length > 0 ? filters : undefined,
      metadata: getFilterMetadata(filters),
    }
  })

  const queryKey = computed(() => stableStringify(query.value))
  const nonPaginationQueryKey = computed(() => {
    const q = query.value
    return stableStringify({
      search: q.search,
      sort: q.sort,
      filters: q.filters,
    })
  })

  const syncedQuery = ref<DataTableQuery>(cloneQuerySnapshot(query.value))
  const shouldEmitInitialQuery = resolvedConfig.value.emitInitialQuery ?? true
  const routeAppliedQueryKey = ref<string | null>(null)
  let searchDebounceTimeout: ReturnType<typeof setTimeout> | undefined
  let lastEmittedQueryKey = shouldEmitInitialQuery ? '' : stableStringify(query.value)

  function clearSearchDebounceTimeout() {
    if (!searchDebounceTimeout) return

    clearTimeout(searchDebounceTimeout)
    searchDebounceTimeout = undefined
  }

  function emitQuery(nextQuery: DataTableQuery, nextQueryKey = stableStringify(nextQuery)) {
    if (nextQueryKey === lastEmittedQueryKey) return

    lastEmittedQueryKey = nextQueryKey
    syncedQuery.value = cloneQuerySnapshot(nextQuery)
    onQueryChange?.(nextQuery)
  }

  function shouldDebounceQuery(
    nextQuery: DataTableQuery,
    previousQuery: DataTableQuery | undefined,
    nextQueryKey: string,
  ): boolean {
    if (routeAppliedQueryKey.value === nextQueryKey) return false
    if (!previousQuery) return false
    if (stableStringify(nextQuery.sort) !== stableStringify(previousQuery.sort)) return false
    if (nextQuery.page !== previousQuery.page) return false
    if (nextQuery.pageSize !== previousQuery.pageSize) return false

    const previousSearch = previousQuery.search?.value ?? ''
    const nextSearch = nextQuery.search?.value ?? ''
    const globalSearchChanged = previousSearch !== nextSearch

    const previousFilters = previousQuery.filters ?? []
    const nextFilters = nextQuery.filters ?? []
    const filtersChanged = stableStringify(previousFilters) !== stableStringify(nextFilters)
    const searchFilterChanged =
      filtersChanged &&
      (nextFilters.some((filter) => columnSearchIdSet.value.has(filter.id)) ||
        previousFilters.some((filter) => columnSearchIdSet.value.has(filter.id)))
    const nonSearchFilterChanged =
      filtersChanged &&
      (nextFilters.some((filter) => !columnSearchIdSet.value.has(filter.id)) ||
        previousFilters.some((filter) => !columnSearchIdSet.value.has(filter.id)))

    if (!globalSearchChanged && !searchFilterChanged) return false
    if (nonSearchFilterChanged) return false

    return true
  }

  watch(
    queryKey,
    (nextQueryKey) => {
      const nextQuery = query.value
      const previousQuery = syncedQuery.value

      clearSearchDebounceTimeout()

      if (shouldDebounceQuery(nextQuery, previousQuery, nextQueryKey)) {
        routeAppliedQueryKey.value = null
        const delay =
          resolvedConfig.value.searchDebounce ??
          resolvedConfig.value.queryDebounce ??
          resolvedConfig.value.filterDebounce ??
          300
        const debouncedQuery = cloneQuerySnapshot(nextQuery)
        searchDebounceTimeout = setTimeout(() => emitQuery(debouncedQuery, nextQueryKey), delay)
        return
      }

      emitQuery(nextQuery, nextQueryKey)
      routeAppliedQueryKey.value = null
    },
    { immediate: shouldEmitInitialQuery },
  )

  onBeforeUnmount(clearSearchDebounceTimeout)

  function getEffectivePageCount(
    nextPageCount: number | undefined,
    nextRowCount: number | undefined,
    nextPageSize: number,
  ): number | undefined {
    if (typeof nextPageCount === 'number') return nextPageCount
    if (typeof nextRowCount !== 'number') return undefined
    return Math.ceil(nextRowCount / nextPageSize)
  }

  watch(
    [
      () => unref(pageCount),
      () => unref(rowCount),
      () => pagination.value.pageSize,
      () => pagination.value.pageIndex,
    ],
    ([nextPageCount, nextRowCount, nextPageSize]) => {
      const effectivePageCount = getEffectivePageCount(
        nextPageCount,
        nextRowCount,
        nextPageSize,
      )
      if (typeof effectivePageCount !== 'number') return

      const maxPageIndex = Math.max(effectivePageCount - 1, 0)
      if (pagination.value.pageIndex <= maxPageIndex) return

      pagination.value = {
        ...pagination.value,
        pageIndex: maxPageIndex,
      }
    },
  )

  function resetPageIndex() {
    if (pagination.value.pageIndex !== 0) {
      pagination.value = { ...pagination.value, pageIndex: 0 }
    }
  }

  return {
    pagination,
    query,
    queryKey,
    nonPaginationQueryKey,
    syncedQuery,
    routeAppliedQueryKey,
    resetPageIndex,
  }
}
export { toSearchText }
