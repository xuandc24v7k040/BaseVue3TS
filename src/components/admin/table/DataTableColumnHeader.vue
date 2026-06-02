<script setup lang="ts" generic="TData">
import { computed } from 'vue'
import type { Column } from '@tanstack/vue-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff, ListFilter } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ColumnHeaderMode } from './interface'
import { toStringArray } from './utils'

interface DataTableColumnHeaderProps {
  column: Column<TData, unknown>
  title: string
  class?: string
  mode?: ColumnHeaderMode
}

const props = withDefaults(defineProps<DataTableColumnHeaderProps>(), {
  mode: () => ({ type: 'sort' }),
})

const canHide = computed(() => props.column.getCanHide())
const sortDirection = computed(() => props.column.getIsSorted())
const filterValue = computed(() => toStringArray(props.column.getFilterValue()))

function toggleSorting(desc: boolean) {
  props.column.toggleSorting(desc)
}

function toggleFilter(value: string) {
  const current = filterValue.value
  const nextValue = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]

  props.column.setFilterValue(nextValue.length > 0 ? nextValue : undefined)
}

function clearFilters() {
  props.column.setFilterValue(undefined)
}

function clearSorting() {
  props.column.clearSorting()
}
</script>

<template>
  <div v-if="mode.type === 'sort'" :class="cn('flex items-center', props.class)">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="sm"
          class="-ml-3 h-8 gap-2 px-3 data-[state=open]:bg-accent"
          :aria-label="`Sắp xếp cột ${title}`"
        >
          <span class="truncate">{{ title }}</span>
          <ArrowDown v-if="sortDirection === 'desc'" class="h-4 w-4" />
          <ArrowUp v-else-if="sortDirection === 'asc'" class="h-4 w-4" />
          <ChevronsUpDown v-else class="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="bottom">
        <DropdownMenuItem @click="toggleSorting(false)">
          <ArrowUp class="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          Tăng dần
        </DropdownMenuItem>
        <DropdownMenuItem @click="toggleSorting(true)">
          <ArrowDown class="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          Giảm dần
        </DropdownMenuItem>
        <DropdownMenuItem v-if="sortDirection" @click="clearSorting">
          <ChevronsUpDown class="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          Xóa sắp xếp
        </DropdownMenuItem>
        <template v-if="canHide">
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="props.column.toggleVisibility(false)">
            <EyeOff class="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            Ẩn cột
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  <div v-else-if="mode.type === 'filter'" :class="cn('flex items-center', props.class)">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="ghost"
          size="sm"
          class="-ml-3 h-8 gap-2 px-3"
          :aria-label="`Lọc cột ${title}`"
        >
          <span class="truncate">{{ title }}</span>
          <ListFilter class="h-4 w-4 text-muted-foreground" />
          <Badge
            v-if="filterValue.length > 0"
            variant="secondary"
            class="rounded-sm px-1 font-normal"
          >
            {{ filterValue.length }}
          </Badge>
        </Button>
      </PopoverTrigger>

      <PopoverContent class="w-56 p-2" align="start" side="bottom">
        <div class="space-y-1">
          <label
            v-for="option in mode.options"
            :key="option.value"
            class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox
              :model-value="filterValue.includes(option.value)"
              @update:model-value="toggleFilter(option.value)"
            />
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
          </label>
        </div>

        <template v-if="filterValue.length > 0 || canHide">
          <div class="mt-2 border-t pt-2">
            <Button
              v-if="filterValue.length > 0"
              variant="ghost"
              size="sm"
              class="h-8 w-full justify-start px-2"
              @click="clearFilters"
            >
              Xóa bộ lọc
            </Button>
            <Button
              v-if="canHide"
              variant="ghost"
              size="sm"
              class="h-8 w-full justify-start px-2"
              @click="props.column.toggleVisibility(false)"
            >
              <EyeOff class="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Ẩn cột
            </Button>
          </div>
        </template>
      </PopoverContent>
    </Popover>
  </div>

  <div v-else :class="cn('flex items-center justify-between gap-2', props.class)">
    <span class="truncate text-sm font-medium">{{ title }}</span>
    <DropdownMenu v-if="canHide">
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 opacity-60 hover:opacity-100"
          :aria-label="`Tùy chọn cột ${title}`"
        >
          <span class="sr-only">Tùy chọn cột {{ title }}</span>
          <ChevronsUpDown class="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem @click="props.column.toggleVisibility(false)">
          <EyeOff class="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          Ẩn cột
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
