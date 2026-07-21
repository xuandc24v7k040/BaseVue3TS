export const PRODUCT_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

export function normalizeProductColor(value: string): string | null {
  const normalized = value.trim()
  return normalized ? normalized.toUpperCase() : null
}

export function productColorError(value: string): string | null {
  const normalized = value.trim()
  if (!normalized || PRODUCT_COLOR_PATTERN.test(normalized)) return null
  return 'Mã màu phải có dạng #RRGGBB, ví dụ #2563EB.'
}
