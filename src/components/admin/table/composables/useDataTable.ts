import {
  getCoreRowModel,
  getExpandedRowModel,
  useVueTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from '@tanstack/vue-table'
import { computed, ref, unref, watch, type Ref } from 'vue'
import type {
  DataTableConfig,
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableFilterOperator,
  DataTableFilterQuery,
  DataTableQuery,
  DataTableSearchableColumn,
} from '../interface'
import { isDateRangeValue, toDataTableFilterValue } from '../utils'
import {
  getDataTablePersistedState,
  useDataTablePersistence,
} from './useDataTablePersistence'
import {
  getDataTableRouteSyncedState,
  useDataTableRouteSync,
} from './useDataTableRouteSync'
import { normalizePageIndex, normalizePageSize, stableStringify } from '../utils'

interface UseDataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[] | Ref<ColumnDef<TData, unknown>[]>
  data: TData[] | Ref<TData[]>
  pageCount?: number | Ref<number | undefined>
  rowCount?: number | Ref<number | undefined>
  config?: DataTableConfig<TData> | Ref<DataTableConfig<TData> | undefined>
  searchColumnIds?: string[] | Ref<string[]>
  searchableColumns?: DataTableSearchableColumn[] | Ref<DataTableSearchableColumn[] | undefined>
  filterableColumns?: DataTableFilterableColumn[] | Ref<DataTableFilterableColumn[] | undefined>
  dateColumns?: DataTableDateColumn[] | Ref<DataTableDateColumn[] | undefined>
  selectedRowIds?: string[] | Ref<string[] | undefined>
  onQueryChange?: (query: DataTableQuery) => void
  onSelectionChange?: (ids: string[]) => void
  defaultPageSize?: number | Ref<number>
}

function applyUpdater<TValue>(currentValue: TValue, updaterOrValue: Updater<TValue>): TValue {
  return typeof updaterOrValue === 'function'
    ? (updaterOrValue as (old: TValue) => TValue)(currentValue)
    : updaterOrValue
}

function getRowIdFromKey<TData>(
  row: TData,
  index: number,
  idKey: Extract<keyof TData, string> | 'id',
): string {
  const value = (row as Record<string, unknown>)[idKey]

  if (value === null || value === undefined || value === '') {
    return `row-${index}`
  }

  return String(value)
}

function getMissingRowIdMessage(detail: string): string {
  return `[DataTable] Row selection requires stable row ids. ${detail} Provide config.rowIdKey or config.getRowId; index-based row ids are unsafe with server-side pagination.`
}

function assertRowSelectionHasStableId<TData>(config: DataTableConfig<TData>): void {
  if (!config.enableRowSelection) return
  if (config.rowIdKey || config.getRowId) return

  throw new Error(
    getMissingRowIdMessage('Missing both config.rowIdKey and config.getRowId.'),
  )
}

function resolveRowId<TData>(
  row: TData,
  index: number,
  parent: TData | undefined,
  config: DataTableConfig<TData>,
): string {
  if (config.getRowId) {
    const id = config.getRowId(row, index, parent)

    if (config.enableRowSelection && !id) {
      throw new Error(getMissingRowIdMessage('config.getRowId returned an empty value.'))
    }

    return id || `row-${index}`
  }

  if (!config.enableRowSelection) {
    return getRowIdFromKey(row, index, config.rowIdKey || 'id')
  }

  if (!config.rowIdKey) {
    throw new Error(getMissingRowIdMessage('Missing config.rowIdKey for the current row.'))
  }

  const value = (row as Record<string, unknown>)[config.rowIdKey]
  if (value === null || value === undefined || value === '') {
    throw new Error(getMissingRowIdMessage(`Row id field "${config.rowIdKey}" is empty.`))
  }

  return String(value)
}

function getFilterOperator(value: unknown): DataTableFilterOperator {
  if (isDateRangeValue(value)) return 'between'
  if (Array.isArray(value)) return 'in'
  if (typeof value === 'string') return 'contains'
  return 'equals'
}

function getRowSelectionFromIds(ids: string[] | undefined): RowSelectionState {
  return (ids ?? []).reduce<RowSelectionState>((selection, id) => {
    selection[id] = true
    return selection
  }, {})
}

function getSelectedIds(selection: RowSelectionState): string[] {
  return Object.keys(selection).filter((id) => selection[id])
}

function areStringArraysEqual(first: string[], second: string[]): boolean {
  if (first.length !== second.length) return false
  return first.every((value, index) => value === second[index])
}

function getInitialPageIndex<TData>(config: DataTableConfig<TData>): number {
  return normalizePageIndex(config.initialPageIndex ?? config.initialPage ?? 0)
}

