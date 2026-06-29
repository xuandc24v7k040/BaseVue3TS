<script setup lang="ts" generic="TData">
import { computed } from 'vue'
import type { Column, Table } from '@tanstack/vue-table'
import { Check, PanelLeft, PanelRight, Settings2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { DataTableColumnStickyState, DataTableStickyColumnSide } from './interface'
import { getColumnTitle } from './utils'

interface DataTableViewOptionsProps {
  table: Table<TData>
  stickyColumns?: DataTableColumnStickyState
  enableStickyColumns?: boolean
}

const props = withDefaults(defineProps<DataTableViewOptionsProps>(), {
  stickyColumns: () => ({}),
  enableStickyColumns: true,
})

const emit = defineEmits<{
  'update:sticky-column': [columnId: string, side: DataTableStickyColumnSide | null]
  'reset-sticky-columns': []
  'reset-sticky-columns-to-defaults': []
}>()

const columns = computed(() =>
  props.table.getAllLeafColumns().filter((column) => isDisplayColumn(column) && column.getCanHide()),
)

const visibleHideableColumnsCount = computed(() =>
  columns.value.filter((column) => column.getIsVisible()).length,
)

const stickyColumnsList = computed(() =>
  props.table.getAllLeafColumns().filter((column) => isDisplayColumn(column)),
)

const hasStickyColumns = computed(() =>
  Object.values(props.stickyColumns).some((side) => side === 'left' || side === 'right'),
)

function isDisplayColumn(column: Column<TData, unknown>) {
  if (column.id === 'select') return false

  return column.columnDef.header !== undefined || column.getCanHide()
}

function isLastVisibleColumn(column: Column<TData, unknown>) {
  return column.getIsVisible() && visibleHideableColumnsCount.value === 1
}

function toggleColumn(column: Column<TData, unknown>) {
  if (isLastVisibleColumn(column)) return
  column.toggleVisibility(!column.getIsVisible())
}

function resetVisibility() {
  const initial = props.table.options.initialState?.columnVisibility ?? {}
  const hasVisibleColumn = columns.value.some((column) => initial[column.id] !== false)
  props.table.setColumnVisibility(hasVisibleColumn ? initial : {})
  emit('reset-sticky-columns-to-defaults')
}

function getStickySide(column: Column<TData, unknown>) {
  const side = props.stickyColumns[column.id]
  return side === 'left' || side === 'right' ? side : undefined
}

function updateStickyColumn(column: Column<TData, unknown>, side: DataTableStickyColumnSide) {
  emit('update:sticky-column', column.id, getStickySide(column) === side ? null : side)
}

function clearStickyColumns() {
  emit('reset-sticky-columns')
}
</script>

<template>
  <DropdownMenu :modal="false">
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" class="h-9 gap-2">
        <Settings2 class="h-4 w-4" />
        <span class="hidden sm:inline">Cột</span>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      align="end"
      :side-offset="6"
      class="w-[320px] max-w-[calc(100vw-1rem)] !max-h-none !overflow-hidden p-0"
    >
      <ScrollArea
        class="max-h-[min(440px,calc(100svh-96px))] overflow-hidden [&>[data-slot=scroll-area-viewport]]:h-auto [&>[data-slot=scroll-area-viewport]]:max-h-[min(440px,calc(100svh-96px))]"
        @wheel.stop
      >
        <div class="space-y-2.5 p-2.5 pr-3 text-sm">
          <section class="space-y-1">
            <DropdownMenuLabel class="px-1 py-0.5 text-xs font-semibold">Cột hiển thị</DropdownMenuLabel>

            <div v-if="columns.length > 0" class="space-y-0.5">
              <DropdownMenuItem
                v-for="column in columns"
                :key="column.id"
                role="menuitemcheckbox"
                :aria-checked="column.getIsVisible()"
                :class="[
                  'h-7 min-h-7 cursor-pointer gap-2 rounded-md px-1.5 py-0 text-sm',
                  isLastVisibleColumn(column) ? 'pointer-events-none opacity-50' : '',
                ]"
                @select.prevent="toggleColumn(column)"
              >
                <span
                  :class="
                    cn(
                      'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-primary',
                      column.getIsVisible()
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50 [&_svg]:invisible',
                    )
                  "
                >
                  <Check class="h-2.5 w-2.5" />
                </span>
                <span class="min-w-0 truncate">{{ getColumnTitle(column) }}</span>
              </DropdownMenuItem>
            </div>

            <div v-else class="px-2 py-3 text-center text-sm text-muted-foreground">
              Không có cột có thể ẩn
            </div>
          </section>

          <template v-if="enableStickyColumns && stickyColumnsList.length > 0">
            <DropdownMenuSeparator class="my-1" />

            <section class="space-y-1">
              <DropdownMenuLabel class="px-1 py-0.5 text-xs font-semibold">Cố định cột</DropdownMenuLabel>

              <div class="space-y-0.5">
                <div
                  v-for="column in stickyColumnsList"
                  :key="column.id"
                  class="grid min-h-7 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 rounded-md px-1.5 text-sm hover:bg-accent/40"
                >
                  <span class="min-w-0 truncate">{{ getColumnTitle(column) }}</span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    :class="
                      cn(
                        'h-6 w-6 rounded-[5px] border border-transparent text-muted-foreground shadow-none transition-colors hover:border-border/70 hover:bg-muted/70 hover:text-foreground',
                        getStickySide(column) === 'left'
                          && 'border-primary/45 bg-primary/10 text-primary ring-1 ring-primary/15 hover:border-primary/60 hover:bg-primary/15 hover:text-primary dark:bg-primary/15 dark:hover:bg-primary/20',
                      )
                    "
                    title="Cố định bên trái"
                    aria-label="Cố định bên trái"
                    :aria-pressed="getStickySide(column) === 'left'"
                    @click.stop="updateStickyColumn(column, 'left')"
                  >
                    <PanelLeft class="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    :class="
                      cn(
                        'h-6 w-6 rounded-[5px] border border-transparent text-muted-foreground shadow-none transition-colors hover:border-border/70 hover:bg-muted/70 hover:text-foreground',
                        getStickySide(column) === 'right'
                          && 'border-primary/45 bg-primary/10 text-primary ring-1 ring-primary/15 hover:border-primary/60 hover:bg-primary/15 hover:text-primary dark:bg-primary/15 dark:hover:bg-primary/20',
                      )
                    "
                    title="Cố định bên phải"
                    aria-label="Cố định bên phải"
                    :aria-pressed="getStickySide(column) === 'right'"
                    @click.stop="updateStickyColumn(column, 'right')"
                  >
                    <PanelRight class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </section>
          </template>

          <DropdownMenuSeparator class="my-1" />

          <div class="space-y-0.5">
            <DropdownMenuItem
              class="h-7 min-h-7 cursor-pointer justify-center rounded-md px-1.5 py-0 text-sm text-muted-foreground focus:text-foreground"
              :disabled="!hasStickyColumns"
              @select.prevent="clearStickyColumns"
            >
              Bỏ cố định cột
            </DropdownMenuItem>
            <DropdownMenuItem
              class="h-7 min-h-7 cursor-pointer justify-center rounded-md px-1.5 py-0 text-sm text-destructive focus:text-destructive"
              @select.prevent="resetVisibility"
            >
              Đặt lại mặc định
            </DropdownMenuItem>
          </div>
        </div>
      </ScrollArea>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
