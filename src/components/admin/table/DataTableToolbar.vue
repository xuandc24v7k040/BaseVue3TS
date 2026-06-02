<script setup lang="ts" generic="TData">
import { computed, watch } from 'vue'
import type { Table } from '@tanstack/vue-table'
import type {
  DataTableDateColumn,
  DataTableConfig,
  DataTableFilterableColumn,
  DataTableGlobalSearch,
  DataTableSearchableColumn,
  DateRangeValue,
} from './interface'
import DataTableActiveFilters from './DataTableActiveFilters.vue'
import DataTableDateRangeFilter from './DataTableDateRangeFilter.vue'
import DataTableFacetedFilter from './DataTableFacetedFilter.vue'
import DataTableSearchControls from './DataTableSearchControls.vue'
import DataTableViewOptions from './DataTableViewOptions.vue'
import { isDateRangeValue } from './utils'

interface DataTableToolbarProps {
  table: Table<TData>
  globalSearch?: DataTableGlobalSearch
  searchableColumns?: DataTableSearchableColumn[]
  filterableColumns?: DataTableFilterableColumn[]
  dateColumns?: DataTableDateColumn[]
  config?: DataTableConfig<TData>
  selectedIds?: string[]
  selectedRows?: TData[]
  selectedCurrentPageRows?: TData[]
}

const props = withDefaults(defineProps<DataTableToolbarProps>(), {
  searchableColumns: () => [],
  filterableColumns: () => [],
  dateColumns: () => [],
  selectedIds: () => [],
  selectedRows: () => [],
  selectedCurrentPageRows: () => [],
})

const hasSecondaryControls = computed(
  () =>
    props.selectedIds.length > 0 ||
    props.filterableColumns.length > 0 ||
    props.dateColumns.length > 0,
)

function getDateFilterValue(columnId: string): DateRangeValue | undefined {
  const value = props.table.getColumn(columnId)?.getFilterValue()
  return isDateRangeValue(value) ? value : undefined
}

function warnMissingColumnIds() {
  if (!import.meta.env.DEV) return

  const existingColumnIds = new Set(props.table.getAllColumns().map((column) => column.id))
  const configuredIds = [
    ...(props.globalSearch?.columnIds ?? []),
    ...props.searchableColumns.map((column) => column.id),
    ...props.filterableColumns.map((column) => column.id),
    ...props.dateColumns.map((column) => column.id),
  ]

  configuredIds.forEach((id) => {
    if (!existingColumnIds.has(id)) {
      console.warn(`[DataTable] Column id "${id}" is configured in toolbar but does not exist.`)
    }
  })
}

watch(
  () => [
    props.table.getAllColumns().map((column) => column.id).join('|'),
    props.globalSearch?.columnIds.join('|') ?? '',
    props.searchableColumns.map((column) => column.id).join('|'),
    props.filterableColumns.map((column) => column.id).join('|'),
    props.dateColumns.map((column) => column.id).join('|'),
  ],
  warnMissingColumnIds,
  { immediate: true },
)
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <slot
          name="left"
          :table="table"
          :selected-ids="selectedIds"
          :selected-rows="selectedRows"
          :selected-current-page-rows="selectedCurrentPageRows"
        />

        <DataTableSearchControls
          :table="table"
          :global-search="globalSearch"
          :searchable-columns="searchableColumns"
        />
      </div>

      <div class="flex shrink-0 items-center justify-end gap-2">
        <slot name="actions" :table="table" />
        <DataTableViewOptions v-if="config?.enableColumnVisibility !== false" :table="table" />
      </div>
    </div>

    <div
      v-if="hasSecondaryControls || $slots.filters || $slots['bulk-actions']"
      class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <div v-if="selectedIds.length > 0" class="flex flex-wrap gap-2">
        <slot
          name="bulk-actions"
          :selected-rows="selectedCurrentPageRows"
          :selected-current-page-rows="selectedCurrentPageRows"
          :selected-ids="selectedIds"
        />
      </div>

      <div
        v-if="selectedIds.length > 0 && (filterableColumns.length || dateColumns.length)"
        class="hidden h-5 w-px bg-border sm:block"
      />

      <DataTableFacetedFilter
        v-for="column in filterableColumns"
        :key="column.id"
        :column="table.getColumn(column.id)"
        :title="column.title"
        :options="column.options"
      />

      <DataTableDateRangeFilter
        v-for="column in dateColumns"
        :key="column.id"
        :model-value="getDateFilterValue(column.id)"
        :placeholder="column.placeholder || column.title"
        @update:model-value="(value) => table.getColumn(column.id)?.setFilterValue(value)"
      />

      <slot name="filters" :table="table" />
    </div>

    <DataTableActiveFilters
      :table="table"
      :global-search="globalSearch"
      :searchable-columns="searchableColumns"
      :filterable-columns="filterableColumns"
      :date-columns="dateColumns"
    />
  </div>
</template>
