export type DateFormatValue = string | Date | null | undefined

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function validIsoDateParts(
  value: string,
): { year: number, month: number, day: number } | null {
  const match = ISO_DATE_PREFIX.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? { year, month, day }
    : null
}

function validDate(value: DateFormatValue): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (
    typeof value === 'string'
    && ISO_DATE_PREFIX.test(value)
    && !validIsoDateParts(value)
  ) {
    return null
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value: DateFormatValue): string {
  const date = validDate(value)
  if (!date) return '—'

  const parts = Object.fromEntries(
    DATE_TIME_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]),
  )
  return `${parts.hour}:${parts.minute} ${parts.day}-${parts.month}-${parts.year}`
}

export function formatDateOnly(value: DateFormatValue): string {
  if (typeof value === 'string') {
    const parts = validIsoDateParts(value)
    if (parts) {
      return `${pad(parts.day)}-${pad(parts.month)}-${String(parts.year).padStart(4, '0')}`
    }
    if (ISO_DATE_PREFIX.test(value)) return '—'
  }

  const date = validDate(value)
  if (!date) return '—'

  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${String(date.getFullYear()).padStart(4, '0')}`
}

export function formatRelativeTime(
  value: DateFormatValue,
  now = new Date(),
): string {
  const date = validDate(value)
  if (!date) return 'Không rõ thời gian'

  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000),
  )
  if (seconds < 60) return 'Vừa xong'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút trước`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} tháng trước`

  return `${Math.floor(months / 12)} năm trước`
}
