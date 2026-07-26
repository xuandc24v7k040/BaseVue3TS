import { describe, expect, it } from 'vitest'
import { formatDateOnly, formatDateTime } from './date-format'

describe('shared date formatters', () => {
  it('formats datetime with 24-hour time and a four-digit year', () => {
    expect(formatDateTime('2026-07-25T10:35:00.000Z')).toBe(
      '17:35 25-07-2026',
    )
  })

  it('formats ISO date-only values without a timezone shift', () => {
    expect(formatDateOnly('2020-09-08')).toBe('08-09-2020')
    expect(formatDateOnly('2020-09-08T00:00:00.000Z')).toBe('08-09-2020')
  })

  it.each([null, undefined, '', 'not-a-date', '2021-02-31'])(
    'returns an em dash for an invalid value: %s',
    (value) => {
      expect(formatDateOnly(value)).toBe('—')
      expect(formatDateTime(value)).toBe('—')
    },
  )
})
