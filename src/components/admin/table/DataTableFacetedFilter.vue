<script setup lang="ts" generic="TData">
import { computed, ref, watch } from 'vue'
import type { Column, Table } from '@tanstack/vue-table'
import { Check, PlusCircle } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { DataTableFilterOption } from './interface'
import { toStringArray } from './utils'

interface DataTableFacetedFilterProps {
  table?: Table<TData>
  column?: Column<TData, unknown>
  title?: string
  options: DataTableFilterOption[]
  /**
   * Whether to show count of matching rows for each option.
   * Client-side only. In server-side mode, pass option.count from backend.
   */
  showCounts?: boolean
  multiple?: boolean
}

const props = withDefaults(defineProps<DataTableFacetedFilterProps>(), {
  showCounts: false,
  multiple: true,
})
const OPTION_ROW_HEIGHT = 36
const MAX_OPTION_LIST_HEIGHT = 256
const isOpen = ref(false)
const searchQuery = ref('')
const filterTitle = computed(() => props.title || 'dữ liệu')

const facets = computed(() => {
  const isServerSide = props.table?.options.manualFiltering
  if (isServerSide) return undefined
  return props.showCounts ? props.column?.getFacetedUniqueValues() : undefined
})
const selectedValues = computed(() => new Set(toStringArray(props.column?.getFilterValue())))
const selectedOptions = computed(() => {
  const known = props.options.filter((option) => selectedValues.value.has(option.value))
  const knownValues = new Set(known.map((o) => o.value))
  const unknown = Array.from(selectedValues.value)
    .filter((v) => !knownValues.has(v))
    .map((v) => ({ label: v, value: v }))
  return [...known, ...unknown]
})
const allDisplayOptions = computed<DataTableFilterOption[]>(() => {
  const known = props.options
  const knownValues = new Set(known.map((o) => o.value))
  const unknown = Array.from(selectedValues.value)
    .filter((v) => !knownValues.has(v))
    .map((v) => ({ label: `${v} (không còn trong danh sách)`, value: v, variant: 'muted' } as DataTableFilterOption))
  return [...known, ...unknown]
})
const filteredOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const displayOptions = allDisplayOptions.value
  if (!query) return displayOptions

  return displayOptions.filter((option) => option.label.toLowerCase().includes(query))
})
const optionsListHeight = computed(() => {
  if (filteredOptions.value.length === 0) return '80px'
  const listHeight = filteredOptions.value.length * OPTION_ROW_HEIGHT
  return `${Math.min(Math.max(listHeight, OPTION_ROW_HEIGHT), MAX_OPTION_LIST_HEIGHT)}px`
})
const hasScrollableOptions = computed(
  () => filteredOptions.value.length * OPTION_ROW_HEIGHT > MAX_OPTION_LIST_HEIGHT,
)

function getFacetCount(optionValue: string): number | undefined {
  if (!facets.value) return undefined

  if (facets.value.has(optionValue)) {
    return facets.value.get(optionValue)
  }

  // Fallback to numeric key only if optionValue is a canonical number string
  if (String(Number(optionValue)) === optionValue) {
    const numericValue = Number(optionValue)
    if (!Number.isNaN(numericValue) && facets.value.has(numericValue)) {
      return facets.value.get(numericValue)
    }
  }

  // Fallback to boolean key
  if (optionValue === 'true' && facets.value.has(true)) {
    return facets.value.get(true)
  }
  if (optionValue === 'false' && facets.value.has(false)) {
    return facets.value.get(false)
  }

  return undefined
}

function handleSelect(value: string) {
  if (!props.column) return

  if (!props.multiple) {
    props.column.setFilterValue(selectedValues.value.has(value) ? undefined : value)
    isOpen.value = false
    return
  }

  const filterValues = new Set(selectedValues.value)
  if (filterValues.has(value)) filterValues.delete(value)
  else filterValues.add(value)

  const nextValue = Array.from(filterValues)
  props.column.setFilterValue(nextValue.length > 0 ? nextValue : undefined)
}

