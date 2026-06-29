import type { ColumnDef } from '@tanstack/vue-table'
import { computed, inject, unref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import type {
  DataTableConfig,
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableGlobalSearch,
  DataTableQuery,
  DataTableSearchableColumn,
} from '../interface'
import { normalizePageIndex, normalizePageSize, stableStringify } from '../utils'
import {
  getDataTablePersistedState,
  useDataTablePersistence,
  DATA_TABLE_STORAGE_PREFIX_KEY,
} from './useDataTablePersistence'
import {
  getDataTableRouteSyncedState,
  useDataTableRouteSync,
} from './useDataTableRouteSync'
import {
  useDataTableDevWarnings,
  assertRowSelectionHasStableId,
  assertRowExpandingHasStableId,
} from './useDataTableDevWarnings'
import { useDataTableSelection } from './useDataTableSelection'
import { useDataTableExpansion } from './useDataTableExpansion'
import { useDataTableQuery } from './useDataTableQuery'
import {
  getColumnDefId,
  getInitialPageIndex,
  useDataTableState,
} from './useDataTableState'
import { useDataTableReset } from './useDataTableReset'
import { useDataTableInstance } from './useDataTableInstance'

interface UseDataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[] | Ref<ColumnDef<TData, unknown>[]>
  data: TData[] | Ref<TData[]>
  pageCount?: number | Ref<number | undefined>
  rowCount?: number | Ref<number | undefined>
  config?: DataTableConfig<TData> | Ref<DataTableConfig<TData> | undefined>
  /** @deprecated Use globalSearch.columnIds / globalSearch prop instead. */
  searchColumnIds?: string[] | Ref<string[]>
  globalSearch?: DataTableGlobalSearch | Ref<DataTableGlobalSearch | undefined>
  searchableColumns?: DataTableSearchableColumn[] | Ref<DataTableSearchableColumn[] | undefined>
  filterableColumns?: DataTableFilterableColumn[] | Ref<DataTableFilterableColumn[] | undefined>
  dateColumns?: DataTableDateColumn[] | Ref<DataTableDateColumn[] | undefined>
  selectedRowIds?: string[] | Ref<string[] | undefined>
  isSelectionControlled?: boolean | Ref<boolean>
  onQueryChange?: (query: DataTableQuery) => void
  onSelectionChange?: (ids: string[]) => void
  defaultPageSize?: number | Ref<number>
}

