import type { AdministrativeUnitOption } from '../types'

const ADMINISTRATIVE_PREFIX = /^(tỉnh|thành phố|tp\.?|phường|xã|đặc khu)\s+/iu

export function normalizeAdministrativeName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('vi-VN')
    .replace(ADMINISTRATIVE_PREFIX, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/giu, 'd')
    .replace(/\s+/g, ' ')
}

export function findUniqueAdministrativeUnit<T extends AdministrativeUnitOption>(
  units: T[],
  savedName: string,
): T | null {
  const normalized = normalizeAdministrativeName(savedName)
  if (!normalized) return null
  const matches = units.filter((unit) => normalizeAdministrativeName(unit.name) === normalized)
  return matches.length === 1 ? matches[0] ?? null : null
}
