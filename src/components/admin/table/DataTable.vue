<script setup lang="ts" generic="TData">
import { computed, ref, toRef, useSlots, watch } from 'vue'
import type { ColumnDef, Row } from '@tanstack/vue-table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table } from '@/components/ui/table'
import DataTableBody from './DataTableBody.vue'
import DataTablePagination from './DataTablePagination.vue'
import DataTableStateOverlay from './DataTableStateOverlay.vue'
import DataTableToolbar from './DataTableToolbar.vue'
import { useDataTable } from './composables/useDataTable'
import { useDataTableRowInteraction } from './composables/useDataTableRowInteraction'
import { reportDuplicateDataTableRowId, resolveRowId } from './utils'
import type {
  DataTableConfig,
  DataTableColumnStickyState,
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableGlobalSearch,
  DataTableQuery,
  DataTableSearchableColumn,
  DataTableStickyColumnSide,
} from './interface'

interface DataTableProps {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  pageCount?: number
  rowCount?: number
  isLoading?: boolean
  error?: Error | string | null
  config?: DataTableConfig<TData>
  globalSearch?: DataTableGlobalSearch
  searchableColumns?: DataTableSearchableColumn[]
  filterableColumns?: DataTableFilterableColumn[]
  dateColumns?: DataTableDateColumn[]
  enableSelection?: boolean
  /**
   * Controlled selection source of truth.
   *
   * When this prop is an array, DataTable only emits `update:selectedRowIds`.
   * The checked visual state changes after the parent passes the next ids back.
   * Omit it or pass `undefined` for uncontrolled selection.
   */
  selectedRowIds?: string[]
  pageSizeOptions?: number[]
}

interface DataTableControlStickyOverrides {
  expansion?: boolean
  selection?: boolean
  actions?: boolean
}

const props = withDefaults(defineProps<DataTableProps>(), {
  isLoading: false,
  error: null,
  enableSelection: false,
  selectedRowIds: undefined,
  pageSizeOptions: () => [10, 20, 30, 50, 100],
})

const emit = defineEmits<{
  'update:query': [query: DataTableQuery]
  'update:selectedRowIds': [ids: string[]]
  'row-click': [rowData: TData]
  retry: []
}>()

const slots = useSlots()

if (import.meta.env.DEV) {
  watch(
    () => props.globalSearch,
    (gs) => {
      if (gs && gs.columnIds.length === 0) {
        console.warn(
          '[DataTable] globalSearch.columnIds is empty — global search input will be hidden.',
        )
      }
    },
    { immediate: true, deep: true },
  )

  const mode = props.config?.expansionMode
  if (mode === 'tree' && slots['expanded-row']) {
    console.warn(
      '[DataTable] expansionMode is "tree" but an expanded-row slot is provided. ' +
        'The expanded-row slot will be ignored for tree-mode tables. Remove the slot or set expansionMode to "detail".',
    )
  } else if (mode === 'detail' && props.config?.getSubRows) {
    console.warn(
      '[DataTable] expansionMode is "detail" but config.getSubRows is provided. ' +
        'getSubRows will be ignored for detail-mode tables. Remove getSubRows or set expansionMode to "tree".',
    )
  } else if (!mode && props.config?.getSubRows && slots['expanded-row']) {
    console.warn(
      '[DataTable] Both config.getSubRows and expanded-row slot are provided without an explicit expansionMode. ' +
        'This mixes tree and detail expansion, which can confuse users. Set config.expansionMode to "tree" or "detail".',
    )
  }

  // Warn when detail expansion is enabled but no expanded-row slot is provided.
  // The expand button will render and toggle state, but no content will appear below the row.
  if (
    props.config?.enableExpanding &&
    (mode === 'detail' || (!mode && !props.config?.getSubRows)) &&
    !slots['expanded-row']
  ) {
    console.warn(
      '[DataTable] Detail expansion is enabled but no expanded-row slot was provided. ' +
        'Rows will show expand toggles but no expanded content will render.',
    )
  }
}

const isSelectionEnabled = computed(
  () => props.enableSelection || props.config?.enableRowSelection === true,
)
const isRowClickEnabled = computed(() => props.config?.enableRowClick === true)
const tableConfig = computed<DataTableConfig<TData>>(() => ({
  ...props.config,
  enableRowSelection: isSelectionEnabled.value,
  expansionMode: effectiveExpansionMode.value,
}))
const searchColumnIds = computed(() => props.globalSearch?.columnIds ?? [])
const defaultPageSize = computed(() => props.pageSizeOptions[0] ?? 10)
const effectiveExpansionMode = computed(() => {
  if (props.config?.expansionMode) return props.config.expansionMode
  if (props.config?.getSubRows) return 'tree'
  return 'detail'
})

