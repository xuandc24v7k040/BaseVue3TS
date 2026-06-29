import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/vue-table'
import type { LocationQueryRaw } from 'vue-router'
import { stableStringify } from '../../utils'
import { getSyncedRouteQueryKeys } from './keys'
import type { ResolvedRouteSyncConfig, RouteSyncDefaults } from './types'

function normalizeQueryValues(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return []
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && item !== null && item !== '')
      .map(String)
  }
  return [String(value)]
}

function areRouteQueryValuesEqual(first: unknown, second: unknown): boolean {
  const firstValues = normalizeQueryValues(first)
  const secondValues = normalizeQueryValues(second)

  if (firstValues.length !== secondValues.length) return false
  return firstValues.every((value, index) => value === secondValues[index])
}

export function areRouteQueriesEqual(
  currentQuery: LocationQueryRaw,
  nextQuery: LocationQueryRaw,
  config: ResolvedRouteSyncConfig,
  defaults?: Pick<RouteSyncDefaults, 'filterIds' | 'dateColumnIds'>,
): boolean {
  return getSyncedRouteQueryKeys(currentQuery, nextQuery, config, defaults).every((key) =>
    areRouteQueryValuesEqual(currentQuery[key], nextQuery[key]),
  )
}

export function arePaginationStatesEqual(
  first: Partial<PaginationState>,
  second: Partial<PaginationState>,
): boolean {
  return first.pageIndex === second.pageIndex && first.pageSize === second.pageSize
}

export function areSortingStatesEqual(first: SortingState, second: SortingState): boolean {
  if (first.length !== second.length) return false

  return first.every((sort, index) => {
    const other = second[index]
    return other ? sort.id === other.id && sort.desc === other.desc : false
  })
}

export function areColumnFiltersEqual(
  first: ColumnFiltersState,
  second: ColumnFiltersState,
): boolean {
  if (first.length !== second.length) return false

  const secondMap = new Map(
    second.map((filter) => [filter.id, stableStringify(filter.value)])
  )

  return first.every((filter) => {
    const secondValue = secondMap.get(filter.id)
    return secondValue !== undefined && secondValue === stableStringify(filter.value)
  })
}
