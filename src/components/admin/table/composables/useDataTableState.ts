import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import { ref, watch, type Ref } from 'vue'
import type { DataTableConfig } from '../interface'
import { normalizePageIndex } from '../utils'
import type { RouteSyncedTableState } from './route-sync'
import type { DataTablePersistedState } from './useDataTablePersistence'
import { toSearchText } from './useDataTableQuery'

export function getInitialPageIndex<TData>(config: DataTableConfig<TData>): number {
  return normalizePageIndex(config.initialPageIndex ?? config.initialPage ?? 0)
}

export function getColumnDefId<TData>(column: ColumnDef<TData, unknown>): string | undefined {
  const candidate =
    (column as { id?: unknown; accessorKey?: unknown }).id ??
    (column as { id?: unknown; accessorKey?: unknown }).accessorKey
  return typeof candidate === 'string' ? candidate : undefined
}

export function sanitizeColumnVisibilityState(
  visibility: VisibilityState,
  columnIds: Set<string>,
): VisibilityState {
  if (columnIds.size === 0) return visibility

  const hasVisibleColumn = Array.from(columnIds).some((id) => visibility[id] !== false)
  return hasVisibleColumn ? visibility : {}
}

export function sanitizeSortingState(
  sorting: SortingState,
  columnIds: Set<string>,
): SortingState {
  if (columnIds.size === 0) return sorting

  const sanitized = sorting.filter((sort) => columnIds.has(sort.id))
  return sanitized.length === sorting.length ? sorting : sanitized
}

interface UseDataTableStateProps<TData> {
  resolvedConfig: Ref<DataTableConfig<TData>>
  resolvedColumnIdSet: Ref<Set<string>>
  persistedState: DataTablePersistedState
  routeSyncedState: RouteSyncedTableState
}

export function useDataTableState<TData>({
  resolvedConfig,
  resolvedColumnIdSet,
  persistedState,
  routeSyncedState,
}: UseDataTableStateProps<TData>) {
  const columnVisibility = ref<VisibilityState>(
    sanitizeColumnVisibilityState(
      persistedState.columnVisibility ?? resolvedConfig.value.initialColumnVisibility ?? {},
      resolvedColumnIdSet.value,
    ),
  )
  const columnFilters = ref<ColumnFiltersState>(
    routeSyncedState.columnFilters ?? resolvedConfig.value.initialFilters ?? [],
  )
  const sorting = ref<SortingState>(
    sanitizeSortingState(
      routeSyncedState.sorting ?? persistedState.sorting ?? resolvedConfig.value.initialSorting ?? [],
      resolvedColumnIdSet.value,
    ),
  )
  const globalFilter = ref(
    toSearchText(routeSyncedState.globalFilter ?? resolvedConfig.value.initialSearch),
  )

  watch(
    [columnVisibility, resolvedColumnIdSet],
    ([nextVisibility, nextColumnIds]) => {
      const sanitized = sanitizeColumnVisibilityState(nextVisibility, nextColumnIds)
      if (sanitized !== nextVisibility) {
        columnVisibility.value = sanitized
      }
    },
    { deep: true },
  )

  watch(
    [sorting, resolvedColumnIdSet],
    ([nextSorting, nextColumnIds]) => {
      const sanitized = sanitizeSortingState(nextSorting, nextColumnIds)
      if (sanitized !== nextSorting) {
        sorting.value = sanitized
      }
    },
    { deep: true },
  )

  return {
    columnVisibility,
    columnFilters,
    sorting,
    globalFilter,
  }
}