const {
  table,
  selectedIds,
  // Deprecated alias kept for backward-compatible slots/emits.
  // Use selectedCurrentPageRows for current-page data and selectedIds for bulk actions.
  selectedRows: selectedCurrentPageRows,
  hasFilters,
  query,
  resetFilters,
  resetTableControls,
  resetSelection,
  resetPersistenceToDefaults,
} = useDataTable<TData>({
  columns: toRef(props, 'columns'),
  data: toRef(props, 'data'),
  pageCount: toRef(props, 'pageCount'),
  rowCount: toRef(props, 'rowCount'),
  config: tableConfig,
  searchColumnIds,
  globalSearch: toRef(props, 'globalSearch'),
  searchableColumns: toRef(props, 'searchableColumns'),
  filterableColumns: toRef(props, 'filterableColumns'),
  dateColumns: toRef(props, 'dateColumns'),
  selectedRowIds: toRef(props, 'selectedRowIds'),
  isSelectionControlled: computed(() => props.selectedRowIds !== undefined),
  onQueryChange: (nextQuery) => emit('update:query', nextQuery),
  onSelectionChange: (ids) => emit('update:selectedRowIds', ids),
  defaultPageSize,
})

const tableRows = computed(() => table.getRowModel().rows)
const expandOnRowClick = computed(() => props.config?.expandOnRowClick === true)
const hasRenderedRows = computed(() => tableRows.value.length > 0)
const isTableLoading = computed(() => props.isLoading && !props.error)
const isInitialLoading = computed(() => isTableLoading.value && !hasRenderedRows.value)
const isBackgroundLoading = computed(() => isTableLoading.value && hasRenderedRows.value)
const isInteractionDisabled = computed(() => Boolean(props.error) || props.isLoading)
const skeletonRowCount = computed(() =>
  Math.max(1, Math.min(table.getState().pagination.pageSize, 10)),
)

const {
  getRowTabIndex,
  handleRowClick,
  handleRowFocus,
  handleRowKeydown,
  isRowActionable,
  setRowRef,
} = useDataTableRowInteraction<TData>({
  rows: tableRows,
  isRowClickEnabled,
  expandOnRowClick,
  onRowClick: (rowData) => emit('row-click', rowData),
})

const shouldRenderExpandColumn = computed(() => {
  return props.config?.enableExpanding === true
})

const hasSelectableRows = computed(() => table.getRowModel().rows.some((row) => row.getCanSelect()))

// columnCount calculates the exact number of cell columns rendered in the body rows
// (selection column + expandable column + visible leaf columns + actions column).
// This matches the TableBody cell rendering structure, making it correct for colspan
// on empty state and expanded rows even under complex multi-level/grouped headers.
// Note: slots['row-actions'] is reactive (via Vue 3 slots object), but dynamic
// slot toggling is uncommon. If slots change, the computed property will update.
const columnCount = computed(() => {
  let count = table.getVisibleLeafColumns().length
  if (isSelectionEnabled.value) count += 1
  if (shouldRenderExpandColumn.value) count += 1
  if (slots['row-actions']) count += 1
  return Math.max(count, 1)
})

const headerSelectionState = computed(() => {
  if (table.getIsAllPageRowsSelected()) return true
  if (table.getIsSomePageRowsSelected()) return 'indeterminate'
  return false
})

