import type { Column } from '@tanstack/vue-table'
import type {
  DataTableConfig,
  DataTableFilterOption,
  DataTableFilterValue,
  DateRangeValue,
} from './interface'

export function getColumnTitle<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header
  return column.columnDef.meta?.title || (typeof header === 'string' ? header : column.id)
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (value === null || value === undefined || value === '') return []
  return [String(value)]
}

export function getOptionLabels(value: unknown, options: DataTableFilterOption[]): string {
  return toStringArray(value)
    .map((item) => options.find((option) => option.value === item)?.label ?? item)
    .join(', ')
}

/**
 * Compares two date-like strings with mixed precision support.
 * Normalizes to full datetime precision (YYYY-MM-DDTHH:mm:ss.SSS)
 * before comparing, so mixed-precision comparisons are safe.
 */
export function compareDateLike(a: string, b: string): number {
  return normalizeDateTimePrecision(a).localeCompare(normalizeDateTimePrecision(b))
}

/**
 * Normalizes a date or datetime string to full precision: YYYY-MM-DDTHH:mm:ss.SSS.
 * Handles date-only (YYYY-MM-DD), minute-precision (THH:mm), second-precision (THH:mm:ss),
 * and millisecond-precision (THH:mm:ss.SSS) inputs.
 */
function normalizeDateTimePrecision(value: string): string {
  if (!value.includes('T')) return `${value}T00:00:00.000`

  const [datePart, timePart = '00:00'] = value.split('T')
  const timeSegments = timePart.split(':')
  const hh = timeSegments[0] ?? '00'
  const mm = timeSegments[1] ?? '00'
  const rest = timeSegments[2] ?? '00'
  const [ss, ms = '000'] = rest.split('.')

  return `${datePart}T${hh}:${mm}:${ss}.${ms.padEnd(3, '0')}`
}

export function isDateRangeValue(value: unknown): value is DateRangeValue {
  if (typeof value !== 'object' || value === null) return false

  const obj = value as Record<string, unknown>
  const hasStart = 'start' in obj
  const hasEnd = 'end' in obj

  if (!hasStart && !hasEnd) return false
  if (!obj.start && !obj.end) return false

  if (hasStart && !isValidLocalDateTimeString(obj.start)) return false
  if (hasEnd && !isValidLocalDateTimeString(obj.end)) return false

  // Reject reversed ranges (start > end), using mixed-precision-safe comparison
  if (
    typeof obj.start === 'string' &&
    typeof obj.end === 'string' &&
    compareDateLike(obj.start, obj.end) > 0
  ) {
    return false
  }

  return true
}

/**
 * Validates a local date or datetime string.
 * Accepts: YYYY-MM-DD, YYYY-MM-DDTHH:mm, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ss.SSS.
 * Rejects timezone offsets (Z, +HH:MM) and out-of-range time values (e.g., T99:99).
 */
export function isValidLocalDateTimeString(s: unknown): boolean {
  if (s === undefined) return true // Allow optional start/end as undefined
  if (typeof s !== 'string') return false

  const match = s.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/)
  if (!match) return false

  const [, datePart, hh, mm, ss] = match
  if (!datePart) return false

  // Validate date part semantically
  const date = parseLocalDate(datePart)
  if (Number.isNaN(date.getTime())) return false

  // Validate time part ranges if present
  if (hh !== undefined) {
    const hour = Number(hh)
    const minute = Number(mm)
    if (hour < 0 || hour > 23) return false
    if (minute < 0 || minute > 59) return false

    if (ss !== undefined) {
      const second = Number(ss)
      if (second < 0 || second > 59) return false
    }
  }

  return true
}

function isPrimitiveFilterValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export function toDataTableFilterValue(value: unknown): DataTableFilterValue {
  if (isDateRangeValue(value)) return value

  if (Array.isArray(value)) {
    const normalized = value.filter(isPrimitiveFilterValue)
    return normalized.length ? normalized : ''
  }

  if (isPrimitiveFilterValue(value)) return value

  return ''
}

let storageAvailableCache: boolean | undefined

export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  if (storageAvailableCache !== undefined) return storageAvailableCache
  try {
    const storage = window.localStorage
    const key = '__datatable_storage_test__'
    storage.setItem(key, key)
    storage.removeItem(key)
    storageAvailableCache = true
    return true
  } catch {
    storageAvailableCache = false
    return false
  }
}

export function formatDateWithPattern(date: Date, pattern: string): string {
  const yyyy = date.getFullYear()
  const yy = String(yyyy).slice(-2)
  const m = date.getMonth() + 1
  const mm = String(m).padStart(2, '0')
  const d = date.getDate()
  const dd = String(d).padStart(2, '0')

  return pattern.replace(/YYYY|yyyy|YY|yy|MM|mm|DD|dd/g, (match) => {
    switch (match.toLowerCase()) {
      case 'yyyy':
        return String(yyyy)
      case 'yy':
        return yy
      case 'mm':
        return mm
      case 'dd':
        return dd
      default:
        return match
    }
  })
}

