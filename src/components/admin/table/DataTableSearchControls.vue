<script setup lang="ts" generic="TData">
import { computed, ref, watch } from 'vue'
import type { Table } from '@tanstack/vue-table'
import { Search } from '@lucide/vue'
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

function getColumnFilterText(columnId?: string): string {
  if (!columnId) return ''

  const value = props.table.getColumn(columnId)?.getFilterValue()
  return typeof value === 'string' ? value : ''
}

function getGlobalFilterText(): string {
  const value = props.table.getState().globalFilter
  return typeof value === 'string' ? value : ''
}

const localGlobalSearch = ref(getGlobalFilterText())
const localSearchValues = ref<Record<string, string>>({})

// Initialize localSearchValues and remove stale keys
watch(
  () => props.searchableColumns,
  (cols) => {
    const activeIds = new Set(cols.map((c) => c.id))
    Object.keys(localSearchValues.value).forEach((id) => {
      if (!activeIds.has(id)) {
        delete localSearchValues.value[id]
      }
    })
    cols.forEach((col) => {
      if (!(col.id in localSearchValues.value)) {
        localSearchValues.value[col.id] = getColumnFilterText(col.id)
      }
    })
  },
  { immediate: true, deep: true }
)

const globalFilterText = computed(() => {
  const value = props.table.getState().globalFilter
  return typeof value === 'string' ? value : ''
})

// Sync from table state back to local inputs (e.g. on filter resets)
watch(
  globalFilterText,
  (next) => {
    if (next !== localGlobalSearch.value) {
      localGlobalSearch.value = next
    }
  }
)

const columnFilterTexts = computed(() => {
  const columnFilters = props.table.getState().columnFilters
  return props.searchableColumns.map((col) => {
    const filterValue = columnFilters.find((filter) => filter.id === col.id)?.value
    const value = filterValue ?? props.table.getColumn(col.id)?.getFilterValue()
    return typeof value === 'string' ? value : ''
  })
})

watch(
  columnFilterTexts,
  (nextValues) => {
    props.searchableColumns.forEach((col, index) => {
      const nextVal = nextValues[index] ?? ''
      if (nextVal !== localSearchValues.value[col.id]) {
        localSearchValues.value[col.id] = nextVal
      }
    })
  }
)

function updateSearch(columnId: string, value: string | number) {
  const stringValue = String(value)
  localSearchValues.value[columnId] = stringValue
  props.table.getColumn(columnId)?.setFilterValue(stringValue || undefined)
}

function updateGlobalSearch(value: string | number) {
  const stringValue = String(value)
  localGlobalSearch.value = stringValue
  props.table.setGlobalFilter(stringValue)
}

const globalSearchLabel = computed(
  () => props.globalSearch?.title || props.globalSearch?.placeholder || 'Tìm kiếm',
)
</script>

<template>
  <div v-if="globalSearch && globalSearch.columnIds.length > 0" class="relative w-full min-w-0 sm:min-w-64 sm:w-70">
    <Search
      class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
    />
    <Input
      :placeholder="globalSearch.placeholder || 'Tìm kiếm...'"
      :model-value="localGlobalSearch"
      :aria-label="globalSearchLabel"
      class="h-9 rounded-md bg-background pl-10 pr-3 shadow-xs focus:border-ring focus:ring-[3px] focus:ring-ring/50"
      @update:model-value="updateGlobalSearch"
    />
  </div>

  <div v-for="column in searchableColumns" :key="column.id" class="relative w-full min-w-0 sm:min-w-56 sm:w-64">
    <Search
      class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
    />
    <Input
      :placeholder="column.placeholder || `Tìm ${column.title}...`"
      :model-value="localSearchValues[column.id]"
      :aria-label="column.placeholder || `Tìm ${column.title}`"
      class="h-9 rounded-md bg-background pl-10 pr-3 shadow-xs focus:border-ring focus:ring-[3px] focus:ring-ring/50"
      @update:model-value="(value) => updateSearch(column.id, value)"
    />
  </div>
</template>
