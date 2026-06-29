import { ref, watch, unref, type Ref } from 'vue'
import type { ColumnFiltersState, ExpandedState } from '@tanstack/vue-table'
import type { DataTableConfig } from '../interface'
import { resolveRowId } from '../utils'

interface UseDataTableExpansionProps<TData> {
  data: TData[] | Ref<TData[]>
  resolvedConfig: Ref<DataTableConfig<TData>>
  columnFilters: Ref<ColumnFiltersState>
}

export function useDataTableExpansion<TData>({
  data,
  resolvedConfig,
  columnFilters,
}: UseDataTableExpansionProps<TData>) {
  const expanded = ref<ExpandedState>(resolvedConfig.value.initialExpanded || {})

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
              !(Array.isArray(filter.value) && filter.value.length === 0) &&
              filter.value !== null &&
              filter.value !== undefined &&
              filter.value !== '',
          )
        : filters.length > 0

      expanded.value = hasTargetFilter ? true : {}
    },
    { deep: true, immediate: true },
  )

  watch(
    () => unref(data),
    (nextData) => {
      if (!resolvedConfig.value.enableExpanding) return
      if (resolvedConfig.value.autoExpandAll) return
      if (expanded.value === true) return

      const currentExpanded = expanded.value
      if (
        typeof currentExpanded === 'object' &&
        currentExpanded !== null &&
        Object.keys(currentExpanded).length === 0
      ) {
        return
      }

      // Prune expanded state on data changes to prevent memory leaks or inconsistent states.
      // Performs a depth-first search (DFS) with O(N) complexity where N is the number of rows in the dataset.
      const getRowIdsRecursive = (
        rows: TData[],
        parent: { original: TData; id?: string } | undefined = undefined,
      ): string[] => {
        const ids: string[] = []
        rows.forEach((row, i) => {
          const id = resolveRowId(row, i, parent, resolvedConfig.value)
          ids.push(id)
          const subRows =
            resolvedConfig.value.expansionMode === 'detail'
              ? undefined
              : resolvedConfig.value.getSubRows?.(row)
          if (subRows && subRows.length > 0) {
            ids.push(...getRowIdsRecursive(subRows, { original: row, id }))
          }
        })
        return ids
      }

      const currentIds = new Set(getRowIdsRecursive(nextData))
      const pruned = Object.fromEntries(
        Object.entries(currentExpanded as Record<string, boolean>).filter(([id]) =>
          currentIds.has(id),
        ),
      )
      if (Object.keys(pruned).length !== Object.keys(currentExpanded).length) {
        expanded.value = pruned
      }
    },
    { deep: false },
  )

  return {
    expanded,
  }
}
