<script setup lang="ts" generic="TData">
import { computed, type ComponentPublicInstance, type CSSProperties, useSlots } from 'vue'
import {
  FlexRender,
  type Column,
  type Row,
  type Table as TanStackTable,
} from '@tanstack/vue-table'
import { ChevronDown, ChevronRight, Inbox } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { DataTableColumnStickyState } from './interface'

type RowElementRef = Element | ComponentPublicInstance | null
type StickySide = 'left' | 'right'
type StickyColumnKey = 'expand' | 'selection' | 'actions' | `column:${string}`

interface StickyRenderColumn {
  key: StickyColumnKey
  width: number
  side?: StickySide
}

interface StickyState {
  side: StickySide
  offset: number
  width: number
  isLeftEdge: boolean
  isRightEdge: boolean
}

const CONTROL_COLUMN_WIDTH = 40
const ACTION_COLUMN_WIDTH = 48
const DEFAULT_COLUMN_WIDTH = 150

interface DataTableBodyProps {
  table: TanStackTable<TData>
  isSelectionEnabled: boolean
  shouldRenderExpandColumn: boolean
  hasSelectableRows: boolean
  headerSelectionState: boolean | 'indeterminate'
  columnCount: number
  hasFilters: boolean
  isLoading: boolean
  skeletonRowCount: number
  effectiveExpansionMode: 'tree' | 'detail'
  setRowRef: (rowId: string, el: RowElementRef) => void
  isRowActionable: (row: Row<TData>) => boolean
  getRowTabIndex: (row: Row<TData>) => number | undefined
  getRowAriaLabel?: (row: TData) => string
  resetFilters: () => void
  stickyColumns?: DataTableColumnStickyState
  stickySelectionColumn?: boolean
  stickyExpansionColumn?: boolean
  stickyActionColumn?: boolean
}

const props = defineProps<DataTableBodyProps>()
const slots = useSlots()

const emit = defineEmits<{
  'header-selection-change': [value: boolean | 'indeterminate']
  'row-selection-change': [row: Row<TData>, value: boolean | 'indeterminate']
  'row-click': [event: MouseEvent, row: Row<TData>]
  'row-focus': [rowId: string]
  'row-keydown': [event: KeyboardEvent, row: Row<TData>]
}>()

function getRowAriaLabel(row: Row<TData>) {
  if (!props.isRowActionable(row)) return undefined
  return props.getRowAriaLabel?.(row.original) ?? `Thao tác dòng ${row.id}`
}

const skeletonRows = computed(() =>
  Array.from({ length: props.skeletonRowCount }, (_, index) => `skeleton-row-${index}`),
)

const skeletonCells = computed(() =>
  renderedColumns.value.map((column, index) => ({
    key: `skeleton-cell-${column.key}`,
    columnKey: column.key,
    index,
  })),
)

const emptyTitle = computed(() =>
  props.hasFilters ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu',
)

const emptyDescription = computed(() =>
  props.hasFilters
    ? 'Thử xóa bộ lọc hoặc thay đổi từ khóa tìm kiếm hiện tại.'
    : 'Dữ liệu sẽ hiển thị tại đây sau khi nguồn dữ liệu có bản ghi.',
)

const hasRowActions = computed(() => Boolean(slots['row-actions']))

const renderedColumns = computed<StickyRenderColumn[]>(() => {
  const columns: StickyRenderColumn[] = []

  if (props.shouldRenderExpandColumn) {
    columns.push({
      key: 'expand',
      width: CONTROL_COLUMN_WIDTH,
      side: props.stickyExpansionColumn ? 'left' : undefined,
    })
  }

  if (props.isSelectionEnabled) {
    columns.push({
      key: 'selection',
      width: CONTROL_COLUMN_WIDTH,
      side: props.stickySelectionColumn ? 'left' : undefined,
    })
  }

  props.table.getVisibleLeafColumns().forEach((column) => {
    columns.push({
      key: getColumnKey(column),
      width: getColumnWidth(column),
      side: getColumnStickySide(column),
    })
  })

  if (hasRowActions.value) {
    columns.push({
      key: 'actions',
      width: ACTION_COLUMN_WIDTH,
      side: props.stickyActionColumn ? 'right' : undefined,
    })
  }

  return columns
})

