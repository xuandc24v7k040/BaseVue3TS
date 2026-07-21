import { describe, expect, it } from 'vitest'
import { formatProductPriceRange, formatVnd, formatVndInput, normalizeVndInput } from './product-money'

describe('product money helpers', () => {
  it('keeps VND as a whole-number string', () => {
    expect(normalizeVndInput('00 45.500 ₫')).toBe('45500')
    expect(normalizeVndInput('123456789012345')).toBe('1234567890123')
  })

  it('formats valid integer prices and rejects unsafe values', () => {
    expect(formatVnd('45000')).toContain('45.000')
    expect(formatVnd('-1')).toBe('—')
    expect(formatVnd('1.5')).toBe('—')
    expect(formatVndInput('40500')).toBe('40.500')
  })

  it('formats a price range without exposing identifiers', () => {
    expect(formatProductPriceRange('45000', '45000')).toBe(formatVnd('45000'))
    expect(formatProductPriceRange(null, null)).toBe('Chưa cấu hình giá')
  })
})
