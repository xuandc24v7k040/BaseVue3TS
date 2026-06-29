<script setup lang="ts" generic="TData">
import { computed, nextTick, ref, useId, type ComponentPublicInstance } from 'vue'
import type { Table } from '@tanstack/vue-table'
import type { AcceptableValue } from 'reka-ui'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTablePaginationProps {
  table: Table<TData>
  pageSizeOptions?: number[]
  selectedIds?: string[]
  maxPageSize?: number
}

const props = withDefaults(defineProps<DataTablePaginationProps>(), {
  pageSizeOptions: () => [10, 20, 30, 50, 100],
  selectedIds: () => [],
})

const isCustomInput = ref(false)
const customPageSize = ref<string | number>('')
const customInputRef = ref<ComponentPublicInstance | HTMLInputElement | null>(null)
const customPageSizeError = ref('')
const customPageSizeInputId = useId()
const customPageSizeErrorId = `${customPageSizeInputId}-error`

const pagination = computed(() => props.table.getState().pagination)
const currentPage = computed(() => pagination.value.pageIndex + 1)
const pageSize = computed(() => pagination.value.pageSize)
const rawPageCount = computed(() => props.table.getPageCount())
const hasKnownPageCount = computed(
  () => Number.isFinite(rawPageCount.value) && rawPageCount.value >= 0,
)
const totalPages = computed(() => (hasKnownPageCount.value ? Math.max(rawPageCount.value, 0) : 0))
const displayCurrentPage = computed(() =>
  hasKnownPageCount.value && totalPages.value === 0 ? 0 : currentPage.value,
)
const selectedRowCount = computed(() => props.selectedIds.length)
const resolvedMaxPageSize = computed(() =>
  props.maxPageSize !== undefined && props.maxPageSize > 0 ? props.maxPageSize : undefined,
)
const currentPageSize = computed(() =>
  normalizedPageSizeOptions.value.includes(pageSize.value) ? String(pageSize.value) : 'custom',
)
const normalizedPageSizeOptions = computed(() => {
  const validated = Array.from(new Set(props.pageSizeOptions)).filter(
    (n) => Number.isInteger(n) && n > 0,
  )

  const clamped =
    resolvedMaxPageSize.value !== undefined
      ? validated.map((n) => Math.min(n, resolvedMaxPageSize.value!))
      : validated

  const deduped = Array.from(new Set(clamped)).sort((a, b) => a - b)

  if (import.meta.env.DEV && deduped.length < validated.length) {
    console.warn(
      `[DataTable] pageSizeOptions were reduced from [${validated.join(',')}] to [${deduped.join(',')}] ` +
        `due to maxPageSize=${resolvedMaxPageSize.value}. Consider adjusting pageSizeOptions.`,
    )
  }

  return deduped
})

function handlePageSizeChange(value: AcceptableValue) {
  if (value === 'custom') {
    openCustomInput()
    return
  }

  const nextSize = Number(toInputString(value))
  if (Number.isInteger(nextSize) && nextSize > 0) {
    setPageSize(
      resolvedMaxPageSize.value !== undefined
        ? Math.min(nextSize, resolvedMaxPageSize.value)
        : nextSize,
    )
  }
}

function openCustomInput() {
  isCustomInput.value = true
  customPageSize.value = String(pageSize.value)
  customPageSizeError.value = ''
  nextTick(() => {
    const input = getCustomInputElement()
    input?.focus()
    input?.select()
  })
}

function setPageSize(nextSize: number) {
  props.table.setPagination({
    pageIndex: 0,
    pageSize: nextSize,
  })
}

function submitCustomPageSize() {
  const rawValue = toInputString(customPageSize.value)
  const parsedSize = Number(rawValue)
  const errorMessage = validatePageSize(rawValue, parsedSize)

  if (errorMessage) {
    customPageSizeError.value = errorMessage
    return
  }

  setPageSize(parsedSize)
  customPageSizeError.value = ''
  isCustomInput.value = false
}

function handleCustomInputBlur() {
  const rawValue = toInputString(customPageSize.value)
  const parsedSize = Number(rawValue)
  const errorMessage = validatePageSize(rawValue, parsedSize)

  if (errorMessage) {
    customPageSizeError.value = errorMessage
    return
  }

  setPageSize(parsedSize)
  isCustomInput.value = false
  customPageSizeError.value = ''
}

