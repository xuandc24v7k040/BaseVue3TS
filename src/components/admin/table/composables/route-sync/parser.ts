import type { ColumnFiltersState, SortingState } from '@tanstack/vue-table'
import type { LocationQuery } from 'vue-router'
import type { DataTableFilterQuery, DataTableFilterValue, DateRangeValue } from '../../interface'
import {
  compareDateLike,
  isDateRangeValue,
  isValidLocalDateTimeString,
  normalizePageSize,
  parseJsonSafe,
} from '../../utils'
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

function parseQueryStringArray(
  value: unknown,
  arrayFormat: 'comma' | 'repeated',
): string[] {
  const values = getQueryStrings(value)

  const rawValues =
    arrayFormat === 'comma'
      ? values.flatMap((item) => item.split(','))
      : values

  return rawValues.map((item) => item.trim()).filter(Boolean)
}

function parsePositiveInteger(value: unknown): number | undefined {
  const parsed = Number(getQueryString(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function isAllowedColumnId(columnId: string, allowedIds?: string[]): boolean {
  return !allowedIds || allowedIds.length === 0 || allowedIds.includes(columnId)
}

function getAllowedSortIds(defaults: RouteSyncDefaults): string[] | undefined {
  return defaults.sortIds ?? defaults.columnIds
}

function decodeQueryPart(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseCompactSort(value: unknown, defaults: RouteSyncDefaults): SortingState | undefined {
  const sortValues = parseQueryStringArray(value, 'comma')
  if (!sortValues.length) return undefined
  const allowedSortIds = getAllowedSortIds(defaults)

  return sortValues
    .map((item) => {
      const lastColon = item.lastIndexOf(':')
      if (lastColon === -1) return null

      const id = item.slice(0, lastColon).trim()
      const direction = item.slice(lastColon + 1).trim().toLowerCase()

      const decodedId = decodeQueryPart(id)
      if (!decodedId) return null
      if (!isAllowedColumnId(decodedId, allowedSortIds)) return null

      // Reject unknown direction values — only accept explicit 'asc' or 'desc'
      if (direction !== 'asc' && direction !== 'desc') return null

      return {
        id: decodedId,
        desc: direction === 'desc',
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

  if (start && !isValidLocalDateTimeString(start)) return undefined
  if (end && !isValidLocalDateTimeString(end)) return undefined

  if (start && end && compareDateLike(start, end) > 0) return undefined

  return {
    start: start || undefined,
    end: end || undefined,
  }
}

function parsePrimitiveValue(
  val: string,
  preserveString = false,
  forceNumeric = false,
  forceBoolean = false,
): string | number | boolean | undefined {
  const trimmed = val.trim()

  if (forceBoolean) {
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    return undefined
  }

  if (forceNumeric) {
    if (!trimmed) return undefined
    const num = Number(trimmed)
    return Number.isFinite(num) ? num : undefined
  }

  if (preserveString) return trimmed

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  // Prevent numeric parsing for values with leading zeros (e.g., zip codes "02108", product codes "01")
  if (trimmed.length > 1 && trimmed.startsWith('0') && !trimmed.startsWith('0.')) {
    return trimmed
  }

  const num = Number(trimmed)
  if (trimmed !== '' && !Number.isNaN(num) && Number.isFinite(num) && String(num) === trimmed) {
    // Prevent precision loss for large IDs/SKUs beyond safe integer limits
    if (num >= Number.MIN_SAFE_INTEGER && num <= Number.MAX_SAFE_INTEGER) {
      return num
    }
  }

  return trimmed
}

function parseCompactFilterValue(
  value: unknown,
  arrayFormat: 'comma' | 'repeated',
  forceArray = false,
  preserveString = false,
  forceNumeric = false,
  forceBoolean = false,
): DataTableFilterValue | undefined {
  const values = parseQueryStringArray(value, arrayFormat)
  if (!values.length) return undefined
  const parsedValues = values
    .map((v) =>
      parsePrimitiveValue(decodeQueryPart(v), preserveString, forceNumeric, forceBoolean),
    )
    .filter((v): v is string | number | boolean => v !== undefined)
  if (!parsedValues.length) return undefined
  return forceArray ? parsedValues : parsedValues.length === 1 ? parsedValues[0] : parsedValues
}

function isPrimitive(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function isRouteFilterValue(value: unknown): value is DataTableFilterValue {
  if (isPrimitive(value)) return true
  // isDateRangeValue already validates shape, date strings, and start <= end order
  if (isDateRangeValue(value)) return true
  if (Array.isArray(value)) {
    return value.every(isPrimitive)
  }
  return false
}

function normalizeParsedFilterValue(
  value: DataTableFilterValue,
  forceArray: boolean,
  preserveString: boolean,
  forceNumeric = false,
  forceBoolean = false,
): DataTableFilterValue | undefined {
  const normalizePrimitive = (item: string | number | boolean): string | number | boolean | undefined => {
    if (forceBoolean) {
      if (String(item) === 'true') return true
      if (String(item) === 'false') return false
      return undefined
    }
    if (forceNumeric) {
      const raw = String(item).trim()
      if (!raw) return undefined
      const num = Number(raw)
      return Number.isFinite(num) ? num : undefined
    }
    return preserveString ? String(item) : item
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map(normalizePrimitive)
      .filter((item): item is string | number | boolean => item !== undefined)
    return normalized.length ? normalized : undefined
  }

  if (isDateRangeValue(value)) return value

  const normalized = normalizePrimitive(value)
  if (normalized === undefined) return undefined
  return forceArray ? [normalized] : normalized
}

function parseFilterValue(
  value: unknown,
  forceArray = false,
  preserveString = false,
  forceNumeric = false,
  forceBoolean = false,
): DataTableFilterValue | undefined {
  const values = getQueryStrings(value)
  if (!values.length) return undefined
  if (values.length > 1) {
    const parsedValues = values
      .map((v) => parsePrimitiveValue(v, preserveString, forceNumeric, forceBoolean))
      .filter((v): v is string | number | boolean => v !== undefined)
    return parsedValues.length ? parsedValues : undefined
  }

  const [rawValue] = values
  if (!rawValue) return undefined

  if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
    const parsed = parseJsonSafe<unknown>(rawValue)
    if (isRouteFilterValue(parsed)) {
      const normalized = normalizeParsedFilterValue(
        parsed,
        forceArray,
        preserveString,
        forceNumeric,
        forceBoolean,
      )
      if (normalized === undefined) return undefined
      if (Array.isArray(normalized) && normalized.length === 0) return undefined
      return normalized
    }
  }

  const parsedValue = parsePrimitiveValue(rawValue, preserveString, forceNumeric, forceBoolean)
  if (parsedValue === undefined) return undefined
  return forceArray ? [parsedValue] : parsedValue
}

function parseLegacyFilters(
  value: unknown,
  defaults?: RouteSyncDefaults,
): ColumnFiltersState | undefined {
  const rawValue = getQueryString(value)
  if (!rawValue) return undefined

  const filters = parseJsonSafe<DataTableFilterQuery[]>(rawValue)
  if (!Array.isArray(filters)) return undefined

  const parsed: ColumnFiltersState = []

  filters
    .forEach((filter) => {
      const id = typeof filter.id === 'string' ? filter.id.trim() : ''
      if (!id || !isRouteFilterValue(filter.value)) return
      if (!isAllowedColumnId(id, defaults?.columnIds)) return

      const forceArray = defaults?.arrayFilterIds?.includes(id) ?? false
      const preserveString = defaults?.stringFilterIds?.includes(id) ?? false
      const forceNumeric = defaults?.numericFilterIds?.includes(id) ?? false
      const forceBoolean = defaults?.booleanFilterIds?.includes(id) ?? false
      const normalizedValue = normalizeParsedFilterValue(
        filter.value as DataTableFilterValue,
        forceArray,
        preserveString,
        forceNumeric,
        forceBoolean,
      )
      if (normalizedValue === undefined) return
      if (Array.isArray(normalizedValue) && normalizedValue.length === 0) return
      parsed.push({
        id,
        value: normalizedValue,
      })
    })

  return parsed.length ? parsed : undefined
}

function parseLegacySorting(
  value: unknown,
  defaults: RouteSyncDefaults,
): SortingState | undefined {
  const rawValue = getQueryString(value)
  if (!rawValue) return undefined

  const sorting = parseJsonSafe<Array<{ id: string; desc: boolean }>>(rawValue)
  if (!Array.isArray(sorting)) return undefined
  const allowedSortIds = getAllowedSortIds(defaults)

  return sorting
    .map((sort) => ({
      id: typeof sort.id === 'string' ? sort.id.trim() : '',
      desc: sort.desc,
    }))
    .filter(
      (sort) =>
        sort.id !== '' &&
        typeof sort.desc === 'boolean' &&
        isAllowedColumnId(sort.id, allowedSortIds),
    )
}

function parseFlatSorting(
  routeQuery: Record<string, unknown>,
  config: ResolvedRouteSyncConfig,
  defaults: RouteSyncDefaults,
): SortingState | undefined {
  const sortByValues = getQueryStrings(routeQuery[routeQueryKey(config, 'sortBy')])
  if (!sortByValues.length) return undefined

  const sortOrderValues = getQueryStrings(routeQuery[routeQueryKey(config, 'sortOrder')])
  const allowedSortIds = getAllowedSortIds(defaults)

  const parsed = sortByValues
    .map((id, index) => {
      const columnId = id.trim()
      if (!columnId) return null
      if (!isAllowedColumnId(columnId, allowedSortIds)) return null

      const rawOrder = sortOrderValues[index]
      // Missing sortOrder defaults to ascending (common convention)
      if (rawOrder === undefined) {
        return { id: columnId, desc: false }
      }

      // Reject explicitly invalid sort directions
      const order = rawOrder.trim().toLowerCase()
      if (order !== 'asc' && order !== 'desc') return null

      return { id: columnId, desc: order === 'desc' }
    })
    .filter((sort): sort is SortingState[number] => Boolean(sort))

  return parsed.length ? parsed : undefined
}

function parseFlatFilters(
  routeQuery: Record<string, unknown>,
  config: ResolvedRouteSyncConfig,
  defaults: RouteSyncDefaults,
): ColumnFiltersState | undefined {
  const filters: ColumnFiltersState = []

  Object.entries(routeQuery).forEach(([key, value]) => {
    const columnId = getFilterColumnIdFromKey(config, key)
    if (!columnId) return
    if (!isAllowedColumnId(columnId, defaults.columnIds)) return

    const shouldForceArray = defaults.arrayFilterIds?.includes(columnId) ?? false
    const shouldForceString = defaults.stringFilterIds?.includes(columnId) ?? false
    const shouldForceNumeric = defaults.numericFilterIds?.includes(columnId) ?? false
    const shouldForceBoolean = defaults.booleanFilterIds?.includes(columnId) ?? false
    const parsedValue = parseFilterValue(
      value,
      shouldForceArray,
      shouldForceString,
      shouldForceNumeric,
      shouldForceBoolean,
    )
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
    if (!isAllowedColumnId(filterId, defaults.columnIds)) return

    const paramBase = compactFilterParamBase(config, filterId)
    const isDateColumn = defaults.dateColumnIds?.includes(filterId) ?? false

    if (isDateColumn) {
      const dateRange = parseCompactDateRange(routeQuery, paramBase)
      if (dateRange) {
        filters.push({
          id: filterId,
          value: dateRange,
        })
        return
      }
    }

    const shouldForceArray = defaults.arrayFilterIds?.includes(filterId) ?? false
    const shouldForceString = defaults.stringFilterIds?.includes(filterId) ?? false
    const shouldForceNumeric = defaults.numericFilterIds?.includes(filterId) ?? false
    const shouldForceBoolean = defaults.booleanFilterIds?.includes(filterId) ?? false
    const parsedValue = parseCompactFilterValue(
      routeQuery[paramBase],
      config.arrayFormat,
      shouldForceArray,
      shouldForceString,
      shouldForceNumeric,
      shouldForceBoolean,
    )
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
        ? parseCompactSort(routeQuery[config.paramNames.sort], defaults)
        : undefined) ??
      parseFlatSorting(routeQuery, config, defaults) ??
      parseLegacySorting(routeQuery[routeQueryKey(config, 'sort')], defaults) ??
      []
    : undefined
  const filters = config.filters
    ? (config.mode === 'compact'
        ? parseCompactFilters(routeQuery, config, defaults)
        : undefined) ??
      parseFlatFilters(routeQuery, config, defaults) ??
      parseLegacyFilters(routeQuery[routeQueryKey(config, 'filters')], defaults) ??
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
            ...(config.page
              ? {
                  pageIndex: resolvedPage
                    ? resolvedPage - 1
                    : defaults.pageIndex,
                }
              : {}),
            ...(config.pageSize
              ? {
                  pageSize: normalizePageSize(resolvedPageSize, defaults.pageSize, defaults.maxPageSize),
                }
              : {}),
          }
        : undefined,
    sorting,
  }
}