const stickyStateByKey = computed(() => {
  const map = new Map<StickyColumnKey, StickyState>()
  const leftColumns = renderedColumns.value.filter((column) => column.side === 'left')
  const rightColumns = renderedColumns.value.filter((column) => column.side === 'right')
  const lastLeftKey = leftColumns.at(-1)?.key
  const firstRightKey = rightColumns[0]?.key

  let leftOffset = 0
  renderedColumns.value.forEach((column) => {
    if (column.side !== 'left') return

    map.set(column.key, {
      side: 'left',
      offset: leftOffset,
      width: column.width,
      isLeftEdge: column.key === lastLeftKey,
      isRightEdge: false,
    })
    leftOffset += column.width
  })

  let rightOffset = 0
  const reversedColumns = [...renderedColumns.value].reverse()
  reversedColumns.forEach((column) => {
    if (column.side !== 'right') return

    map.set(column.key, {
      side: 'right',
      offset: rightOffset,
      width: column.width,
      isLeftEdge: false,
      isRightEdge: column.key === firstRightKey,
    })
    rightOffset += column.width
  })

  return map
})

const tableWidth = computed(() =>
  renderedColumns.value.reduce((total, column) => total + column.width, 0),
)

const columnWidthByKey = computed(() => {
  const map = new Map<StickyColumnKey, number>()

  renderedColumns.value.forEach((column) => {
    map.set(column.key, column.width)
  })

  return map
})

function getColumnKey(column: Column<TData, unknown>): StickyColumnKey {
  return `column:${column.id}`
}

function getColumnWidth(column: Column<TData, unknown>): number {
  const size = column.getSize()
  if (Number.isFinite(size) && size > 0) return size
  return column.columnDef.size ?? DEFAULT_COLUMN_WIDTH
}

function getColumnStickySide(column: Column<TData, unknown>): StickySide | undefined {
  const sticky = props.stickyColumns?.[column.id]
  return sticky === 'left' || sticky === 'right' ? sticky : undefined
}

function getColumnStyle(key: StickyColumnKey): CSSProperties | undefined {
  const sticky = stickyStateByKey.value.get(key)
  const width = sticky?.width ?? columnWidthByKey.value.get(key)
  if (!sticky && !width) return undefined

  const style: CSSProperties = {}

  if (width) {
    style.width = `${width}px`
    style.minWidth = `${width}px`
    style.maxWidth = `${width}px`
  }

  if (!sticky) return style

  style.position = 'sticky'
  if (sticky.side === 'left') {
    style.left = `${sticky.offset}px`
  } else {
    style.right = `${sticky.offset}px`
  }
  style.boxShadow = sticky.isLeftEdge
    ? '8px 0 14px -12px color-mix(in hsl, var(--color-foreground) 45%, transparent)'
    : sticky.isRightEdge
      ? '-8px 0 14px -12px color-mix(in hsl, var(--color-foreground) 45%, transparent)'
      : undefined
  style.backgroundClip = 'border-box'

  return style
}

function getSpanningCellStyle(): CSSProperties | undefined {
  if (tableWidth.value <= 0) return undefined
  return { minWidth: `${tableWidth.value}px` }
}

function getStickyClass(key: StickyColumnKey, layer: 'header' | 'body'): string | undefined {
  const sticky = stickyStateByKey.value.get(key)
  if (!sticky) return undefined

  return cn(
    layer === 'header'
      ? 'z-30 bg-muted'
      : 'z-20 bg-background group-hover:bg-muted group-data-[state=selected]:bg-muted',
    sticky.isLeftEdge && 'border-r border-border/80',
    sticky.isRightEdge && 'border-l border-border/80',
  )
}

