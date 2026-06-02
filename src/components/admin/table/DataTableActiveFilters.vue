<script setup lang="ts" generic="TData">
import { computed, type Component } from 'vue'
import type { Column, ColumnFilter, Table } from '@tanstack/vue-table'
import { X } from 'lucide-vue-next'
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

    if (!valueLabel) return

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

  return filters
})

function getGlobalFilterText(): string {
  const value = props.table.getState().globalFilter
  return typeof value === 'string' ? value : ''
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
    return (
      columnConfig.config.getLabel?.(filter.value) ?? (filter.value ? String(filter.value) : null)
    )
  }

  if (columnConfig?.type === 'filter') {
    if (columnConfig.config.getLabel) {
      return columnConfig.config.getLabel(filter.value, columnConfig.config.options)
    }
    return getOptionLabels(filter.value, columnConfig.config.options) || null
  }

  if (columnConfig?.type === 'date') {
    if (columnConfig.config.getLabel) return columnConfig.config.getLabel(filter.value)
    return formatDateRangeValue(filter.value)
  }

  const metaOptions = column?.columnDef.meta?.options as DataTableFilterOption[] | undefined
  if (metaOptions?.length) return getOptionLabels(filter.value, metaOptions) || null

  return filter.value ? String(filter.value) : null
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

function resetFilters() {
  props.table.resetColumnFilters()
  props.table.resetSorting()
  props.table.setGlobalFilter('')
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
      :key="`${filter.type}-${filter.id}-${filter.value}`"
      variant="outline"
      class="max-w-full gap-1.5 rounded-md border-dashed px-2 py-1 text-sm font-normal"
    >
      <span class="text-muted-foreground">{{ filter.label }}</span>
      <span class="h-3 w-px bg-border" />
      <span class="max-w-55 truncate text-foreground">{{ filter.value }}</span>
      <button
        type="button"
        :aria-label="`Xóa điều kiện ${filter.label}`"
        class="rounded-full p-0.5 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        @click="removeFilter(filter)"
      >
        <X class="h-3 w-3 text-muted-foreground" />
      </button>
    </Badge>

    <Button
      key="clear-all"
      variant="ghost"
      size="sm"
      class="h-8 px-2 text-destructive hover:text-destructive"
      @click="resetFilters"
    >
      Xóa tất cả điều kiện
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