export function formatLocalDate(
  val: string,
  locale = 'vi-VN',
  dateStyle: 'full' | 'long' | 'medium' | 'short' = 'medium',
  dateFormatPattern?: string,
): string {
  const date = parseLocalDate(val)
  if (Number.isNaN(date.getTime())) return val

  let timeStr = ''
  if (val.includes('T')) {
    const timePart = val.split('T')[1] ?? ''
    timeStr = ' ' + timePart.slice(0, 5)
  }

  let dateFormatted = ''
  if (dateFormatPattern) {
    dateFormatted = formatDateWithPattern(date, dateFormatPattern)
  } else {
    try {
      dateFormatted = new Intl.DateTimeFormat(locale, { dateStyle }).format(date)
    } catch {
      try {
        dateFormatted = new Intl.DateTimeFormat('vi-VN', { dateStyle }).format(date)
      } catch {
        dateFormatted = date.toLocaleDateString()
      }
    }
  }

  return `${dateFormatted}${timeStr}`
}

export function formatDateRangeValue(
  value: unknown,
  locale = 'vi-VN',
  dateStyle: 'full' | 'long' | 'medium' | 'short' = 'medium',
  mode: 'single' | 'range' | 'single-datetime' | 'range-datetime' = 'range',
  dateFormatPattern?: string,
  labelFormatter?: { from?: string; to?: string },
): string | null {
  const isSingle = mode === 'single' || mode === 'single-datetime'

  if (isSingle) {
    if (typeof value === 'string' && value !== '') {
      return formatLocalDate(value, locale, dateStyle, dateFormatPattern)
    }
    return null
  }

  if (typeof value === 'string' && value !== '') {
    return formatLocalDate(value, locale, dateStyle, dateFormatPattern)
  }

  if (!isDateRangeValue(value)) return null

  const start = value.start
  const end = value.end

  if (start && end) {
    return `${formatLocalDate(start, locale, dateStyle, dateFormatPattern)} - ${formatLocalDate(end, locale, dateStyle, dateFormatPattern)}`
  }
  if (start) {
    return `${labelFormatter?.from ?? 'Từ'} ${formatLocalDate(start, locale, dateStyle, dateFormatPattern)}`
  }
  if (end) {
    return `${labelFormatter?.to ?? 'Đến'} ${formatLocalDate(end, locale, dateStyle, dateFormatPattern)}`
  }
  return null
}

export function parseLocalDate(value: string): Date {
  const dateString = (value.includes('T') ? value.split('T')[0] : value) ?? ''
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
  if (!DATE_PATTERN.test(dateString)) return new Date(Number.NaN)

  const parts = dateString.split('-')
  if (parts.length !== 3) return new Date(Number.NaN)

  const [year, month, day] = parts.map(Number)

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return new Date(Number.NaN)
  }

  if (year <= 0) return new Date(Number.NaN)

  if (month < 1 || month > 12 || day < 1 || day > 31) return new Date(Number.NaN)

  const date = new Date(year, month - 1, day)
  if (year >= 0 && year < 100) {
    date.setFullYear(year)
  }

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return new Date(Number.NaN)
  }

  return date
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseJsonSafe<TValue>(value: string): TValue | undefined {
  try {
    return JSON.parse(value) as TValue
  } catch {
    return undefined
  }
}

export function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN'
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity'
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (isRecord(value)) {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export function normalizePageIndex(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function normalizePageSize(value: unknown, fallback: number, maxPageSize?: number): number {
  const parsed = Number(value)
  const max = maxPageSize && maxPageSize > 0 ? maxPageSize : undefined
  if (!Number.isInteger(parsed) || parsed < 1) {
    return max ? Math.min(fallback, max) : fallback
  }
  return max ? Math.min(parsed, max) : parsed
}

export function resolveRowId<TData>(
  row: TData,
  index: number,
  parent: { original: TData; id?: string } | undefined,
  config: DataTableConfig<TData>,
): string {
  const isFeatureActive = config.enableRowSelection || config.enableExpanding

  if (config.getRowId) {
    const id = config.getRowId(row, index, parent)
    if (id === null || id === undefined || id === '') {
      const message =
        '[DataTable] getRowId returned an empty value. Falling back to index is unsafe.'
      if (isFeatureActive) {
        throw new Error(message)
      } else if (import.meta.env.DEV) {
        console.warn(message)
      }
      return `row-${index}`
    }
    return String(id)
  }

  const idKey = config.rowIdKey || 'id'
  const value = (row as Record<string, unknown>)[idKey]
  if (value === null || value === undefined || value === '') {
    const message = `[DataTable] Missing value for key "${idKey}". Falling back to index is unsafe.`
    if (isFeatureActive) {
      throw new Error(message)
    } else if (import.meta.env.DEV) {
      console.warn(message)
    }
    return `row-${index}`
  }

  return String(value)
}

export function reportDuplicateDataTableRowId<TData>(
  id: string,
  config: DataTableConfig<TData>,
  isDev = import.meta.env.DEV,
): void {
  if (!isDev) return

  const isFeatureActive = config.enableRowSelection || config.enableExpanding

  if (isFeatureActive) {
    throw new Error(
      `[DataTable] Duplicate row id "${id}" detected while row selection or expansion is enabled. ` +
        'Row ids must be unique and stable across pages. Provide config.rowIdKey or config.getRowId.',
    )
  }

  console.warn(
    `[DataTable] Duplicate row id "${id}" detected. Selection/expansion may behave incorrectly.`,
  )
}