export function useDataTable<TData>({
  columns,
  data,
  pageCount,
  rowCount,
  config = {},
  searchColumnIds = [],
  globalSearch,
  searchableColumns = [],
  filterableColumns = [],
  dateColumns = [],
  selectedRowIds,
  isSelectionControlled,
  onQueryChange,
  onSelectionChange,
  defaultPageSize = 10,
}: UseDataTableProps<TData>) {
  const resolvedConfig = computed(() => unref(config) ?? {})
  const resolvedGlobalSearch = computed(() => unref(globalSearch))
  const resolvedSearchColumnIds = computed(() => {
    const ids = unref(searchColumnIds)
    return ids.length > 0 ? ids : (resolvedGlobalSearch.value?.columnIds ?? [])
  })
  const resolvedSearchableColumns = computed(() => unref(searchableColumns) ?? [])
  const resolvedFilterableColumns = computed(() => unref(filterableColumns) ?? [])
  const resolvedDateColumns = computed(() => unref(dateColumns) ?? [])
  const resolvedColumnIdSet = computed(
    () => new Set(unref(columns).map(getColumnDefId).filter((id): id is string => Boolean(id))),
  )
  const resolvedSelectedRowIds = computed(() => unref(selectedRowIds))
  const resolvedIsSelectionControlled = computed(
    () => unref(isSelectionControlled) ?? (resolvedSelectedRowIds.value !== undefined),
  )
  const columnSearchIdSet = computed(
    () => new Set(resolvedSearchableColumns.value.map((column) => column.id)),
  )
  const facetedFilterIdSet = computed(
    () => new Set(resolvedFilterableColumns.value.map((column) => column.id)),
  )
  const dateFilterIdSet = computed(
    () => new Set(resolvedDateColumns.value.map((column) => column.id)),
  )
  const routeSyncObject = computed(() =>
    resolvedConfig.value.routeSync && typeof resolvedConfig.value.routeSync === 'object'
      ? resolvedConfig.value.routeSync
      : {},
  )
  const routeSyncFilterIds = computed(() =>
    Array.from(
      new Set([
        ...resolvedSearchableColumns.value.map((column) => column.id),
        ...resolvedFilterableColumns.value.map((column) => column.id),
        ...resolvedDateColumns.value.map((column) => column.id),
        ...(routeSyncObject.value.filterIds ?? []),
        ...Object.keys(routeSyncObject.value.filterParamMap ?? {}),
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
    columnIds: Array.from(resolvedColumnIdSet.value),
    sortIds: Array.from(resolvedColumnIdSet.value),
    filterIds: routeSyncFilterIds.value,
    arrayFilterIds: Array.from(
      new Set([
        ...resolvedFilterableColumns.value.map((column) => column.id),
        ...(routeSyncObject.value.arrayFilterIds ?? []),
      ]),
    ),
    stringFilterIds: Array.from(
      new Set([
        ...resolvedSearchableColumns.value.map((column) => column.id),
        ...resolvedFilterableColumns.value.map((column) => column.id),
        ...(routeSyncObject.value.stringFilterIds ?? []),
      ]),
    ),
    numericFilterIds: Array.from(
      new Set(routeSyncObject.value.numericFilterIds ?? []),
    ),
    booleanFilterIds: Array.from(
      new Set(routeSyncObject.value.booleanFilterIds ?? []),
    ),
    dateColumnIds: resolvedDateColumns.value.map((column) => column.id),
  }))
  const injectedPrefix = inject(DATA_TABLE_STORAGE_PREFIX_KEY, 'dt')
  const persistedState = getDataTablePersistedState(resolvedConfig.value, injectedPrefix)
  let route: ReturnType<typeof useRoute> | undefined
  if (resolvedConfig.value.routeSync) {
    try {
      route = useRoute()
    } catch {
      // Fail-safe if called outside setup context
    }
  }
  const routeSyncedState = getDataTableRouteSyncedState(
    resolvedConfig.value,
    routeSyncDefaults.value,
    route?.query,
  )

  // 1. Diagnostics (Development warnings)
  useDataTableDevWarnings({
    columns,
    resolvedSearchableColumns,
    resolvedFilterableColumns,
    resolvedDateColumns,
    resolvedConfig,
    resolvedSelectedRowIds,
  })

  // 2. Table state definitions
  const {
    columnVisibility,
    columnFilters,
    sorting,
    globalFilter,
  } = useDataTableState({
    resolvedConfig,
    resolvedColumnIdSet,
    persistedState,
    routeSyncedState,
  })

  watch(
    resolvedConfig,
    (config) => {
      assertRowSelectionHasStableId(config)
      assertRowExpandingHasStableId(config)
    },
    { immediate: true },
  )

  // 3. Sub-composables orchestration
  // A. Query Compiling, Debouncing & Emission
  const initialPageIndex = normalizePageIndex(
    routeSyncedState.pagination?.pageIndex ?? getInitialPageIndex(resolvedConfig.value),
  )
  const initialPageSize = normalizePageSize(
    routeSyncedState.pagination?.pageSize ?? persistedState.pageSize ?? fallbackPageSize.value,
    fallbackPageSize.value,
    resolvedConfig.value.maxPageSize,
  )

  const {
    pagination,
    query,
    nonPaginationQueryKey,
    syncedQuery,
    routeAppliedQueryKey,
    resetPageIndex,
  } = useDataTableQuery({
    resolvedConfig,
    globalFilter,
    columnFilters,
    sorting,
    pageCount: computed(() => unref(pageCount)),
    rowCount: computed(() => unref(rowCount)),
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
  })

  // B. Selection management (no table dependency — avoids circular ref)
  const {
    rowSelection,
    selectedIds,
    resetSelection,
  } = useDataTableSelection<TData>({
    resolvedConfig,
    resolvedSelectedRowIds,
    resolvedIsSelectionControlled,
    nonPaginationQueryKey,
    queryPage: computed(() => query.value.page),
    queryPageSize: computed(() => query.value.pageSize),
    onSelectionChange,
  })

  // C. Expansion management
  const { expanded } = useDataTableExpansion({
    data,
    resolvedConfig,
    columnFilters,
  })

  // D. Reset actions
  const {
    resetTableControls,
    resetPersistenceToDefaults,
  } = useDataTableReset({
    resolvedConfig,
    resolvedColumnIdSet,
    columnVisibility,
    columnFilters,
    sorting,
    globalFilter,
    pagination,
    fallbackPageSize,
    storagePrefix: injectedPrefix,
  })

  // 4. TanStack Table Core instance
  const table = useDataTableInstance({
    columns,
    data,
    pageCount,
    rowCount,
    resolvedConfig,
    sorting,
    columnFilters,
    columnVisibility,
    rowSelection,
    pagination,
    expanded,
    globalFilter,
    resetPageIndex,
    resetTableControls,
  })

  // 5. Derived selection computeds (depend on table, computed after table creation)
  const selectedCurrentPageRows = computed(() =>
    table.getSelectedRowModel().rows.map((row) => row.original),
  )
  // Deprecated alias. Keep selectedCurrentPageRows explicit in new parent code.
  const selectedRows = selectedCurrentPageRows

  // 6. Persistence & Route sync integration hooks
  const pageSize = computed(() => pagination.value.pageSize)

  useDataTablePersistence({
    config: resolvedConfig,
    columnVisibility,
    pageSize,
    sorting,
    storagePrefix: injectedPrefix,
  })

  useDataTableRouteSync({
    config: resolvedConfig,
    query: syncedQuery,
    columnFilters,
    globalFilter,
    pagination,
    sorting,
    defaults: routeSyncDefaults,
    route,
    onRouteStateApplied: () => {
      routeAppliedQueryKey.value = stableStringify(query.value)
    },
  })

  const hasSearchOrFilters = computed(() => columnFilters.value.length > 0 || Boolean(globalFilter.value))
  /**
   * Tracks if there are active table controls (filters, sorting, or row selection).
   * Note: This includes row selection (selectedIds) as an active control state.
   */
  const hasActiveControls = computed(
    () => hasSearchOrFilters.value || sorting.value.length > 0 || selectedIds.value.length > 0,
  )
  const hasFilters = hasSearchOrFilters

  return {
    table,
    selectedRows,
    selectedCurrentPageRows,
    selectedIds,
    hasFilters,
    hasSearchOrFilters,
    hasActiveControls,
    resetSelection,
    resetFilters: resetTableControls,
    resetTableControls,
    resetPersistenceToDefaults,
    expanded,
    globalFilter,
    query,
  }
}
