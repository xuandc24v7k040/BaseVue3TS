import type { LocationQueryRaw } from 'vue-router'
import type { DataTableFilterValue } from '../../interface'
import { isDateRangeValue } from '../../utils'
import {
  clearTableRouteQueryKeys,
  compactFilterParamBase,
  filterValueKey,
  routeQueryKey,
} from './keys'
import type { SerializeRouteQueryOptions } from './types'

function serializeFilterValue(value: DataTableFilterValue): string | string[] {
  if (Array.isArray(value)) return value.map(String)
  if (isDateRangeValue(value)) return JSON.stringify(value)
  return String(value)
}

function serializeArrayValue(
  values: string[],
  arrayFormat: 'comma' | 'repeated',
): string | string[] | undefined {
  const normalizedValues = values.map((value) => value.trim()).filter(Boolean)
  if (!normalizedValues.length) return undefined
  return arrayFormat === 'repeated' ? normalizedValues : normalizedValues.join(',')
}

function serializeCompactFilterValue(
  value: DataTableFilterValue,
  arrayFormat: 'comma' | 'repeated',
): string | string[] | undefined {
  if (Array.isArray(value)) return serializeArrayValue(value.map(String), arrayFormat)
  if (isDateRangeValue(value)) return undefined

  const stringValue = String(value).trim()
  return stringValue || undefined
}

function serializeCompactSort(
  sorting: Array<{ id: string; desc: boolean }> | undefined,
): string | undefined {
  if (!sorting?.length) return undefined

  const serializedSort = sorting
    .map((sort) => {
      const id = sort.id.trim()
      return id ? `${id}:${sort.desc ? 'desc' : 'asc'}` : null
    })
    .filter((sort): sort is string => Boolean(sort))
    .join(',')

  return serializedSort || undefined
}

export function serializeRouteQuery({
  currentQuery,
  tableQuery,
  config,
  defaults,
}: SerializeRouteQueryOptions): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = clearTableRouteQueryKeys(currentQuery, config, defaults)

  if (config.mode === 'compact') {
    if (config.page && tableQuery.page !== defaults.pageIndex + 1) {
      nextQuery[config.paramNames.page] = String(tableQuery.page)
    }

    if (config.pageSize && tableQuery.pageSize !== defaults.pageSize) {
      nextQuery[config.paramNames.pageSize] = String(tableQuery.pageSize)
    }

    if (config.search && tableQuery.search?.value) {
      nextQuery[config.paramNames.search] = tableQuery.search.value
    }

    if (config.sorting) {
      nextQuery[config.paramNames.sort] = serializeCompactSort(tableQuery.sort)
    }

    if (config.filters) {
      tableQuery.filters?.forEach((filter) => {
        const paramBase = compactFilterParamBase(config, filter.id)

        if (isDateRangeValue(filter.value)) {
          nextQuery[`${paramBase}From`] = filter.value.start || undefined
          nextQuery[`${paramBase}To`] = filter.value.end || undefined
          return
        }

        nextQuery[paramBase] = serializeCompactFilterValue(filter.value, config.arrayFormat)
      })
    }

    return nextQuery
  }

  if (config.page && tableQuery.page !== defaults.pageIndex + 1) {
    nextQuery[routeQueryKey(config, 'page')] = String(tableQuery.page)
  }

  if (config.pageSize && tableQuery.pageSize !== defaults.pageSize) {
    nextQuery[routeQueryKey(config, 'pageSize')] = String(tableQuery.pageSize)
  }

  if (config.search && tableQuery.search?.value) {
    nextQuery[routeQueryKey(config, 'search')] = tableQuery.search.value
  }

  if (config.sorting && tableQuery.sort?.length) {
    nextQuery[routeQueryKey(config, 'sortBy')] = tableQuery.sort.map((sort) => sort.id)
    nextQuery[routeQueryKey(config, 'sortOrder')] = tableQuery.sort.map((sort) =>
      sort.desc ? 'desc' : 'asc',
    )
  }

  if (config.filters) {
    tableQuery.filters?.forEach((filter) => {
      nextQuery[filterValueKey(config, filter.id)] = serializeFilterValue(filter.value)
    })
  }

  return nextQuery
}
