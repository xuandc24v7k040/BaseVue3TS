<script setup lang="ts" generic="TData">
import { computed, toRef, useAttrs, useSlots } from 'vue'
import type { ColumnDef, Row } from '@tanstack/vue-table'
import { FlexRender } from '@tanstack/vue-table'
import { ChevronDown, ChevronRight, Inbox } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import DataTablePagination from './DataTablePagination.vue'
import DataTableStateOverlay from './DataTableStateOverlay.vue'
import DataTableToolbar from './DataTableToolbar.vue'
import { useDataTable } from './composables/useDataTable'
import type {
  DataTableConfig,
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableGlobalSearch,
  DataTableQuery,
  DataTableSearchableColumn,
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
  selectedRowIds?: string[]
  pageSizeOptions?: number[]
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
const attrs = useAttrs()
const isSelectionEnabled = computed(
  () => props.enableSelection || props.config?.enableRowSelection === true,
)
const isRowInteractive = computed(
  () => Boolean(props.config?.expandOnRowClick) || Boolean(attrs.onRowClick),
)
const tableConfig = computed<DataTableConfig<TData>>(() => ({
  ...props.config,
  enableRowSelection: isSelectionEnabled.value,
}))
const searchColumnIds = computed(() => props.globalSearch?.columnIds ?? [])
const defaultPageSize = computed(() => props.pageSizeOptions[0] ?? 10)

const {
  table,
  selectedIds,
  // selectedRows is kept for backward-compatible slots/emits; in server-side mode
  // it only contains rows from the current page.
  selectedRows: selectedCurrentPageRows,
  hasFilters,
  rowSelection,
  query,
} = useDataTable<TData>({
  columns: toRef(props, 'columns'),
  data: toRef(props, 'data'),
  pageCount: toRef(props, 'pageCount'),
  rowCount: toRef(props, 'rowCount'),
  config: tableConfig,
  searchColumnIds,
  searchableColumns: toRef(props, 'searchableColumns'),
  filterableColumns: toRef(props, 'filterableColumns'),
  dateColumns: toRef(props, 'dateColumns'),
  selectedRowIds: toRef(props, 'selectedRowIds'),
  onQueryChange: (nextQuery) => emit('update:query', nextQuery),
  onSelectionChange: (ids) => emit('update:selectedRowIds', ids),
  defaultPageSize,
})

const columnCount = computed(() => {
  let count = table.getVisibleLeafColumns().length
  if (isSelectionEnabled.value) count += 1
  if (props.config?.enableExpanding) count += 1
  if (slots['row-actions']) count += 1
  return Math.max(count, 1)
})

const headerSelectionState = computed(() => {
  if (table.getIsAllPageRowsSelected()) return true
  if (table.getIsSomePageRowsSelected()) return 'indeterminate'
  return false
})

function handleHeaderSelectionChange(value: boolean | 'indeterminate') {
  table.toggleAllPageRowsSelected(value === true)
}

function handleRowSelectionChange(row: Row<TData>, value: boolean | 'indeterminate') {
  row.toggleSelected(value === true)
}

function handleRowClick(event: MouseEvent, row: Row<TData>) {
  const target = event.target as HTMLElement | null
  if (!target || shouldIgnoreRowClick(target)) return

  if (props.config?.expandOnRowClick && row.getCanExpand?.()) {
    row.toggleExpanded()
    return
  }

  emit('row-click', row.original)
}

function shouldIgnoreRowClick(target: HTMLElement) {
  return Boolean(
    target.closest('.checkbox-wrapper') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="checkbox"]') ||
      target.closest('[data-action="true"]') ||
      window.getSelection()?.toString(),
  )
}
</script>

