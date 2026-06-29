import { ref, watch, type ComponentPublicInstance, type Ref } from 'vue'
import type { Row } from '@tanstack/vue-table'

export type DataTableRowElementRef = Element | ComponentPublicInstance | null

interface UseDataTableRowInteractionProps<TData> {
  rows: Ref<Row<TData>[]>
  isRowClickEnabled: Ref<boolean>
  expandOnRowClick: Ref<boolean>
  onRowClick: (rowData: TData) => void
}

export function useDataTableRowInteraction<TData>({
  rows,
  isRowClickEnabled,
  expandOnRowClick,
  onRowClick,
}: UseDataTableRowInteractionProps<TData>) {
  const rowRefs = ref<Record<string, DataTableRowElementRef>>({})
  const activeFocusedRowId = ref<string | null>(null)

  function setRowRef(rowId: string, el: DataTableRowElementRef) {
    if (el) {
      rowRefs.value[rowId] = el
    } else {
      delete rowRefs.value[rowId]
    }
  }

  function getRowEl(rowId: string): HTMLElement | null {
    const refVal = rowRefs.value[rowId]
    if (!refVal) return null
    return ('$el' in refVal ? refVal.$el : refVal) as HTMLElement
  }

  function isRowActionable(row: Row<TData>) {
    return isRowClickEnabled.value || Boolean(expandOnRowClick.value && row.getCanExpand?.())
  }

  function shouldIgnoreRowClick(event: MouseEvent | KeyboardEvent) {
    const target = event.target as HTMLElement | null
    if (!target) return true

    const rowEl = event.currentTarget as HTMLElement | null

    // Keyboard Enter/Space should not be blocked by lingering text selection in the row.
    if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
      const selection =
        typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null
      const isSelectionInRow = Boolean(
        selection?.toString() && rowEl && rowEl.contains(selection.anchorNode ?? null),
      )
      if (isSelectionInRow) return true
    }

    if (
      target.closest('[contenteditable]:not([contenteditable="false"])') ||
      target.closest('[data-ignore-row-click="true"]')
    ) {
      return true
    }

    const focusable = target.closest('[tabindex]:not([tabindex="-1"])')
    if (focusable && focusable !== rowEl) {
      return true
    }

    return Boolean(
      target.closest('.checkbox-wrapper') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('[role="checkbox"]') ||
        target.closest('[role="button"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-action="true"]'),
    )
  }

  function handleRowClick(event: MouseEvent, row: Row<TData>) {
    if (!isRowActionable(row)) return
    if (shouldIgnoreRowClick(event)) return

    if (expandOnRowClick.value && row.getCanExpand?.()) {
      row.toggleExpanded()
      return
    }

    if (isRowClickEnabled.value) {
      onRowClick(row.original)
    }
  }

  function handleRowFocus(rowId: string) {
    activeFocusedRowId.value = rowId
  }

  function getRowTabIndex(row: Row<TData>) {
    if (!isRowActionable(row)) return undefined
    if (activeFocusedRowId.value === null) {
      const firstRow = rows.value.find(isRowActionable)
      return firstRow?.id === row.id ? 0 : -1
    }
    return activeFocusedRowId.value === row.id ? 0 : -1
  }

  function handleRowKeydown(event: KeyboardEvent, row: Row<TData>) {
    if (!isRowActionable(row)) return
    if (shouldIgnoreRowClick(event)) return

    const actionableRows = rows.value.filter(isRowActionable)
    const currentIndex = actionableRows.findIndex((r) => r.id === row.id)

    if (currentIndex === -1 || actionableRows.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextRow = actionableRows[(currentIndex + 1) % actionableRows.length]
      if (nextRow) {
        activeFocusedRowId.value = nextRow.id
        getRowEl(nextRow.id)?.focus()
      }
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prevRow =
        actionableRows[(currentIndex - 1 + actionableRows.length) % actionableRows.length]
      if (prevRow) {
        activeFocusedRowId.value = prevRow.id
        getRowEl(prevRow.id)?.focus()
      }
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()

    if (expandOnRowClick.value && row.getCanExpand?.()) {
      row.toggleExpanded()
      return
    }

    if (isRowClickEnabled.value) {
      onRowClick(row.original)
    }
  }

  watch(
    rows,
    (nextRows) => {
      const actionableIds = nextRows.filter(isRowActionable).map((row) => row.id)
      if (activeFocusedRowId.value && !actionableIds.includes(activeFocusedRowId.value)) {
        activeFocusedRowId.value = null
      }

      const idSet = new Set(nextRows.map((row) => row.id))
      Object.keys(rowRefs.value).forEach((id) => {
        if (!idSet.has(id)) {
          delete rowRefs.value[id]
        }
      })
    },
    { deep: false, immediate: true },
  )

  return {
    activeFocusedRowId,
    getRowTabIndex,
    handleRowClick,
    handleRowFocus,
    handleRowKeydown,
    isRowActionable,
    setRowRef,
  }
}
