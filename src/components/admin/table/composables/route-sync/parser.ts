import type { ColumnFiltersState, SortingState } from '@tanstack/vue-table'
import type { LocationQuery } from 'vue-router'
import type { DataTableFilterQuery, DataTableFilterValue, DateRangeValue } from '../../interface'
import { isDateRangeValue, normalizePageSize, parseJsonSafe } from '../../utils'
import {
  compactFilterParamBase,
  getCompactFilterIds,
  getFilterColumnIdFromKey,
  routeQueryKey,
} from './keys'
import type { ResolvedRouteSyncConfig, RouteSyncDefaults, RouteSyncedTableState } from './types'

function getQueryString(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return typeof value === 'string' ? value : undefined
}

function getQueryStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return typeof value === 'string' ? [value] : []
}

function parseQueryStringArray(value: unknown): string[] {
  return getQueryStrings(value)
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean)
}

function parsePositiveInteger(value: unknown): number | undefined {
  const parsed = Number(getQueryString(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function parseCompactSort(value: unknown): SortingState | undefined {
  const sortValues = parseQueryStringArray(value)
  if (!sortValues.length) return undefined

  return sortValues
    .map((item) => {
      const [id, direction] = item.split(':')
      const trimmedId = id?.trim()
      if (!trimmedId) return null

      return {
        id: trimmedId,
        desc: direction?.trim().toLowerCase() === 'desc',
      }
    })
    .filter((sort): sort is SortingState[number] => Boolean(sort))
}

function parseCompactDateRange(
  routeQuery: LocationQuery | Record<string, unknown>,
  paramBase: string,
): DateRangeValue | undefined {
  const start = getQueryString(routeQuery[`${paramBase}From`])?.trim()
  const end = getQueryString(routeQuery[`${paramBase}To`])?.trim()

  if (!start && !end) return undefined

  return {
    start: start || undefined,
    end: end || undefined,
  }
}

function parseCompactFilterValue(value: unknown): DataTableFilterValue | undefined {
  const values = parseQueryStringArray(value)
  if (!values.length) return undefined
  return values.length === 1 ? values[0] : values
}

function isRouteFilterValue(value: unknown): value is DataTableFilterValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value) ||
    isDateRangeValue(value)
  )
}

function parseFilterValue(value: unknown): DataTableFilterValue | undefined {
  const values = getQueryStrings(value)
  if (!values.length) return undefined
  if (values.length > 1) return values

  const [rawValue] = values
  if (!rawValue) return undefined

  if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
    const parsed = parseJsonSafe<unknown>(rawValue)
    if (isRouteFilterValue(parsed)) return parsed
  }

  return rawValue
}

function parseLegacyFilters(value: unknown): ColumnFiltersState | undefined {
  const rawValue = getQueryString(value)
  if (!rawValue) return undefined

  const filters = parseJsonSafe<DataTableFilterQuery[]>(rawValue)
  if (!Array.isArray(filters)) return undefined

  return filters
    .filter((filter) => filter.id && isRouteFilterValue(filter.value))
    .map((filter) => ({
      id: filter.id,
      value: filter.value,
    }))
}

function parseLegacySorting(value: unknown): SortingState | undefined {
  const rawValue = getQueryString(value)
  if (!rawValue) return undefined

  const sorting = parseJsonSafe<Array<{ id: string; desc: boolean }>>(rawValue)
  if (!Array.isArray(sorting)) return undefined

  return sorting
    .filter((sort) => sort.id && typeof sort.desc === 'boolean')
    .map((sort) => ({
      id: sort.id,
      desc: sort.desc,
    }))
}

function parseFlatSorting(
  routeQuery: Record<string, unknown>,
  config: ResolvedRouteSyncConfig,
): SortingState | undefined {
  const sortByValues = getQueryStrings(routeQuery[routeQueryKey(config, 'sortBy')])
  if (!sortByValues.length) return undefined

  const sortOrderValues = getQueryStrings(routeQuery[routeQueryKey(config, 'sortOrder')])

  return sortByValues
    .map((id, index) => ({
      id,
      desc: sortOrderValues[index] === 'desc',
    }))
    .filter((sort) => Boolean(sort.id))
}