const stickyColumnOverrides = ref<DataTableColumnStickyState>({})
const controlStickyOverrides = ref<DataTableControlStickyOverrides>({})
const isColumnStickyEnabled = computed(() => tableConfig.value.enableColumnSticky !== false)
const metaStickyColumns = computed<DataTableColumnStickyState>(() => {
  const state: DataTableColumnStickyState = {}

  table.getAllLeafColumns().forEach((column) => {
    const sticky = column.columnDef.meta?.sticky
    if (sticky === 'left' || sticky === 'right') {
      state[column.id] = sticky
    }
  })

  return state
})
const stickyColumns = computed<DataTableColumnStickyState>(() => {
  if (!isColumnStickyEnabled.value) return {}

  const state: DataTableColumnStickyState = { ...metaStickyColumns.value }
  Object.entries(stickyColumnOverrides.value).forEach(([columnId, side]) => {
    if (side === 'left' || side === 'right') {
      state[columnId] = side
    } else {
      delete state[columnId]
    }
  })
  return state
})
const stickyExpansionColumn = computed(() =>
  isColumnStickyEnabled.value
  && Boolean(controlStickyOverrides.value.expansion ?? tableConfig.value.stickyExpansionColumn),
)
const stickySelectionColumn = computed(() =>
  isColumnStickyEnabled.value
  && Boolean(controlStickyOverrides.value.selection ?? tableConfig.value.stickySelectionColumn),
)
const stickyActionColumn = computed(() =>
  isColumnStickyEnabled.value
  && Boolean(controlStickyOverrides.value.actions ?? tableConfig.value.stickyActionColumn),
)
const stickyColumnsForToolbar = computed<DataTableColumnStickyState>(() => {
  if (!isColumnStickyEnabled.value) return {}

  const state: DataTableColumnStickyState = { ...stickyColumns.value }
  if (stickyExpansionColumn.value) state.__dataTableExpand = 'left'
  if (stickySelectionColumn.value) state.__dataTableSelection = 'left'
  if (stickyActionColumn.value) state.__dataTableActions = 'right'

  return state
})

function handleStickyColumnChange(columnId: string, side: DataTableStickyColumnSide | null) {
  if (!isColumnStickyEnabled.value) return

  stickyColumnOverrides.value = {
    ...stickyColumnOverrides.value,
    [columnId]: side,
  }
}

function clearStickyColumns() {
  const nextState: DataTableColumnStickyState = {}
  table.getAllLeafColumns().forEach((column) => {
    nextState[column.id] = null
  })
  controlStickyOverrides.value = {
    actions: false,
    expansion: false,
    selection: false,
  }
  stickyColumnOverrides.value = nextState
}

function resetStickyColumnsToDefaults() {
  controlStickyOverrides.value = {}
  stickyColumnOverrides.value = {}
}

function handleHeaderSelectionChange(value: boolean | 'indeterminate') {
  table.toggleAllPageRowsSelected(value === true)
}

function handleRowSelectionChange(row: Row<TData>, value: boolean | 'indeterminate') {
  row.toggleSelected(value === true)
}

if (import.meta.env.DEV) {
  watch(
    tableRows,
    (rows) => {
      const seen = new Set<string>()
      const resolved = tableConfig.value
      const getSubRows = resolved.getSubRows

      const dfs = (nodes: TData[], parent?: { original: TData; id?: string }) => {
        nodes.forEach((row, index) => {
          const id = resolveRowId(row, index, parent, resolved)
          if (seen.has(id)) {
            reportDuplicateDataTableRowId(id, resolved)
          }
          seen.add(id)
          const subRows = getSubRows?.(row)
          if (subRows && subRows.length > 0) {
            dfs(subRows, { original: row, id })
          }
        })
      }

      if (effectiveExpansionMode.value === 'tree' && resolved.enableExpanding) {
        dfs(props.data)
      } else {
        rows.forEach((row) => {
          if (seen.has(row.id)) {
            reportDuplicateDataTableRowId(row.id, resolved)
          }
          seen.add(row.id)
        })
      }
    },
    { deep: false, immediate: true },
  )

  const initialControlled = props.selectedRowIds !== undefined
  watch(
    () => props.selectedRowIds !== undefined,
    (next) => {
      if (next !== initialControlled) {
        console.warn(
          '[DataTable] Avoid switching selection between controlled and uncontrolled mode after mount.',
        )
      }
    },
  )
}

// Expose core table instance and utility helpers for parent component escapes.
// NOTE: Due to Vue 3 limitations with generic components, InstanceType<typeof DataTable>
// may resolve generic TData to unknown. Parent components can cast if generic type safety is required.
function resetAllTableState() {
  resetTableControls()
  resetSelection()
}

defineExpose({
  table,
  query,
  selectedIds,
  resetFilters,
  resetTableControls,
  resetSelection,
  resetAllTableState,
  resetPersistenceToDefaults,
})
</script>

