import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import type { Ref } from 'vue'
import type { DataTableConfig } from '../interface'
import { clearDataTablePersistedState } from './useDataTablePersistence'
import {
  getInitialPageIndex,
  sanitizeColumnVisibilityState,
  sanitizeSortingState,
} from './useDataTableState'

interface UseDataTableResetProps<TData> {
  resolvedConfig: Ref<DataTableConfig<TData>>
  resolvedColumnIdSet: Ref<Set<string>>
  columnVisibility: Ref<VisibilityState>
  columnFilters: Ref<ColumnFiltersState>
  sorting: Ref<SortingState>
  globalFilter: Ref<string>
  pagination: Ref<PaginationState>
  fallbackPageSize: Ref<number>
  storagePrefix?: string
}

export function useDataTableReset<TData>({
  resolvedConfig,
  resolvedColumnIdSet,
  columnVisibility,
  columnFilters,
  sorting,
  globalFilter,
  pagination,
  fallbackPageSize,
  storagePrefix,
}: UseDataTableResetProps<TData>) {
  function resetTableControls() {
    columnFilters.value = []
    sorting.value = []
    globalFilter.value = ''
    pagination.value = { ...pagination.value, pageIndex: 0 }
  }

  function resetPersistenceToDefaults() {
    // Clears persisted user preferences, resets table to defaults,
    // and lets the persistence watcher store the default state again.
    clearDataTablePersistedState(resolvedConfig.value, storagePrefix)
    columnVisibility.value = sanitizeColumnVisibilityState(
      resolvedConfig.value.initialColumnVisibility ?? {},
      resolvedColumnIdSet.value,
    )
    sorting.value = sanitizeSortingState(
      resolvedConfig.value.initialSorting ?? [],
      resolvedColumnIdSet.value,
    )
    columnFilters.value = resolvedConfig.value.initialFilters ?? []
    globalFilter.value = resolvedConfig.value.initialSearch ?? ''
    pagination.value = {
      pageIndex: getInitialPageIndex(resolvedConfig.value),
      pageSize: fallbackPageSize.value,
    }
  }

  return {
    resetTableControls,
    resetPersistenceToDefaults,
  }
}

