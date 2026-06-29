<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { Calendar as CalendarIcon, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import Calendar from '@/components/ui/calendar/Calendar.vue'
import { parseDate } from '@internationalized/date'
import { cn } from '@/lib/utils'
import type { DateRange, DateValue } from 'reka-ui'
import type { DateRangeValue } from './interface'
import { formatDateRangeValue } from './utils'

interface DateRangeFilterProps {
  modelValue?: DateRangeValue | string
  placeholder?: string
  class?: string
  locale?: string
  dateStyle?: 'full' | 'long' | 'medium' | 'short'
  dateFormatPattern?: string
  disabled?: boolean
  mode?: 'single' | 'range' | 'single-datetime' | 'range-datetime'
  enablePresets?: boolean
  disableFutureDates?: boolean
  disablePastDates?: boolean
  minValue?: string
  maxValue?: string
  presetEndTime?: 'endOfDay' | 'now'
}

const props = withDefaults(defineProps<DateRangeFilterProps>(), {
  placeholder: 'Chọn ngày',
  locale: 'vi-VN',
  dateStyle: 'medium',
  disabled: false,
  mode: 'range',
  enablePresets: false,
  disableFutureDates: false,
  disablePastDates: false,
  presetEndTime: 'endOfDay',
})

const emit = defineEmits<{
  'update:modelValue': [value: DateRangeValue | string | undefined]
}>()

const isOpen = ref(false)
const singleTimeInputId = useId()
const startTimeInputId = useId()
const endTimeInputId = useId()
const rangeTimeErrorId = `${startTimeInputId}-range-error`

function safeParseDate(val?: string): DateValue | undefined {
  if (!val) return undefined
  const datePart = val.includes('T') ? val.split('T')[0] : val
  if (!datePart) return undefined
  try {
    return parseDate(datePart) as unknown as DateValue
  } catch {
    return undefined
  }
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Local selection states
type LocalCalendarValue = DateValue | { start?: DateValue; end?: DateValue } | undefined
const value = ref<LocalCalendarValue>(undefined)
const timeValue = ref('00:00')
const startTimeValue = ref('00:00')
const endTimeValue = ref('23:59')

const singleValue = computed<DateValue | undefined>({
  get: () => {
    const val = value.value
    return val && !('start' in val) && !('end' in val) ? (val as unknown as DateValue) : undefined
  },
  set: (val) => {
    value.value = val
  },
})

const rangeValue = computed<DateRange | undefined>({
  get: () => {
    const val = value.value
    return val && ('start' in val || 'end' in val)
      ? (val as unknown as DateRange)
      : { start: undefined, end: undefined }
  },
  set: (val) => {
    value.value = val as unknown as LocalCalendarValue
  },
})

function syncLocalStateFromModel() {
  if (props.mode === 'single' || props.mode === 'single-datetime') {
    const modelStr = typeof props.modelValue === 'string' ? props.modelValue : ''
    let datePart = ''
    let timePart = '00:00'
    if (modelStr.includes('T')) {
      const parts = modelStr.split('T')
      datePart = parts[0] ?? ''
      timePart = (parts[1] ?? '00:00').slice(0, 5)
    } else {
      datePart = modelStr
    }
    value.value = safeParseDate(datePart)
    timeValue.value = timePart
    return
  }

  const val = props.modelValue && typeof props.modelValue === 'object' ? props.modelValue : {}
  let startStr = val.start ?? ''
  let startTime = '00:00'
  if (startStr.includes('T')) {
    const parts = startStr.split('T')
    startStr = parts[0] ?? ''
    startTime = (parts[1] ?? '00:00').slice(0, 5)
  }

  let endStr = val.end ?? ''
  let endTime = '23:59'
  if (endStr.includes('T')) {
    const parts = endStr.split('T')
    endStr = parts[0] ?? ''
    endTime = (parts[1] ?? '23:59').slice(0, 5)
  }

  value.value = {
    start: safeParseDate(startStr),
    end: safeParseDate(endStr),
  }
  startTimeValue.value = startTime
  endTimeValue.value = endTime
}

// Initialize local states when popover opens and keep them aligned while open.
watch(isOpen, (open) => {
  if (open) syncLocalStateFromModel()
})

watch(() => props.modelValue, () => {
  if (isOpen.value) syncLocalStateFromModel()
})

const hasDateRange = computed(() => {
  if (props.mode === 'single' || props.mode === 'single-datetime') {
    return typeof props.modelValue === 'string' && props.modelValue !== ''
  }
  return Boolean(
    props.modelValue &&
    typeof props.modelValue === 'object' &&
    (props.modelValue.start || props.modelValue.end),
  )
})

function isValidDateTimeRange(start?: string, end?: string) {
  if (!start || !end) return true
  return start <= end
}

const isRangeValid = computed(() => {
  if (props.mode !== 'range-datetime') return true
  const val = value.value
  const isRange = val && typeof val === 'object' && ('start' in val || 'end' in val)
  if (!isRange) return true
  const startDate = val.start?.toString()
  const endDate = val.end?.toString()
  const start = startDate ? `${startDate}T${startTimeValue.value || '00:00'}` : undefined
  const end = endDate ? `${endDate}T${endTimeValue.value || '23:59'}` : undefined
  return isValidDateTimeRange(start, end)
})

const canApply = computed(() => {
  if (props.mode === 'single' || props.mode === 'single-datetime') {
    return Boolean(value.value)
  }
  const val = value.value
  if (val && typeof val === 'object' && ('start' in val || 'end' in val)) {
    return Boolean(val.start || val.end) && isRangeValid.value
  }
  return false
})

const formattedDateRange = computed(() => {
  return formatDateRangeValue(props.modelValue, props.locale, props.dateStyle, props.mode, props.dateFormatPattern) ?? ''
})

function applyFilter() {
  if (props.disabled) return
  if (!canApply.value) return

  if (props.mode === 'single' || props.mode === 'single-datetime') {
    const val = value.value
    const dateStr = val && !('start' in val) && !('end' in val) ? val.toString() : undefined
    if (dateStr) {
      const finalVal =
        props.mode === 'single-datetime' ? `${dateStr}T${timeValue.value || '00:00'}` : dateStr
      emit('update:modelValue', finalVal)
    } else {
      emit('update:modelValue', undefined)
    }
  } else {
    // Range modes
    const val = value.value
    const isRange = val && typeof val === 'object' && ('start' in val || 'end' in val)
    let start = isRange ? val.start?.toString() : undefined
    let end = isRange ? val.end?.toString() : undefined

    if (props.mode === 'range-datetime') {
      start = start ? `${start}T${startTimeValue.value || '00:00'}` : undefined
      end = end ? `${end}T${endTimeValue.value || '23:59'}` : undefined
    }

    emit('update:modelValue', start || end ? { start, end } : undefined)
  }
  isOpen.value = false
}

function clearFilter() {
  if (props.disabled) return

  if (props.mode === 'single' || props.mode === 'single-datetime') {
    value.value = undefined
    timeValue.value = '00:00'
  } else {
    value.value = { start: undefined, end: undefined }
    startTimeValue.value = '00:00'
    endTimeValue.value = '23:59'
  }
  emit('update:modelValue', undefined)
  isOpen.value = false
}

const resolvedMin = computed<DateValue | undefined>(() => {
  if (props.minValue) {
    const parsed = safeParseDate(props.minValue)
    if (parsed) return parsed
  }
  if (props.disablePastDates) {
    return parseDate(formatDateISO(new Date())) as unknown as DateValue
  }
  return undefined
})

const resolvedMax = computed<DateValue | undefined>(() => {
  if (props.maxValue) {
    const parsed = safeParseDate(props.maxValue)
    if (parsed) return parsed
  }
  if (props.disableFutureDates) {
    return parseDate(formatDateISO(new Date())) as unknown as DateValue
  }
  return undefined
})

function isPresetEnabled(preset: { label: string; getValue: () => DateRangePresetValue }): boolean {
  const rawVal = preset.getValue()
  const min = resolvedMin.value
  const max = resolvedMax.value

  if (!min && !max) return true

  if (props.mode === 'single' || props.mode === 'single-datetime') {
    const dateStr = typeof rawVal === 'string' ? rawVal : ''
    const date = safeParseDate(dateStr)
    if (!date) return true
    if (min && date.compare(min) < 0) return false
    if (max && date.compare(max) > 0) return false
  } else {
    const range =
      typeof rawVal === 'object' && rawVal !== null
        ? (rawVal as { start?: string; end?: string })
        : {}
    const start = safeParseDate(range.start)
    const end = safeParseDate(range.end)

    if (min && start && start.compare(min) < 0) return false
    if (min && end && end.compare(min) < 0) return false
    if (max && start && start.compare(max) > 0) return false
    if (max && end && end.compare(max) > 0) return false
  }
  return true
}

// Preset configurations
const presets = computed(() => {
  if (props.mode === 'single' || props.mode === 'single-datetime') {
    return [
      {
        label: 'Hôm nay',
        getValue: () => formatDateISO(new Date()),
      },
      {
        label: 'Hôm qua',
        getValue: () => {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          return formatDateISO(yesterday)
        },
      },
      {
        label: '7 ngày trước',
        getValue: () => {
          const past = new Date()
          past.setDate(past.getDate() - 7)
          return formatDateISO(past)
        },
      },
    ]
  } else {
    return [
      {
        label: 'Hôm nay',
        getValue: () => {
          const today = formatDateISO(new Date())
          return { start: today, end: today }
        },
      },
      {
        label: 'Hôm qua',
        getValue: () => {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const formatted = formatDateISO(yesterday)
          return { start: formatted, end: formatted }
        },
      },
      {
        label: '7 ngày qua',
        getValue: () => {
          const today = new Date()
          const start = new Date()
          start.setDate(today.getDate() - 6)
          return { start: formatDateISO(start), end: formatDateISO(today) }
        },
      },
      {
        label: 'Tháng này',
        getValue: () => {
          const today = new Date()
          const start = new Date(today.getFullYear(), today.getMonth(), 1)
          return { start: formatDateISO(start), end: formatDateISO(today) }
        },
      },
      {
        label: 'Tháng trước',
        getValue: () => {
          const today = new Date()
          const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          const end = new Date(today.getFullYear(), today.getMonth(), 0)
          return { start: formatDateISO(start), end: formatDateISO(end) }
        },
      },
    ]
  }
})

type DateRangePresetValue = string | { start?: string; end?: string }

function selectPreset(preset: { label: string; getValue: () => DateRangePresetValue }) {
  if (!isOpen.value) return
  const rawVal = preset.getValue()
  if (props.mode === 'single' || props.mode === 'single-datetime') {
    const dateStr = typeof rawVal === 'string' ? rawVal : ''
    value.value = safeParseDate(dateStr)
    if (props.mode === 'single-datetime') {
      timeValue.value = '00:00'
    }
  } else {
    const range =
      typeof rawVal === 'object' && rawVal !== null
        ? (rawVal as { start?: string; end?: string })
        : {}
    value.value = {
      start: safeParseDate(range.start),
      end: safeParseDate(range.end),
    }
    if (props.mode === 'range-datetime') {
      startTimeValue.value = '00:00'
      if (props.presetEndTime === 'now') {
        const now = new Date()
        const hh = String(now.getHours()).padStart(2, '0')
        const mm = String(now.getMinutes()).padStart(2, '0')
        endTimeValue.value = `${hh}:${mm}`
      } else {
        endTimeValue.value = '23:59'
      }
    }
  }
}
</script>

<template>
  <div :class="cn('relative grid w-full gap-2 sm:w-auto', props.class)">
    <Popover v-model:open="isOpen">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          size="sm"
          :disabled="disabled"
          :aria-label="hasDateRange ? `${placeholder}: ${formattedDateRange}` : placeholder"
          :class="
            cn(
              'h-9 w-full justify-start border-dashed pr-8 text-left font-normal sm:w-70',
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

      <PopoverContent
        class="flex w-[calc(100vw-2rem)] max-w-[42rem] flex-col overflow-hidden p-0 sm:w-auto sm:flex-row"
        align="start"
        side="bottom"
        :side-offset="8"
        :collision-padding="16"
      >
        <!-- Presets Sidebar -->
        <div
          v-if="enablePresets"
          class="flex min-w-36 flex-col justify-center gap-1 border-b border-border/70 bg-muted/10 p-3 sm:border-b-0 sm:border-r"
        >
          <span
            class="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
            >Gợi ý nhanh</span
          >
          <Button
            v-for="preset in presets"
            :key="preset.label"
            variant="ghost"
            size="sm"
            class="h-8 justify-start rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent/80 disabled:hover:bg-transparent"
            :disabled="!isPresetEnabled(preset)"
            @mousedown.prevent.stop
            @click="selectPreset(preset)"
          >
            {{ preset.label }}
          </Button>
        </div>

        <div class="flex flex-col">
          <!-- Calendar Selector -->
          <Calendar
            v-if="props.mode === 'single' || props.mode === 'single-datetime'"
            v-model="singleValue"
            :min-value="resolvedMin"
            :max-value="resolvedMax"
            class="datatable-calendar rounded-md border-0"
          />
          <RangeCalendar
            v-else
            v-model="rangeValue"
            :min-value="resolvedMin"
            :max-value="resolvedMax"
            class="datatable-range-calendar rounded-md border-0"
          />

          <!-- DateTime Precision Pickers -->
          <div
            v-if="props.mode === 'single-datetime'"
            class="flex items-center justify-between gap-4 border-t border-border/70 bg-muted/10 p-3 text-xs"
          >
            <label :for="singleTimeInputId" class="text-muted-foreground font-medium">Thời gian:</label>
            <Input
              :id="singleTimeInputId"
              type="time"
              v-model="timeValue"
              class="h-8 w-24 bg-background text-center font-mono text-xs"
              aria-label="Thời gian"
            />
          </div>

          <div
            v-if="props.mode === 'range-datetime'"
            class="flex flex-col gap-2 border-t border-border/70 bg-muted/10 p-3 text-xs"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-1.5">
                <label :for="startTimeInputId" class="text-muted-foreground font-medium">Bắt đầu:</label>
                <Input
                  :id="startTimeInputId"
                  type="time"
                  v-model="startTimeValue"
                  class="h-8 w-24 bg-background text-center font-mono text-xs"
                  aria-label="Thời gian bắt đầu"
                  :aria-invalid="!isRangeValid"
                  :aria-describedby="!isRangeValid ? rangeTimeErrorId : undefined"
                />
              </div>
              <div class="flex items-center gap-1.5">
                <label :for="endTimeInputId" class="text-muted-foreground font-medium">Kết thúc:</label>
                <Input
                  :id="endTimeInputId"
                  type="time"
                  v-model="endTimeValue"
                  class="h-8 w-24 bg-background text-center font-mono text-xs"
                  aria-label="Thời gian kết thúc"
                  :aria-invalid="!isRangeValid"
                  :aria-describedby="!isRangeValid ? rangeTimeErrorId : undefined"
                />
              </div>
            </div>
            <p
              v-if="!isRangeValid"
              :id="rangeTimeErrorId"
              role="alert"
              class="text-[10px] text-destructive font-medium text-right mt-1"
            >
              Thời gian bắt đầu phải trước thời gian kết thúc
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-2 border-t border-border/70 bg-background/95 p-3">
            <Button
              variant="ghost"
              size="sm"
              class="h-8 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              @mousedown.prevent.stop
              @click="clearFilter"
              >Xóa</Button
            >
            <Button
              size="sm"
              class="h-8 text-xs font-medium shadow-xs disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:opacity-100"
              :disabled="!canApply"
              @mousedown.prevent.stop
              @click="applyFilter"
              >Áp dụng</Button
            >
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

<style scoped>
:deep(.datatable-range-calendar [data-slot="range-calendar-cell"]:has([data-selected])) {
  background-color: color-mix(in hsl, var(--color-primary) 9%, transparent);
}

:deep(.datatable-range-calendar [data-slot="range-calendar-cell"]:has([data-selection-start])) {
  border-top-left-radius: var(--radius-md);
  border-bottom-left-radius: var(--radius-md);
}

:deep(.datatable-range-calendar [data-slot="range-calendar-cell"]:has([data-selection-end])) {
  border-top-right-radius: var(--radius-md);
  border-bottom-right-radius: var(--radius-md);
}

:deep(.datatable-calendar [data-slot="calendar-cell-trigger"]:not([data-selected]):hover),
:deep(.datatable-range-calendar [data-slot="range-calendar-trigger"]:not([data-selected]):hover) {
  background-color: color-mix(in hsl, var(--color-accent) 82%, var(--color-background));
}

:deep(.datatable-calendar [data-slot="calendar-cell-trigger"][data-selected]),
:deep(.datatable-range-calendar [data-slot="range-calendar-trigger"][data-selection-start]),
:deep(.datatable-range-calendar [data-slot="range-calendar-trigger"][data-selection-end]) {
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.12);
}
</style>