function clearFilters() {
  props.column?.setFilterValue(undefined)
  isOpen.value = false
}

watch(isOpen, (open) => {
  if (!open) {
    searchQuery.value = ''
  }
})

if (import.meta.env.DEV) {
  watch(
    () => [props.showCounts, props.table?.options.manualFiltering],
    ([show, isServerSide]) => {
      if (show && isServerSide && props.column) {
        console.warn(
          `[DataTable] showCounts=true is ignored on server-side tables (manualFiltering=true). Pass option.count from backend to display global counts.`
        )
      }
    },
    { immediate: true },
  )
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        :disabled="!column"
        :aria-label="`Lọc ${filterTitle}`"
        class="h-9 w-full max-w-full justify-start border-dashed px-3 sm:w-auto"
        :class="{ 'border-primary': selectedValues.size > 0 }"
      >
        <PlusCircle class="mr-2 h-4 w-4 shrink-0" />
        <span class="min-w-0 truncate">{{ filterTitle }}</span>

        <template v-if="selectedValues.size > 0">
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
            {{ selectedValues.size }}
          </Badge>
          <div class="hidden min-w-0 items-center gap-1 lg:flex">
            <Badge
              v-if="selectedValues.size > 2"
              variant="secondary"
              class="rounded-sm px-1 font-normal"
            >
              {{ selectedValues.size }} đã chọn
            </Badge>
            <template v-else>
              <Badge
                v-for="option in selectedOptions"
                :key="option.value"
                variant="secondary"
                class="max-w-30 truncate rounded-sm px-1 font-normal"
              >
                {{ option.label }}
              </Badge>
            </template>
          </div>
        </template>
      </Button>
    </PopoverTrigger>

    <PopoverContent
      class="w-56 max-w-[calc(100vw-2rem)] p-2"
      align="start"
      side="bottom"
      :side-offset="8"
      :collision-padding="16"
      @close-auto-focus.prevent
    >
      <div class="space-y-2">
        <Input
          v-model="searchQuery"
          :placeholder="filterTitle"
          :aria-label="`Tìm tùy chọn ${filterTitle}`"
          class="h-8 rounded-md bg-background"
        />

        <ScrollArea
          class="pr-0"
          :style="{ height: optionsListHeight }"
          show-scroll-buttons
        >
          <div :class="hasScrollableOptions ? 'pr-3' : undefined">
            <p
            v-if="filteredOptions.length === 0"
            class="px-2 py-6 text-center text-sm text-muted-foreground"
          >
            Không tìm thấy.
          </p>

            <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            :aria-pressed="selectedValues.has(option.value)"
            :class="[
              'flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
              selectedValues.has(option.value) ? 'bg-accent/60' : '',
              option.variant === 'muted' ? 'text-muted-foreground/80 italic' : '',
            ]"
            @click="handleSelect(option.value)"
          >
            <span
              :class="
                cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary',
                  selectedValues.has(option.value)
                    ? 'bg-primary text-primary-foreground'
                    : 'opacity-50 [&_svg]:invisible',
                )
              "
            >
              <Check class="h-4 w-4" />
            </span>
            <component
              :is="option.icon"
              v-if="option.icon"
              class="h-4 w-4 shrink-0 text-muted-foreground"
            />
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            <span
              v-if="option.count !== undefined"
              class="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center font-mono text-xs text-muted-foreground"
            >
              {{ option.count }}
            </span>
            <span
              v-else-if="showCounts && getFacetCount(option.value) !== undefined"
              class="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center font-mono text-xs"
            >
              {{ getFacetCount(option.value) }}
            </span>
            </button>
          </div>
        </ScrollArea>

        <div v-if="selectedValues.size > 0" class="border-t pt-2">
          <Button variant="ghost" size="sm" class="h-8 w-full" @click="clearFilters">
            Xóa bộ lọc
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
