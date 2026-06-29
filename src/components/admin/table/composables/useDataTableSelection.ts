import { ref, computed, watch, type Ref } from 'vue'
import type { RowSelectionState } from '@tanstack/vue-table'
import type { DataTableConfig } from '../interface'

function getRowSelectionFromIds(ids: string[] | undefined, multi = true): RowSelectionState {
  const normalized = multi ? (ids ?? []) : (ids?.slice(0, 1) ?? [])
  return normalized.reduce<RowSelectionState>((selection, id) => {
    selection[id] = true
    return selection
  }, {})
}

function getSelectedIds(selection: RowSelectionState): string[] {
  return Object.keys(selection).filter((id) => selection[id])
}

interface UseDataTableSelectionProps<TData> {
  resolvedConfig: Ref<DataTableConfig<TData>>
  resolvedSelectedRowIds: Ref<string[] | undefined>
  resolvedIsSelectionControlled: Ref<boolean>
  nonPaginationQueryKey: Ref<string>
  queryPage: Ref<number>
  queryPageSize: Ref<number>
  onSelectionChange?: (ids: string[]) => void
}

export function useDataTableSelection<TData>({
  resolvedConfig,
  resolvedSelectedRowIds,
  resolvedIsSelectionControlled,
  nonPaginationQueryKey,
  queryPage,
  queryPageSize,
  onSelectionChange,
}: UseDataTableSelectionProps<TData>) {
  const uncontrolledRowSelection = ref<RowSelectionState>(
    getRowSelectionFromIds(
      resolvedSelectedRowIds.value,
      resolvedConfig.value.enableMultiRowSelection ?? true,
    ),
  )

  const rowSelection = computed<RowSelectionState>({
    get: () => {
      if (resolvedIsSelectionControlled.value) {
        return getRowSelectionFromIds(
          resolvedSelectedRowIds.value,
          resolvedConfig.value.enableMultiRowSelection ?? true,
        )
      }
      return uncontrolledRowSelection.value
    },
    set: (val) => {
      if (resolvedIsSelectionControlled.value) {
        onSelectionChange?.(getSelectedIds(val))
      } else {
        uncontrolledRowSelection.value = val
        onSelectionChange?.(getSelectedIds(val))
      }
    },
  })

  const selectedIds = computed(() => getSelectedIds(rowSelection.value))

  watch(
    [nonPaginationQueryKey, queryPage, queryPageSize],
    ([nextKey, nextPage, nextSize], [prevKey, prevPage, prevSize]) => {
      const isPageChange = prevPage !== undefined && (nextPage !== prevPage || nextSize !== prevSize)
      const isQueryChange = prevKey !== undefined && nextKey !== prevKey

      const clearOnQuery = resolvedConfig.value.clearSelectionOnQueryChange ?? true
      const clearOnPage = resolvedConfig.value.clearSelectionOnPageChange ?? true

      const shouldClear =
        (clearOnQuery && isQueryChange) ||
        (clearOnPage && isPageChange)

      if (shouldClear) {
        resetSelection()
      }
    },
  )

  function resetSelection() {
    if (resolvedIsSelectionControlled.value) {
      if (selectedIds.value.length === 0) return
      onSelectionChange?.([])
    } else {
      if (Object.keys(uncontrolledRowSelection.value).length === 0) return
      uncontrolledRowSelection.value = {}
      onSelectionChange?.([])
    }
  }

  return {
    rowSelection,
    selectedIds,
    resetSelection,
  }
}
