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
import { unref, type Ref } from 'vue'
import type { DataTableConfig } from '../interface'
import { resolveRowId } from '../utils'
import { toSearchText } from './useDataTableQuery'

function applyUpdater<TValue>(currentValue: TValue, updaterOrValue: Updater<TValue>): TValue {
  return typeof updaterOrValue === 'function'
    ? (updaterOrValue as (old: TValue) => TValue)(currentValue)
    : updaterOrValue
}

interface UseDataTableInstanceProps<TData> {
  columns: ColumnDef<TData, unknown>[] | Ref<ColumnDef<TData, unknown>[]>
  data: TData[] | Ref<TData[]>
  pageCount?: number | Ref<number | undefined>
  rowCount?: number | Ref<number | undefined>
  resolvedConfig: Ref<DataTableConfig<TData>>
  sorting: Ref<SortingState>
  columnFilters: Ref<ColumnFiltersState>
  columnVisibility: Ref<VisibilityState>
  rowSelection: Ref<RowSelectionState>
  pagination: Ref<PaginationState>
  expanded: Ref<ExpandedState>
  globalFilter: Ref<string>
  resetPageIndex: () => void
  resetTableControls: () => void
}

export function useDataTableInstance<TData>({
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
}: UseDataTableInstanceProps<TData>) {
  return useVueTable({
    get data() {
      return unref(data)
    },
    get columns() {
      return unref(columns)
    },
    initialState: {
      get columnVisibility() {
        return resolvedConfig.value.initialColumnVisibility ?? {}
      },
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
      return resolveRowId(row, index, parent, resolvedConfig.value)
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
      return resolvedConfig.value.expansionMode === 'detail'
        ? undefined
        : resolvedConfig.value.getSubRows
    },
    getRowCanExpand: (row) => {
      const config = resolvedConfig.value
      if (!config.enableExpanding) return false
      if (config.getRowCanExpand) {
        return config.getRowCanExpand(row.original)
      }
      if (config.expansionMode === 'detail') {
        return true
      }
      return (row.subRows?.length ?? 0) > 0
    },
    meta: {
      resetFilters: resetTableControls,
      resetTableControls,
    },
  })
}