function toSearchText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

export function useDataTable<TData>({
  columns,
  data,
  pageCount,
  rowCount,
  config = {},
  searchColumnIds = [],
  searchableColumns = [],
  filterableColumns = [],
  dateColumns = [],
  selectedRowIds,
  onQueryChange,
  onSelectionChange,
  defaultPageSize = 10,
}: UseDataTableProps<TData>) {
  const resolvedConfig = computed(() => unref(config) ?? {})
  const resolvedSearchColumnIds = computed(() => unref(searchColumnIds))
  const resolvedSearchableColumns = computed(() => unref(searchableColumns) ?? [])
  const resolvedFilterableColumns = computed(() => unref(filterableColumns) ?? [])
  const resolvedDateColumns = computed(() => unref(dateColumns) ?? [])
  const resolvedSelectedRowIds = computed(() => unref(selectedRowIds))
  const routeSyncFilterIds = computed(() =>
    Array.from(
      new Set([
        ...resolvedSearchableColumns.value.map((column) => column.id),
        ...resolvedFilterableColumns.value.map((column) => column.id),
        ...resolvedDateColumns.value.map((column) => column.id),
        ...Object.keys(resolvedConfig.value.routeSync && typeof resolvedConfig.value.routeSync === 'object'
          ? resolvedConfig.value.routeSync.filterParamMap ?? {}
          : {}),
      ]),
    ),
  )
  const fallbackPageSize = computed(() =>
    normalizePageSize(resolvedConfig.value.pageSize ?? unref(defaultPageSize), 10, resolvedConfig.value.maxPageSize),
  )
  const routeSyncDefaults = computed(() => ({
    pageIndex: getInitialPageIndex(resolvedConfig.value),
    pageSize: fallbackPageSize.value,
    maxPageSize: resolvedConfig.value.maxPageSize,
    filterIds: routeSyncFilterIds.value,
  }))
  const persistedState = getDataTablePersistedState(resolvedConfig.value)
  const routeSyncedState = getDataTableRouteSyncedState(resolvedConfig.value, routeSyncDefaults.value)
  const rowSelection = ref<RowSelectionState>(getRowSelectionFromIds(resolvedSelectedRowIds.value))
  const columnVisibility = ref<VisibilityState>(
    persistedState.columnVisibility ?? resolvedConfig.value.initialColumnVisibility ?? {},
  )
  const columnFilters = ref<ColumnFiltersState>(
    routeSyncedState.columnFilters ?? resolvedConfig.value.initialFilters ?? [],
  )
  const sorting = ref<SortingState>(
    routeSyncedState.sorting ?? persistedState.sorting ?? resolvedConfig.value.initialSorting ?? [],
  )
  const expanded = ref<ExpandedState>(resolvedConfig.value.initialExpanded || {})
  const globalFilter = ref(toSearchText(routeSyncedState.globalFilter ?? resolvedConfig.value.initialSearch))

  const pagination = ref<PaginationState>({
    pageIndex: normalizePageIndex(
      routeSyncedState.pagination?.pageIndex ?? getInitialPageIndex(resolvedConfig.value),
    ),
    pageSize: normalizePageSize(
      routeSyncedState.pagination?.pageSize ?? persistedState.pageSize ?? fallbackPageSize.value,
      fallbackPageSize.value,
      resolvedConfig.value.maxPageSize,
    ),
  })
  const pageSize = computed(() => pagination.value.pageSize)

  watch(resolvedConfig, assertRowSelectionHasStableId, { immediate: true })

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
    return {
      id: filter.id,
      value: toDataTableFilterValue(filter.value),
      operator: getConfiguredFilterOperator(filter.id, filter.value),
    }
  }

  function getFilterMetadata(filters: DataTableFilterQuery[]): DataTableQuery['metadata'] {
    const columnSearchIds = new Set(resolvedSearchableColumns.value.map((column) => column.id))
    const facetedFilterIds = new Set(resolvedFilterableColumns.value.map((column) => column.id))
    const dateFilterIds = new Set(resolvedDateColumns.value.map((column) => column.id))

    const metadata: DataTableQuery['metadata'] = {}
    const searchValue = toSearchText(globalFilter.value).trim()

    if (searchValue && resolvedSearchColumnIds.value.length > 0) {
      metadata.globalSearch = {
        value: searchValue,
        columnIds: resolvedSearchColumnIds.value,
      }
    }

    metadata.columnSearch = filters.filter((filter) => columnSearchIds.has(filter.id))
    metadata.facetedFilters = filters.filter((filter) => facetedFilterIds.has(filter.id))
    metadata.dateFilters = filters.filter((filter) => dateFilterIds.has(filter.id))

    const hasMetadata =
      Boolean(metadata.globalSearch) ||
      metadata.columnSearch.length > 0 ||
      metadata.facetedFilters.length > 0 ||
      metadata.dateFilters.length > 0

    return hasMetadata ? metadata : undefined
  }

  function resetPageIndex() {
    if (pagination.value.pageIndex !== 0) {
      pagination.value = { ...pagination.value, pageIndex: 0 }
    }
  }

  const table = useVueTable({
    get data() {
      return unref(data)
    },
    get columns() {
      return unref(columns)
    },
    state: {
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
      get columnVisibility() {
        return columnVisibility.value
      },
      get rowSelection() {
        return rowSelection.value
      },
      get pagination() {
        return pagination.value
      },
      get expanded() {
        return expanded.value
      },
      get globalFilter() {
        return globalFilter.value
      },
    },
    get enableRowSelection() {
      return resolvedConfig.value.enableRowSelection ?? false
    },
    get enableMultiRowSelection() {
      return resolvedConfig.value.enableMultiRowSelection ?? true
    },
    // This table is intentionally server-side-only: parent pages own fetching and pass
    // the current page rows back after receiving update:query.
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    get pageCount() {
      const value = unref(pageCount)
      return typeof value === 'number' ? value : undefined
    },
    get rowCount() {
      if (typeof unref(pageCount) === 'number') return undefined
      const value = unref(rowCount)
      return typeof value === 'number' ? value : undefined
    },
    getRowId: (row, index, parent) => {
      return resolveRowId(row, index, parent?.original, resolvedConfig.value)
    },
    onSortingChange: (updaterOrValue) => {
      sorting.value = applyUpdater(sorting.value, updaterOrValue)
      resetPageIndex()
    },
    onColumnFiltersChange: (updaterOrValue) => {
      columnFilters.value = applyUpdater(columnFilters.value, updaterOrValue)
      resetPageIndex()
    },
    onColumnVisibilityChange: (updaterOrValue) => {
      columnVisibility.value = applyUpdater(columnVisibility.value, updaterOrValue)
    },
    onRowSelectionChange: (updaterOrValue) => {
      rowSelection.value = applyUpdater(rowSelection.value, updaterOrValue)
    },
    onPaginationChange: (updaterOrValue) => {
      pagination.value = applyUpdater(pagination.value, updaterOrValue)
    },
    onExpandedChange: (updaterOrValue) => {
      expanded.value = applyUpdater(expanded.value, updaterOrValue)
    },
    onGlobalFilterChange: (updaterOrValue) => {
      globalFilter.value = toSearchText(applyUpdater(globalFilter.value, updaterOrValue))
      resetPageIndex()
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    get getSubRows() {
      return resolvedConfig.value.getSubRows
    },
  })

  const query = computed<DataTableQuery>(() => {
    const searchValue = toSearchText(globalFilter.value).trim()
    const filters =
      columnFilters.value.length > 0 ? columnFilters.value.map((filter) => getFilterQuery(filter)) : []

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
      sort: sorting.value.length > 0 ? sorting.value : undefined,
      filters: filters.length > 0 ? filters : undefined,
      metadata: getFilterMetadata(filters),
    }
  })

  let searchDebounceTimeout: ReturnType<typeof window.setTimeout> | undefined
  let lastEmittedQueryKey = ''

  function emitQuery(nextQuery: DataTableQuery) {
    const queryKey = stableStringify(nextQuery)
    if (queryKey === lastEmittedQueryKey) return

    lastEmittedQueryKey = queryKey
    onQueryChange?.(nextQuery)
  }

  function shouldDebounceQuery(nextQuery: DataTableQuery, previousQuery?: DataTableQuery): boolean {
    if (!previousQuery) return false
    if (stableStringify(nextQuery.sort) !== stableStringify(previousQuery.sort)) return false
    if (nextQuery.pageSize !== previousQuery.pageSize) return false

    const searchableIds = new Set(resolvedSearchableColumns.value.map((column) => column.id))
    const previousSearch = previousQuery.search?.value ?? ''
    const nextSearch = nextQuery.search?.value ?? ''
    const globalSearchChanged = previousSearch !== nextSearch

    const previousFilters = previousQuery.filters ?? []
    const nextFilters = nextQuery.filters ?? []
    const filtersChanged = stableStringify(previousFilters) !== stableStringify(nextFilters)
    const searchFilterChanged =
      filtersChanged &&
      (nextFilters.some((filter) => searchableIds.has(filter.id)) ||
        previousFilters.some((filter) => searchableIds.has(filter.id)))
    const nonSearchFilterChanged =
      filtersChanged &&
      (nextFilters.some((filter) => !searchableIds.has(filter.id)) ||
        previousFilters.some((filter) => !searchableIds.has(filter.id)))

    if (!globalSearchChanged && !searchFilterChanged) return false
    if (nonSearchFilterChanged) return false

    return true
  }

  watch(
    query,
    (nextQuery, previousQuery) => {
      if (searchDebounceTimeout) {
        window.clearTimeout(searchDebounceTimeout)
        searchDebounceTimeout = undefined
      }

      if (shouldDebounceQuery(nextQuery, previousQuery)) {
        const delay =
          resolvedConfig.value.searchDebounce ??
          resolvedConfig.value.queryDebounce ??
          resolvedConfig.value.filterDebounce ??
          300
        searchDebounceTimeout = window.setTimeout(() => emitQuery(nextQuery), delay)
        return
      }

      emitQuery(nextQuery)
    },
    { deep: true, immediate: resolvedConfig.value.emitInitialQuery ?? false },
  )

  watch(
    columnFilters,
    (filters) => {
      const currentConfig = resolvedConfig.value
      if (!currentConfig.autoExpandAll) return

      const shouldConsider =
        Array.isArray(currentConfig.autoExpandOnFilterIds) &&
        currentConfig.autoExpandOnFilterIds.length > 0
      const hasTargetFilter = shouldConsider
        ? filters.some(
            (filter) =>
              currentConfig.autoExpandOnFilterIds!.includes(filter.id) &&
              filter.value !== null &&
              filter.value !== undefined &&
              filter.value !== '',
          )
        : filters.length > 0

      expanded.value = hasTargetFilter ? true : {}
    },
    { deep: true, immediate: true },
  )

  const selectedCurrentPageRows = computed(() =>
    table.getSelectedRowModel().rows.map((row) => row.original),
  )
  // Backward-compatible alias. In server-side mode this only contains current page rows.
  const selectedRows = selectedCurrentPageRows
  const selectedIds = computed(() => getSelectedIds(rowSelection.value))
  const hasSearchOrFilters = computed(() => columnFilters.value.length > 0 || Boolean(globalFilter.value))
  const hasActiveControls = computed(
    () => hasSearchOrFilters.value || sorting.value.length > 0 || selectedIds.value.length > 0,
  )
  const hasFilters = hasSearchOrFilters

  watch(
    resolvedSelectedRowIds,
    (ids) => {
      if (!ids) return

      const nextSelection = getRowSelectionFromIds(ids)
      if (areStringArraysEqual(getSelectedIds(nextSelection), selectedIds.value)) return

      rowSelection.value = nextSelection
    },
    { deep: true },
  )

  watch(
    selectedIds,
    (ids) => {
      const controlledIds = resolvedSelectedRowIds.value
      if (controlledIds && areStringArraysEqual(controlledIds, ids)) return

      onSelectionChange?.(ids)
    },
  )

  watch(
    [() => query.value.page, () => query.value.pageSize],
    () => {
      if (!resolvedConfig.value.clearSelectionOnPageChange) return
      resetSelection()
    },
  )

  watch(
    query,
    () => {
      if (!resolvedConfig.value.clearSelectionOnQueryChange) return
      resetSelection()
    },
    { deep: true },
  )

  watch(
    [() => unref(pageCount), () => pagination.value.pageIndex],
    ([nextPageCount]) => {
      if (typeof nextPageCount !== 'number') return

      const maxPageIndex = Math.max(nextPageCount - 1, 0)
      if (pagination.value.pageIndex <= maxPageIndex) return

      pagination.value = {
        ...pagination.value,
        pageIndex: maxPageIndex,
      }
    },
  )

  useDataTablePersistence({
    config: resolvedConfig,
    columnVisibility,
    pageSize,
    sorting,
  })

  useDataTableRouteSync({
    config: resolvedConfig,
    query,
    columnFilters,
    globalFilter,
    pagination,
    sorting,
    defaults: routeSyncDefaults,
  })

  function resetSelection() {
    rowSelection.value = {}
  }

  function resetFilters() {
    columnFilters.value = []
    sorting.value = []
    globalFilter.value = ''
    pagination.value = { ...pagination.value, pageIndex: 0 }
  }

  return {
    table,
    selectedRows,
    selectedCurrentPageRows,
    selectedIds,
    hasFilters,
    hasSearchOrFilters,
    hasActiveControls,
    resetSelection,
    resetFilters,
    rowSelection,
    expanded,
    globalFilter,
    query,
  }
}