function parseFlatFilters(
  routeQuery: Record<string, unknown>,
  config: ResolvedRouteSyncConfig,
): ColumnFiltersState | undefined {
  const filters: ColumnFiltersState = []

  Object.entries(routeQuery).forEach(([key, value]) => {
    const columnId = getFilterColumnIdFromKey(config, key)
    if (!columnId) return

    const parsedValue = parseFilterValue(value)
    if (parsedValue === undefined) return

    filters.push({
      id: columnId,
      value: parsedValue,
    })
  })

  return filters.length ? filters : undefined
}

function parseCompactFilters(
  routeQuery: LocationQuery | Record<string, unknown>,
  config: ResolvedRouteSyncConfig,
  defaults: RouteSyncDefaults,
): ColumnFiltersState | undefined {
  const filters: ColumnFiltersState = []

  getCompactFilterIds(config, defaults).forEach((filterId) => {
    const paramBase = compactFilterParamBase(config, filterId)
    const dateRange = parseCompactDateRange(routeQuery, paramBase)

    if (dateRange) {
      filters.push({
        id: filterId,
        value: dateRange,
      })
      return
    }

    const parsedValue = parseCompactFilterValue(routeQuery[paramBase])
    if (parsedValue === undefined) return

    filters.push({
      id: filterId,
      value: parsedValue,
    })
  })

  return filters.length ? filters : undefined
}

export function parseRouteQuery(
  routeQuery: LocationQuery | Record<string, unknown>,
  config: ResolvedRouteSyncConfig,
  defaults: RouteSyncDefaults,
): RouteSyncedTableState {
  const compactPage = config.page
    ? parsePositiveInteger(routeQuery[config.paramNames.page])
    : undefined
  const compactPageSize = config.pageSize
    ? parsePositiveInteger(routeQuery[config.paramNames.pageSize])
    : undefined
  const page = config.page
    ? parsePositiveInteger(routeQuery[routeQueryKey(config, 'page')])
    : undefined
  const pageSize = config.pageSize
    ? parsePositiveInteger(routeQuery[routeQueryKey(config, 'pageSize')])
    : undefined
  const sorting = config.sorting
    ? (config.mode === 'compact'
        ? parseCompactSort(routeQuery[config.paramNames.sort])
        : undefined) ??
      parseFlatSorting(routeQuery, config) ??
      parseLegacySorting(routeQuery[routeQueryKey(config, 'sort')]) ??
      []
    : undefined
  const filters = config.filters
    ? (config.mode === 'compact'
        ? parseCompactFilters(routeQuery, config, defaults)
        : undefined) ??
      parseFlatFilters(routeQuery, config) ??
      parseLegacyFilters(routeQuery[routeQueryKey(config, 'filters')]) ??
      []
    : undefined
  const search = config.search
    ? (config.mode === 'compact'
        ? getQueryString(routeQuery[config.paramNames.search])
        : undefined) ?? getQueryString(routeQuery[routeQueryKey(config, 'search')]) ?? ''
    : undefined
  const resolvedPage = (config.mode === 'compact' ? compactPage : undefined) ?? page
  const resolvedPageSize =
    (config.mode === 'compact' ? compactPageSize : undefined) ?? pageSize

  return {
    columnFilters: filters,
    globalFilter: search,
    pagination:
      config.page || config.pageSize
        ? {
            pageIndex: config.page
              ? resolvedPage
                ? resolvedPage - 1
                : defaults.pageIndex
              : undefined,
            pageSize: config.pageSize
              ? normalizePageSize(resolvedPageSize, defaults.pageSize, defaults.maxPageSize)
              : undefined,
          }
        : undefined,
    sorting,
  }
}