function validatePageSize(rawValue: string, value: number): string | null {
  const trimmed = rawValue.trim()
  if (!trimmed) return 'Vui lòng nhập số dòng/trang'
  if (!/^\d+$/.test(trimmed)) return 'Số dòng/trang phải là số nguyên dương'
  if (Number.isNaN(value)) return 'Số dòng/trang phải là số hợp lệ'
  if (!Number.isInteger(value)) return 'Số dòng/trang phải là số nguyên'
  if (value < 1) return 'Số dòng/trang phải lớn hơn 0'
  if (resolvedMaxPageSize.value !== undefined && value > resolvedMaxPageSize.value) {
    return `Số dòng/trang không được vượt quá ${resolvedMaxPageSize.value}`
  }
  return null
}

function handleCustomInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    submitCustomPageSize()
  }

  if (event.key === 'Escape') {
    isCustomInput.value = false
    customPageSize.value = String(pageSize.value)
    customPageSizeError.value = ''
  }
}

function goToLastPage() {
  if (!hasKnownPageCount.value) return
  props.table.setPageIndex(Math.max(totalPages.value - 1, 0))
}

function toInputString(value: AcceptableValue | string | number | null | undefined): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return ''
}

function getCustomInputElement(): HTMLInputElement | null {
  const refValue = customInputRef.value
  if (!refValue) return null
  if (refValue instanceof HTMLInputElement) return refValue

  const rootElement = refValue.$el
  if (rootElement instanceof HTMLInputElement) return rootElement
  return rootElement?.querySelector?.('input') ?? null
}
</script>

<template>
  <div class="flex min-w-0 max-w-full flex-col gap-3 px-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <div class="min-h-5 min-w-0 text-sm text-muted-foreground">
      <span v-if="selectedRowCount > 0">
        Đã chọn <strong>{{ selectedRowCount }}</strong> dòng
      </span>
    </div>

    <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
      <div class="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
        <span class="text-sm font-medium">Dòng/trang</span>

        <div v-if="isCustomInput" class="relative">
          <Input
            :id="customPageSizeInputId"
            ref="customInputRef"
            v-model="customPageSize"
            type="number"
            min="1"
            :max="resolvedMaxPageSize"
            class="h-8 w-19 text-center"
            aria-label="Số dòng mỗi trang tùy chỉnh"
            :aria-invalid="Boolean(customPageSizeError)"
            :aria-describedby="customPageSizeError ? customPageSizeErrorId : undefined"
            @blur="handleCustomInputBlur"
            @keydown="handleCustomInputKeydown"
          />
          <p
            v-if="customPageSizeError"
            :id="customPageSizeErrorId"
            role="alert"
            class="absolute right-0 top-9 z-10 w-56 rounded-md border bg-background p-2 text-xs text-destructive shadow-sm"
          >
            {{ customPageSizeError }}
          </p>
        </div>

        <Select v-else :model-value="currentPageSize" @update:model-value="handlePageSizeChange">
          <SelectTrigger class="h-8 w-19" aria-label="Chọn số dòng mỗi trang">
            <SelectValue>{{ pageSize }}</SelectValue>
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem v-for="size in normalizedPageSizeOptions" :key="size" :value="String(size)">
              {{ size }}
            </SelectItem>
            <SelectItem value="custom">Tùy chỉnh...</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex min-w-0 items-center justify-between gap-3 sm:justify-start">
        <div class="min-w-27 text-center text-sm font-medium">
          <template v-if="hasKnownPageCount">
            Trang {{ displayCurrentPage }} / {{ totalPages }}
          </template>
          <template v-else>Trang {{ currentPage }}</template>
        </div>

        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            class="hidden h-8 w-8 p-0 lg:flex"
            :disabled="!table.getCanPreviousPage()"
            aria-label="Trang đầu"
            @click="table.setPageIndex(0)"
          >
            <span class="sr-only">Trang đầu</span>
            <ChevronsLeft class="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            class="h-8 w-8 p-0"
            :disabled="!table.getCanPreviousPage()"
            aria-label="Trang trước"
            @click="table.previousPage()"
          >
            <span class="sr-only">Trang trước</span>
            <ChevronLeft class="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            class="h-8 w-8 p-0"
            :disabled="!table.getCanNextPage()"
            aria-label="Trang sau"
            @click="table.nextPage()"
          >
            <span class="sr-only">Trang sau</span>
            <ChevronRight class="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            class="hidden h-8 w-8 p-0 lg:flex"
            :disabled="!hasKnownPageCount || !table.getCanNextPage()"
            aria-label="Trang cuối"
            @click="goToLastPage"
          >
            <span class="sr-only">Trang cuối</span>
            <ChevronsRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