<template>
  <div class="w-full space-y-4">
    <DataTableToolbar
      :table="table"
      :global-search="globalSearch"
      :searchable-columns="searchableColumns"
      :filterable-columns="filterableColumns"
      :date-columns="dateColumns"
      :config="tableConfig"
      :selected-ids="selectedIds"
      :selected-rows="selectedCurrentPageRows"
      :selected-current-page-rows="selectedCurrentPageRows"
    >
      <template #left="{ table: t, selectedIds: ids, selectedRows, selectedCurrentPageRows: rows }">
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
      class="relative overflow-hidden rounded-md border bg-background"
      role="region"
      aria-label="Bảng dữ liệu"
    >
      <DataTableStateOverlay :is-loading="isLoading" :error="error" @retry="emit('retry')">
        <template v-if="$slots.error" #error="{ error: currentError, retry }">
          <slot name="error" :error="currentError" :retry="retry" />
        </template>
        <template v-if="$slots['error-actions']" #error-actions>
          <slot name="error-actions" />
        </template>
        <template v-if="$slots.loading" #loading>
          <slot name="loading" />
        </template>
      </DataTableStateOverlay>

      <div class="overflow-x-auto">
        <Table>
          <TableHeader class="bg-muted/40">
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead v-if="config?.enableExpanding" class="w-10 px-2" />

              <TableHead v-if="isSelectionEnabled" class="w-10 px-2">
                <Checkbox
                  :model-value="headerSelectionState"
                  aria-label="Chọn tất cả dòng"
                  class="checkbox-wrapper"
                  @update:model-value="handleHeaderSelectionChange"
                />
              </TableHead>

              <TableHead v-for="header in headerGroup.headers" :key="header.id" class="whitespace-nowrap">
                <FlexRender
                  v-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </TableHead>

              <TableHead v-if="slots['row-actions']" class="w-12 px-2" />
            </TableRow>
          </TableHeader>

          <TableBody>
            <template v-if="table.getRowModel().rows.length">
              <template v-for="row in table.getRowModel().rows" :key="row.id">
                <TableRow
                  :data-state="row.getIsSelected() ? 'selected' : undefined"
                  :data-expanded="row.getIsExpanded?.() ? 'true' : undefined"
                  :aria-selected="row.getIsSelected()"
                  :aria-expanded="row.getCanExpand?.() ? row.getIsExpanded?.() : undefined"
                  :class="[
                    'group hover:bg-muted/40',
                    isRowInteractive ? 'cursor-pointer' : undefined,
                  ]"
                  @click="(event: MouseEvent) => handleRowClick(event, row)"
                >
                  <TableCell v-if="config?.enableExpanding" class="w-10 px-2">
                    <Button
                      v-if="row.getCanExpand?.()"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7"
                      data-action="true"
                      :aria-label="row.getIsExpanded?.() ? `Thu gọn dòng ${row.id}` : `Mở rộng dòng ${row.id}`"
                      @click.stop="row.toggleExpanded()"
                    >
                      <span class="sr-only">
                        {{ row.getIsExpanded?.() ? 'Thu gọn dòng' : 'Mở rộng dòng' }}
                      </span>
                      <component
                        :is="row.getIsExpanded?.() ? ChevronDown : ChevronRight"
                        class="h-4 w-4"
                      />
                    </Button>
                  </TableCell>

                  <TableCell v-if="isSelectionEnabled" class="w-10 px-2">
                    <Checkbox
                      :model-value="!!rowSelection[row.id]"
                      :aria-label="`Chọn dòng ${row.id}`"
                      class="checkbox-wrapper"
                      @update:model-value="(value) => handleRowSelectionChange(row, value)"
                    />
                  </TableCell>

                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>

                  <TableCell v-if="slots['row-actions']" class="w-12 px-2" data-action="true">
                    <slot name="row-actions" :row="row" :row-data="row.original" />
                  </TableCell>
                </TableRow>

                <TableRow
                  v-if="row.getIsExpanded?.() && slots['expanded-row']"
                  class="bg-muted/30 hover:bg-muted/30"
                >
                  <TableCell :colspan="columnCount" class="border-t-0 p-0">
                    <slot name="expanded-row" :row="row" :row-data="row.original" />
                  </TableCell>
                </TableRow>
              </template>
            </template>

            <TableRow v-else>
              <TableCell :colspan="columnCount" class="h-32 text-center">
                <slot name="empty">
                  <div class="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                    <Inbox class="h-8 w-8" />
                    <div class="space-y-1">
                      <p class="text-sm font-medium text-foreground">Không có dữ liệu</p>
                      <p v-if="hasFilters" class="text-xs">
                        Thử xóa bộ lọc để xem thêm kết quả.
                      </p>
                    </div>
                  </div>
                </slot>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <slot name="pagination" :table="table" :selected-ids="selectedIds">
      <DataTablePagination
        :table="table"
        :page-size-options="pageSizeOptions"
        :selected-ids="selectedIds"
        :max-page-size="config?.maxPageSize"
      />
    </slot>
  </div>
</template>
