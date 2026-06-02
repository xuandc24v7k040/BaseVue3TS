<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Calendar as CalendarIcon, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { DateRangeValue } from './interface'
import { parseLocalDate } from './utils'

interface DateRangeFilterProps {
  modelValue?: DateRangeValue
  placeholder?: string
  class?: string
  locale?: string
  dateStyle?: 'full' | 'long' | 'medium' | 'short'
  disabled?: boolean
}

const props = withDefaults(defineProps<DateRangeFilterProps>(), {
  placeholder: 'Chọn ngày',
  locale: 'vi-VN',
  dateStyle: 'medium',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: DateRangeValue | undefined]
}>()

const isOpen = ref(false)
const startDate = ref(props.modelValue?.start ?? '')
const endDate = ref(props.modelValue?.end ?? '')

const hasDateRange = computed(() => Boolean(startDate.value || endDate.value))
const isInvalidRange = computed(() => {
  if (!startDate.value || !endDate.value) return false
  const start = parseLocalDate(startDate.value)
  const end = parseLocalDate(endDate.value)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true

  return start.getTime() > end.getTime()
})
const canApply = computed(() => hasDateRange.value && !isInvalidRange.value)
const formattedDateRange = computed(() => {
  if (!hasDateRange.value) return ''
  if (startDate.value && endDate.value) return `${formatDate(startDate.value)} - ${formatDate(endDate.value)}`
  if (startDate.value) return `Từ ${formatDate(startDate.value)}`
  return `Đến ${formatDate(endDate.value)}`
})

function formatDate(value: string): string {
  const date = parseLocalDate(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(props.locale, { dateStyle: props.dateStyle }).format(date)
}

function applyFilter() {
  if (props.disabled || !canApply.value) return

  emit('update:modelValue', {
    start: startDate.value || undefined,
    end: endDate.value || undefined,
  })
  isOpen.value = false
}

function clearFilter() {
  if (props.disabled) return

  startDate.value = ''
  endDate.value = ''
  emit('update:modelValue', undefined)
  isOpen.value = false
}

watch(
  () => props.modelValue,
  (value) => {
    startDate.value = value?.start ?? ''
    endDate.value = value?.end ?? ''
  },
  { deep: true },
)
</script>

<template>
  <div :class="cn('relative grid gap-2', props.class)">
    <Popover v-model:open="isOpen">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          size="sm"
          :disabled="disabled"
          :class="
            cn(
              'h-9 w-full justify-start border-dashed pr-8 text-left font-normal sm:w-65',
              !hasDateRange && 'text-muted-foreground',
            )
          "
        >
          <CalendarIcon class="mr-2 h-4 w-4" />
          <span class="min-w-0 flex-1 truncate">
            {{ hasDateRange ? formattedDateRange : placeholder }}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent class="w-72 p-3" align="start">
        <div class="space-y-3">
          <div class="grid gap-2">
            <label class="text-xs font-medium text-muted-foreground">Từ ngày</label>
            <Input v-model="startDate" type="date" class="h-9" />
          </div>
          <div class="grid gap-2">
            <label class="text-xs font-medium text-muted-foreground">Đến ngày</label>
            <Input v-model="endDate" type="date" class="h-9" />
          </div>
          <p v-if="isInvalidRange" class="text-xs text-destructive">
            Ngày bắt đầu không được sau ngày kết thúc.
          </p>
          <div class="flex justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" @click="clearFilter">Xóa</Button>
            <Button size="sm" :disabled="!canApply" @click="applyFilter">Áp dụng</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>

    <button
      v-if="hasDateRange && !disabled"
      type="button"
      aria-label="Xóa bộ lọc ngày"
      class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      @click.stop="clearFilter"
    >
      <X class="h-3 w-3" />
    </button>
  </div>
</template>
