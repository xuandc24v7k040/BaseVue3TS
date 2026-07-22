<script setup lang="ts" generic="TData">
import { computed, watch } from 'vue'
import type { Table } from '@tanstack/vue-table'
import type {
  DataTableDateColumn,
  DataTableConfig,
  DataTableColumnStickyState,
  DataTableFilterableColumn,
  DataTableGlobalSearch,
  DataTableSearchableColumn,
  DataTableStickyColumnSide,
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
  stickyColumns?: DataTableColumnStickyState
  enableStickyColumns?: boolean
  /** @deprecated Use selectedCurrentPageRows for current-page data and selectedIds for bulk actions. */
  selectedRows?: TData[]
  selectedCurrentPageRows?: TData[]
}

const props = withDefaults(defineProps<DataTableToolbarProps>(), {
  searchableColumns: () => [],
  filterableColumns: () => [],
  dateColumns: () => [],
  selectedIds: () => [],
  stickyColumns: () => ({}),
  enableStickyColumns: true,
  selectedRows: () => [],
  selectedCurrentPageRows: () => [],
})

const emit = defineEmits<{
  'update:sticky-column': [columnId: string, side: DataTableStickyColumnSide | null]
  'reset-sticky-columns': []
  'reset-sticky-columns-to-defaults': []
}>()

const hasSecondaryControls = computed(
  () =>
    props.selectedIds.length > 0 ||
    props.filterableColumns.length > 0 ||
    props.dateColumns.length > 0,
)

function getDateFilterValue(columnId: string): DateRangeValue | string | undefined {
  const value = props.table.getColumn(columnId)?.getFilterValue()
  if (isDateRangeValue(value)) return value
  if (typeof value === 'string' && value !== '') return value
  return undefined
}

const columnIdSet = computed(
  () => new Set(props.table.getAllColumns().map((c) => c.id))
)

const configuredIdsSet = computed(() => {
  const ids = [
    ...(props.globalSearch?.columnIds ?? []),
    ...props.searchableColumns.map((column) => column.id),
    ...props.filterableColumns.map((column) => column.id),
    ...props.dateColumns.map((column) => column.id),
  ]
  return new Set(ids)
})

if (import.meta.env.DEV) {
  watch(
    [columnIdSet, configuredIdsSet],
    () => {
      configuredIdsSet.value.forEach((id) => {
        if (!columnIdSet.value.has(id)) {
          console.warn(`[DataTable] Column id "${id}" is configured in toolbar but does not exist.`)
        }
      })
    },
    { immediate: true, deep: true }
  )
}
</script>

<template>
  <div class="min-w-0 max-w-full space-y-3">
    <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

      <div class="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
        <slot name="actions" :table="table" />
        <DataTableViewOptions
          v-if="config?.enableColumnVisibility !== false"
          :table="table"
          :sticky-columns="stickyColumns"
          :enable-sticky-columns="enableStickyColumns"
          @update:sticky-column="
            (columnId, side) => emit('update:sticky-column', columnId, side)
          "
          @reset-sticky-columns="emit('reset-sticky-columns')"
          @reset-sticky-columns-to-defaults="emit('reset-sticky-columns-to-defaults')"
        />
      </div>
    </div>

    <div
      v-if="hasSecondaryControls || $slots.filters || $slots['bulk-actions']"
      class="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
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
        :table="table"
        :column="table.getColumn(column.id)"
        :title="column.title"
        :options="column.options"
        :multiple="column.multiple !== false"
      />

      <DataTableDateRangeFilter
        v-for="column in dateColumns"
        :key="column.id"
        :model-value="getDateFilterValue(column.id)"
        :placeholder="column.placeholder || column.title"
        :mode="column.mode"
        :enable-presets="column.enablePresets"
        :disable-future-dates="column.disableFutureDates"
        :disable-past-dates="column.disablePastDates"
        :min-value="column.minValue"
        :max-value="column.maxValue"
        :locale="column.locale"
        :date-style="column.dateStyle"
        :date-format-pattern="column.dateFormatPattern"
        :preset-end-time="column.presetEndTime"
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