function getSkeletonCellClass(index: number): string {
  if (props.columnCount <= 2) return 'h-4 w-full max-w-40'
  if (index === 0) return 'h-4 w-10'
  if (index === props.columnCount - 1) return 'h-4 w-16'
  if (index % 3 === 0) return 'h-4 w-28'
  if (index % 3 === 1) return 'h-4 w-44'
  return 'h-4 w-24'
}

function getTreeConnector(row: Row<TData>): string {
  if (row.depth === 0) return ''

  let current: Row<TData> | undefined = row
  const path: Row<TData>[] = []
  while (current && current.depth > 0) {
    path.push(current)
    current = current.getParentRow()
  }
  path.reverse()

  let result = ''
  for (let i = 0; i < path.length; i++) {
    const node = path[i]
    if (!node) continue
    const isCurrent = i === path.length - 1

    const parent = node.getParentRow()
    const siblings = parent?.subRows || []
    const isLast = siblings.length > 0 && siblings[siblings.length - 1]?.id === node.id

    if (isCurrent) {
      result += isLast ? '└── ' : '├── '
    } else {
      result += isLast ? '    ' : '│   '
    }
  }
  return result
}
</script>

<template>
  <colgroup>
    <col
      v-for="column in renderedColumns"
      :key="column.key"
      :style="{ width: `${column.width}px` }"
    >
  </colgroup>

  <TableHeader class="bg-muted/40">
    <TableRow v-for="(headerGroup, index) in table.getHeaderGroups()" :key="headerGroup.id">
      <TableHead
        v-if="shouldRenderExpandColumn && index === 0"
        :rowspan="table.getHeaderGroups().length"
        :class="cn('w-10 px-2', getStickyClass('expand', 'header'))"
        :style="getColumnStyle('expand')"
      />

      <TableHead
        v-if="isSelectionEnabled && index === 0"
        :rowspan="table.getHeaderGroups().length"
        :class="cn('w-10 px-2', getStickyClass('selection', 'header'))"
        :style="getColumnStyle('selection')"
      >
        <Checkbox
          :model-value="headerSelectionState"
          :disabled="!hasSelectableRows"
          aria-label="Chọn tất cả dòng trên trang hiện tại"
          class="checkbox-wrapper"
          @update:model-value="(value) => emit('header-selection-change', value)"
        />
      </TableHead>

      <TableHead
        v-for="header in headerGroup.headers"
        :key="header.id"
        :colspan="header.colSpan"
        :rowspan="header.rowSpan"
        :aria-sort="
          header.column.getCanSort()
            ? header.column.getIsSorted() === 'desc'
              ? 'descending'
              : header.column.getIsSorted() === 'asc'
                ? 'ascending'
                : 'none'
            : undefined
        "
        :class="cn('whitespace-nowrap', getStickyClass(getColumnKey(header.column), 'header'))"
        :style="getColumnStyle(getColumnKey(header.column))"
      >
        <FlexRender
          v-if="!header.isPlaceholder"
          :render="header.column.columnDef.header"
          :props="header.getContext()"
        />
      </TableHead>

      <TableHead
        v-if="$slots['row-actions'] && index === 0"
        :rowspan="table.getHeaderGroups().length"
        :class="cn('w-12 px-2', getStickyClass('actions', 'header'))"
        :style="getColumnStyle('actions')"
      />
    </TableRow>
  </TableHeader>

  <TableBody>
    <template v-if="table.getRowModel().rows.length">
      <template v-for="row in table.getRowModel().rows" :key="row.id">
        <TableRow
          :ref="(el) => setRowRef(row.id, el)"
          :data-state="row.getIsSelected() ? 'selected' : undefined"
          :data-expanded="row.getIsExpanded?.() ? 'true' : undefined"
          :data-row-id="row.id"
          :aria-selected="row.getIsSelected()"
          :aria-expanded="row.getCanExpand?.() ? row.getIsExpanded?.() : undefined"
          :tabindex="getRowTabIndex(row)"
          :aria-label="getRowAriaLabel(row)"
          :class="[
            'group hover:bg-muted/40',
            isRowActionable(row)
              ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              : undefined,
          ]"
          @click="(event: MouseEvent) => emit('row-click', event, row)"
          @focus="emit('row-focus', row.id)"
          @keydown="(event: KeyboardEvent) => emit('row-keydown', event, row)"
        >
          <TableCell
            v-if="shouldRenderExpandColumn"
            :class="cn('w-10 px-2', getStickyClass('expand', 'body'))"
            :style="getColumnStyle('expand')"
          >
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
              <component :is="row.getIsExpanded?.() ? ChevronDown : ChevronRight" class="h-4 w-4" />
            </Button>
          </TableCell>

          <TableCell
            v-if="isSelectionEnabled"
            :class="cn('w-10 px-2', getStickyClass('selection', 'body'))"
            :style="getColumnStyle('selection')"
            @click.stop
          >
            <Checkbox
              :model-value="
                row.getIsSelected() ? true : row.getIsSomeSelected() ? 'indeterminate' : false
              "
              :aria-label="`Chọn dòng ${row.id}`"
              class="checkbox-wrapper"
              @update:model-value="(value) => emit('row-selection-change', row, value)"
            />
          </TableCell>

          <TableCell
            v-for="(cell, cellIndex) in row.getVisibleCells()"
            :key="cell.id"
            :class="getStickyClass(getColumnKey(cell.column), 'body')"
            :style="getColumnStyle(getColumnKey(cell.column))"
          >
            <div :class="cellIndex === 0 && row.depth > 0 ? 'flex items-center' : ''">
              <span
                v-if="cellIndex === 0 && row.depth > 0"
                class="text-muted-foreground/45 font-mono select-none whitespace-pre"
              >
                {{ getTreeConnector(row) }}
              </span>
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </div>
          </TableCell>

          <TableCell
            v-if="$slots['row-actions']"
            :class="cn('w-12 px-2', getStickyClass('actions', 'body'))"
            :style="getColumnStyle('actions')"
            data-action="true"
          >
            <slot name="row-actions" :row="row" :row-data="row.original" />
          </TableCell>
        </TableRow>

        <TableRow
          v-if="row.getIsExpanded?.() && $slots['expanded-row'] && effectiveExpansionMode !== 'tree'"
          class="bg-muted/30 hover:bg-muted/30"
        >
          <TableCell :colspan="columnCount" class="border-t-0 p-0" :style="getSpanningCellStyle()">
            <slot name="expanded-row" :row="row" :row-data="row.original" />
          </TableCell>
        </TableRow>
      </template>
    </template>

    <template v-else-if="isLoading">
      <TableRow
        v-for="rowKey in skeletonRows"
        :key="rowKey"
        class="hover:bg-transparent"
        aria-hidden="true"
        data-test="data-table-skeleton-row"
      >
        <TableCell
          v-for="cell in skeletonCells"
          :key="cell.key"
          :class="cn('h-12 align-middle', getStickyClass(cell.columnKey, 'body'))"
          :style="getColumnStyle(cell.columnKey)"
        >
          <Skeleton :class="getSkeletonCellClass(cell.index)" />
        </TableCell>
      </TableRow>
    </template>

    <TableRow v-else>
      <TableCell :colspan="columnCount" class="h-32 text-center" :style="getSpanningCellStyle()">
        <slot name="empty">
          <div class="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Inbox class="h-8 w-8" />
            <div class="space-y-1">
              <p class="text-sm font-medium text-foreground">{{ emptyTitle }}</p>
              <p class="text-xs">{{ emptyDescription }}</p>
            </div>
            <Button
              v-if="hasFilters"
              type="button"
              variant="outline"
              size="sm"
              class="mt-2"
              @click="resetFilters"
            >
              Xóa bộ lọc
            </Button>
          </div>
        </slot>
      </TableCell>
    </TableRow>
  </TableBody>
</template>