<template>
  <div class="w-full min-w-0 max-w-full space-y-4">
    <DataTableToolbar
      :table="table"
      :global-search="globalSearch"
      :searchable-columns="searchableColumns"
      :filterable-columns="filterableColumns"
      :date-columns="dateColumns"
      :config="tableConfig"
      :selected-ids="selectedIds"
      :sticky-columns="stickyColumnsForToolbar"
      :enable-sticky-columns="isColumnStickyEnabled"
      :selected-rows="selectedCurrentPageRows"
      :selected-current-page-rows="selectedCurrentPageRows"
      @update:sticky-column="handleStickyColumnChange"
      @reset-sticky-columns="clearStickyColumns"
      @reset-sticky-columns-to-defaults="resetStickyColumnsToDefaults"
    >
      <template #left="{ table: t, selectedIds: ids, selectedRows, selectedCurrentPageRows: rows }">
        <!-- Deprecated: selectedRows is a backward-compatible alias for selectedCurrentPageRows. -->
        <slot
          name="toolbar-left"
          :table="t"
          :selected-ids="ids"
          :selected-rows="selectedRows"
          :selected-current-page-rows="rows"
        />
      </template>
      <template #filters="{ table: t }">
        <slot name="filters" :table="t" />
      </template>
      <template #actions="{ table: t }">
        <slot name="toolbar-right" :table="t" />
        <slot name="actions" :table="t" />
      </template>
      <template #bulk-actions="{ selectedRows, selectedCurrentPageRows: rows, selectedIds: ids }">
        <!-- Deprecated: selectedRows is a backward-compatible alias for selectedCurrentPageRows. -->
        <slot
          name="bulk-actions"
          :selected-rows="selectedRows"
          :selected-current-page-rows="rows"
          :selected-ids="ids"
        />
      </template>
    </DataTableToolbar>

    <slot name="before-table" :table="table" :query="query" />

    <div
      class="relative z-0 isolate max-w-full overflow-hidden rounded-md border bg-background"
      role="region"
      aria-label="Bảng dữ liệu"
      :aria-busy="isTableLoading ? 'true' : undefined"
    >
      <DataTableStateOverlay
        :is-loading="false"
        :is-refetching="isBackgroundLoading"
        :error="error"
        @retry="emit('retry')"
      >
        <template v-if="$slots.error" #error="{ error: currentError, retry }">
          <slot name="error" :error="currentError" :retry="retry" />
        </template>
        <template v-if="$slots['error-actions']" #error-actions>
          <slot name="error-actions" />
        </template>
      </DataTableStateOverlay>

      <ScrollArea
        scrollbar-orientation="horizontal"
        class="w-full min-w-0 max-w-full overflow-hidden transition-opacity"
        :class="isBackgroundLoading ? 'opacity-60' : undefined"
        :inert="isInteractionDisabled ? true : undefined"
      >
        <Table class="w-max min-w-full table-fixed" container-class="overflow-visible">
          <DataTableBody
            :table="table"
            :is-selection-enabled="isSelectionEnabled"
            :should-render-expand-column="shouldRenderExpandColumn"
            :has-selectable-rows="hasSelectableRows"
            :header-selection-state="headerSelectionState"
            :column-count="columnCount"
            :has-filters="hasFilters"
            :is-loading="isInitialLoading"
            :skeleton-row-count="skeletonRowCount"
            :effective-expansion-mode="effectiveExpansionMode"
            :set-row-ref="setRowRef"
            :is-row-actionable="isRowActionable"
            :get-row-tab-index="getRowTabIndex"
            :get-row-aria-label="tableConfig.getRowAriaLabel"
            :reset-filters="resetFilters"
            :sticky-columns="stickyColumns"
            :sticky-selection-column="stickySelectionColumn"
            :sticky-expansion-column="stickyExpansionColumn"
            :sticky-action-column="stickyActionColumn"
            @header-selection-change="handleHeaderSelectionChange"
            @row-selection-change="handleRowSelectionChange"
            @row-click="handleRowClick"
            @row-focus="handleRowFocus"
            @row-keydown="handleRowKeydown"
          >
            <template v-if="$slots['row-actions']" #row-actions="{ row, rowData }">
              <slot name="row-actions" :row="row" :row-data="rowData" />
            </template>
            <template v-if="$slots['expanded-row']" #expanded-row="{ row, rowData }">
              <slot name="expanded-row" :row="row" :row-data="rowData" />
            </template>
            <template v-if="$slots.empty" #empty>
              <slot name="empty" />
            </template>
          </DataTableBody>
        </Table>
      </ScrollArea>
    </div>

    <slot name="pagination" :table="table" :selected-ids="selectedIds">
      <DataTablePagination
        :table="table"
        :page-size-options="pageSizeOptions"
        :selected-ids="selectedIds"
        :max-page-size="tableConfig?.maxPageSize"
      />
    </slot>

    <!-- Backward-compatible slot declaration. Initial loading now renders skeleton rows only. -->
    <slot v-if="false" name="loading" />
  </div>
</template>
