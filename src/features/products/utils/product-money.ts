const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export function formatVnd(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(numeric) && numeric >= 0 ? VND_FORMATTER.format(numeric) : '—'
}

export function formatProductPriceRange(min: string | null | undefined, max: string | null | undefined): string {
  if (!min || !max) return 'Chưa cấu hình giá'
  return min === max ? formatVnd(min) : `${formatVnd(min)} – ${formatVnd(max)}`
}

export function normalizeVndInput(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return digits.slice(0, 13)
}

export function formatVndInput(value: string): string {
  return value ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(value)) : ''
}
