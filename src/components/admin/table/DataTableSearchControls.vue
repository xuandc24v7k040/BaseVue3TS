<script setup lang="ts" generic="TData">
import { ref, watch } from 'vue'
import type { Table } from '@tanstack/vue-table'
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import type { DataTableGlobalSearch, DataTableSearchableColumn } from './interface'

interface DataTableSearchControlsProps {
  table: Table<TData>
  globalSearch?: DataTableGlobalSearch
  searchableColumns?: DataTableSearchableColumn[]
}

const props = withDefaults(defineProps<DataTableSearchControlsProps>(), {
  searchableColumns: () => [],
})

const searchValues = ref<Record<string, string>>({})
const globalSearchValue = ref(getGlobalFilterText())

props.searchableColumns.forEach((column) => {
  searchValues.value[column.id] = getColumnFilterText(column.id)
})

function getColumnFilterText(columnId?: string): string {
  if (!columnId) return ''

  const value = props.table.getColumn(columnId)?.getFilterValue()
  return typeof value === 'string' ? value : ''
}

function getGlobalFilterText(): string {
  const value = props.table.getState().globalFilter
  return typeof value === 'string' ? value : ''
}

function updateSearch(columnId: string, value: string | number) {
  const stringValue = String(value)
  searchValues.value[columnId] = stringValue
  props.table.getColumn(columnId)?.setFilterValue(stringValue || undefined)
}

function updateGlobalSearch(value: string | number) {
  const stringValue = String(value)
  globalSearchValue.value = stringValue
  props.table.setGlobalFilter(stringValue)
}

watch(
  () => props.table.getState().columnFilters,
  (filters) => {
    props.searchableColumns.forEach((column) => {
      const filter = filters.find((item) => item.id === column.id)
      searchValues.value[column.id] = filter && typeof filter.value === 'string' ? filter.value : ''
    })
  },
  { deep: true },
)

watch(
  () => props.table.getState().globalFilter,
  () => {
    globalSearchValue.value = getGlobalFilterText()
  },
)
</script>

<template>
  <div v-if="globalSearch" class="relative w-full sm:w-70">
    <Search
      class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    />
    <Input
      :placeholder="globalSearch.placeholder || 'Tìm kiếm...'"
      :model-value="globalSearchValue"
      class="h-9 pl-9"
      @update:model-value="updateGlobalSearch"
    />
  </div>

  <div v-for="column in searchableColumns" :key="column.id" class="relative w-full sm:w-64">
    <Search
      class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    />
    <Input
      :placeholder="column.placeholder || `Tìm ${column.title}...`"
      :model-value="searchValues[column.id] ?? ''"
      class="h-9 pl-9"
      @update:model-value="(value) => updateSearch(column.id, value)"
    />
  </div>
</template>
