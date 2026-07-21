import { describe, expect, it } from 'vitest'
import { formatProductDate, toDateInputValue } from './product-date'

describe('product date helpers', () => {
  it('formats ISO midnight UTC without shifting the calendar day', () => {
    expect(formatProductDate('2021-11-25T00:00:00.000Z')).toBe('25/11/2021')
    expect(toDateInputValue('2021-11-25T00:00:00.000Z')).toBe('2021-11-25')
  })

  it('accepts date-only values', () => {
    expect(formatProductDate('2021-11-25')).toBe('25/11/2021')
    expect(toDateInputValue('2021-11-25')).toBe('2021-11-25')
  })

  it('fails safely for null and malformed dates', () => {
    expect(formatProductDate(null)).toBe('—')
    expect(formatProductDate('2021-02-31')).toBe('—')
    expect(formatProductDate('not-a-date')).toBe('—')
    expect(toDateInputValue('not-a-date')).toBe('')
  })
})
