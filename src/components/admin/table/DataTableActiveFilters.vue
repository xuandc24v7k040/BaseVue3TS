<script setup lang="ts" generic="TData">
import { computed, type Component } from 'vue'
import type { Column, ColumnFilter, Table } from '@tanstack/vue-table'
import { X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableFilterOption,
  DataTableGlobalSearch,
  DataTableSearchableColumn,
} from './interface'
import { formatDateRangeValue, getColumnTitle, getOptionLabels } from './utils'

interface DataTableActiveFiltersProps {
  table: Table<TData>
  globalSearch?: DataTableGlobalSearch
  searchableColumns?: DataTableSearchableColumn[]
  filterableColumns?: DataTableFilterableColumn[]
  dateColumns?: DataTableDateColumn[]
}

type ColumnConfig =
  | { type: 'filter'; config: DataTableFilterableColumn }
  | { type: 'date'; config: DataTableDateColumn }
  | { type: 'search'; config: DataTableSearchableColumn }

interface ActiveFilter {
  id: string
  label: string
  value: string
  type: 'search' | 'filter' | 'date' | 'sorting' | 'global'
  icon?: Component
}

const props = withDefaults(defineProps<DataTableActiveFiltersProps>(), {
  searchableColumns: () => [],
  filterableColumns: () => [],
  dateColumns: () => [],
})

const columnConfigMap = computed(() => {
  const map = new Map<string, ColumnConfig>()

  props.filterableColumns.forEach((column) =>
    map.set(column.id, { type: 'filter', config: column }),
  )
  props.dateColumns.forEach((column) => map.set(column.id, { type: 'date', config: column }))
  props.searchableColumns.forEach((column) =>
    map.set(column.id, { type: 'search', config: column }),
  )

  return map
})

const activeFilters = computed<ActiveFilter[]>(() => {
  const filters: ActiveFilter[] = []
  const globalFilter = getGlobalFilterText()

  if (globalFilter) {
    filters.push({
      id: '__global__',
      label: props.globalSearch?.title || 'Tìm kiếm',
      value: globalFilter,
      type: 'global',
    })
  }

  props.table.getState().columnFilters.forEach((filter) => {
    const column = props.table.getColumn(filter.id)
    const columnConfig = columnConfigMap.value.get(filter.id)
    const valueLabel = getFilterLabel(filter, columnConfig, column)

    if (valueLabel === null) return

    filters.push({
      id: filter.id,
      label: getFilterTitle(filter, columnConfig, column),
      value: valueLabel,
      type: columnConfig?.type || 'search',
    })
  })

  props.table.getState().sorting.forEach((sort) => {
    const column = props.table.getColumn(sort.id)
    if (!column) return

    filters.push({
      id: sort.id,
      label: `Sắp xếp: ${getColumnTitle(column)}`,
      value: sort.desc ? 'Giảm dần' : 'Tăng dần',
      type: 'sorting',
    })
  })

  const seen = new Set<string>()
  return filters.filter((filter) => {
    const key = `${filter.type}-${filter.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

function getGlobalFilterText(): string {
  const value = props.table.getState().globalFilter
  return typeof value === 'string' ? value.trim() : ''
}

function isEmptyFilterValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function getFilterTitle(
  filter: ColumnFilter,
  columnConfig: ColumnConfig | undefined,
  column: Column<TData, unknown> | undefined,
): string {
  if (columnConfig) return columnConfig.config.title
  return column ? getColumnTitle(column) : filter.id
}

function getFilterLabel(
  filter: ColumnFilter,
  columnConfig: ColumnConfig | undefined,
  column: Column<TData, unknown> | undefined,
): string | null {
  if (columnConfig?.type === 'search') {
    if (isEmptyFilterValue(filter.value)) return null
    return columnConfig.config.getLabel?.(filter.value) ?? String(filter.value)
  }

  if (columnConfig?.type === 'filter') {
    if (isEmptyFilterValue(filter.value)) return null

    if (columnConfig.config.getLabel) {
      return columnConfig.config.getLabel(filter.value, columnConfig.config.options)
    }

    return getOptionLabels(filter.value, columnConfig.config.options) || String(filter.value)
  }

  if (columnConfig?.type === 'date') {
    if (columnConfig.config.getLabel) return columnConfig.config.getLabel(filter.value)
    const formatted = formatDateRangeValue(
      filter.value,
      columnConfig.config.locale ?? 'vi-VN',
      columnConfig.config.dateStyle ?? 'medium',
      columnConfig.config.mode ?? 'range',
      columnConfig.config.dateFormatPattern,
    )
    if (formatted) return formatted
    if (typeof filter.value === 'object' && filter.value !== null) {
      const obj = filter.value as Record<string, unknown>
      if ('start' in obj || 'end' in obj) {
        return 'Giá trị ngày không hợp lệ'
      }
    }
    return String(filter.value)
  }

  const metaOptions = column?.columnDef.meta?.options as DataTableFilterOption[] | undefined
  if (metaOptions?.length) return getOptionLabels(filter.value, metaOptions) || String(filter.value)

  return isEmptyFilterValue(filter.value) ? null : String(filter.value)
}

function removeFilter(filter: ActiveFilter) {
  if (filter.type === 'global') {
    props.table.setGlobalFilter('')
    return
  }

  const column = props.table.getColumn(filter.id)

  if (filter.type === 'sorting') {
    column?.clearSorting()
    return
  }

  column?.setFilterValue(undefined)
}

// NOTE: "Xóa tất cả" clears both filters and sorting to restore default table controls.
// Since sorting chips also appear in the active filters bar, resetting both provides
// a consistent user experience.
function resetFilters() {
  if (props.table.options.meta?.resetTableControls) {
    props.table.options.meta.resetTableControls()
  } else if (props.table.options.meta?.resetFilters) {
    props.table.options.meta.resetFilters()
  } else {
    props.table.resetColumnFilters()
    props.table.resetSorting()
    props.table.setGlobalFilter('')
  }
}
</script>

<template>
  <TransitionGroup
    v-if="activeFilters.length > 0"
    name="filter-chip"
    tag="div"
    class="flex flex-wrap items-center gap-2"
  >
    <Badge
      v-for="filter in activeFilters"
      :key="`${filter.type}-${filter.id}`"
      variant="outline"
      class="min-h-7 max-w-full items-center gap-1.5 overflow-hidden rounded-md border-border/70 bg-background/80 px-2 py-1 text-xs font-normal shadow-xs"
    >
      <span class="min-w-0 max-w-36 shrink truncate text-muted-foreground">{{ filter.label }}</span>
      <span class="h-3.5 w-px shrink-0 bg-border" />
      <span class="min-w-0 max-w-60 truncate font-medium text-foreground">{{ filter.value }}</span>
      <button
        type="button"
        :aria-label="`Xóa điều kiện ${filter.label}`"
        class="ml-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        @click="removeFilter(filter)"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </Badge>

    <Button
      key="clear-all"
      variant="ghost"
      size="sm"
      class="h-auto min-h-8 max-w-full justify-start whitespace-normal px-2 text-left text-destructive hover:text-destructive"
      @click="resetFilters"
    >
      Xóa tất cả bộ lọc và sắp xếp
    </Button>
  </TransitionGroup>
</template>

<style scoped>
.filter-chip-move,
.filter-chip-enter-active,
.filter-chip-leave-active {
  transition: all 0.18s ease;
}

.filter-chip-enter-from,
.filter-chip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.filter-chip-leave-active {
  position: absolute;
}
</style>
