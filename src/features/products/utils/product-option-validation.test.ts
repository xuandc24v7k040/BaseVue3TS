import { describe, expect, it } from 'vitest'
import { normalizeProductColor, productColorError } from './product-option-validation'

describe('product option color validation', () => {
  it('accepts and normalizes valid colors', () => {
    expect(productColorError('#2563EB')).toBeNull()
    expect(productColorError('#aabbcc')).toBeNull()
    expect(normalizeProductColor('#aabbcc')).toBe('#AABBCC')
  })

  it('rejects placeholders and non-hex values', () => {
    expect(productColorError('#RRGGBB')).toContain('#RRGGBB')
    expect(productColorError('#GG0000')).toContain('#RRGGBB')
  })

  it('keeps the field nullable', () => {
    expect(productColorError('')).toBeNull()
    expect(normalizeProductColor('')).toBeNull()
  })
})
