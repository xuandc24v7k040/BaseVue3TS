import { describe, expect, it } from 'vitest'
import { findUniqueAdministrativeUnit, normalizeAdministrativeName } from './administrative-unit.adapter'

describe('administrative unit matching', () => {
  const units = [
    { code: 92, name: 'Thành phố Cần Thơ' },
    { code: 79, name: 'Thành phố Hồ Chí Minh' },
  ]

  it('matches Unicode names case-insensitively and without administrative prefixes', () => {
    expect(normalizeAdministrativeName(' TP. CẦN THƠ ')).toBe('can tho')
    expect(findUniqueAdministrativeUnit(units, 'tỉnh Cần Thơ')).toEqual(units[0])
  })

  it('does not auto-select ambiguous normalized names', () => {
    expect(findUniqueAdministrativeUnit([
      { code: 1, name: 'Phường An Bình' },
      { code: 2, name: 'Xã An Bình' },
    ], 'An Bình')).toBeNull()
  })
})
