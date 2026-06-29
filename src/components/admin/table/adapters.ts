import type {
  DataTableFilterQuery,
  DataTableFilterValue,
  DataTableQuery,
  DataTableQueryMetadata,
  DataTableServerParams,
  DateRangeValue,
} from './interface'
import { isDateRangeValue } from './utils'

export type DataTableQueryAdapter<TParams> = (query: DataTableQuery) => TParams

interface DataTableServerParamOptions<TParams extends Record<string, unknown>> {
  map?: (params: DataTableServerParams, query: DataTableQuery) => TParams
  serializeFilters?: (filters: DataTableFilterQuery[]) => string
  serializeFilterMetadata?: (metadata: DataTableQueryMetadata) => Partial<DataTableServerParams>
}

interface CreateDataTableApiQueryAdapterOptions<TParams extends Record<string, unknown>> {
  pageKey?: string
  pageSizeKey?: string
  searchKey?: string
  searchByKey?: string
  sortByKey?: string
  sortOrderKey?: string
  filtersKey?: string
  multiSort?: boolean
  serializeFilters?: (query: DataTableQuery) => Record<string, unknown> | string | undefined
  serializeSort?: (query: DataTableQuery) => Record<string, unknown>
  map?: (params: Record<string, unknown>, query: DataTableQuery) => TParams
}

export interface DataTableApiQueryAdapterOptions {
  pageBase?: 0 | 1
  pageKey?: string
  pageSizeKey?: string
  searchKey?: string
  searchByKey?: string
  includeSearchBy?: boolean
  sortKey?: string
  sortFormat?: 'array' | 'csv' | 'object'
  dateFormat?: 'local' | 'iso'
  /**
   * Required for safe `dateFormat: 'iso'` conversion.
   * Supported values: `Z` or fixed offsets such as `+07:00`.
   * Without this option, local date strings are preserved to avoid assuming UTC.
   */
  timezone?: string
  filterKeyMap?: Record<string, string>
  sortKeyMap?: Record<string, string>
  includeEmptyFilters?: boolean
}

export interface NestJsTableParams extends Record<string, unknown> {
  page: number
  limit: number
  search?: string
  searchBy?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: string
}

interface NestJsQueryAdapterOptions<
  TParams extends Record<string, unknown>,
> {
  includeSearchBy?: boolean
  serializeFilters?: (filters: DataTableFilterQuery[], query: DataTableQuery) => string | undefined
  map?: (params: NestJsTableParams, query: DataTableQuery) => TParams
}

function defaultSerializeFilters(filters: DataTableFilterQuery[]): string {
  return JSON.stringify(filters)
}

// Legacy adapter for APIs that accept one primary sort column.
export function toDataTableServerParams(query: DataTableQuery): DataTableServerParams {
  const primarySort = query.sort?.[0]

  return {
    page: query.page,
    limit: query.pageSize,
    search: query.search?.value,
    searchBy: query.search?.columnIds,
    sortBy: primarySort?.id,
    sortOrder: primarySort ? (primarySort.desc ? 'desc' : 'asc') : undefined,
    filters: query.filters?.length ? defaultSerializeFilters(query.filters) : undefined,
  }
}

export function getDataTableQueryMetadata(query: DataTableQuery): DataTableQueryMetadata {
  return {
    globalSearch: query.metadata?.globalSearch ?? query.search,
    columnSearch: query.metadata?.columnSearch ?? [],
    facetedFilters: query.metadata?.facetedFilters ?? [],
    dateFilters: query.metadata?.dateFilters ?? [],
  }
}

export function createDataTableQueryAdapter<TParams extends Record<string, unknown>>(
  options: DataTableServerParamOptions<TParams>,
): DataTableQueryAdapter<TParams> {
  return (query) => {
    const params = toDataTableServerParams(query)

    if (query.filters?.length && options.serializeFilters) {
      params.filters = options.serializeFilters(query.filters)
    }

    if (query.metadata && options.serializeFilterMetadata) {
      Object.assign(params, options.serializeFilterMetadata(query.metadata))
    }

    return options.map ? options.map(params, query) : (params as unknown as TParams)
  }
}

export function createDataTableApiQueryAdapter<TParams extends Record<string, unknown> = Record<string, unknown>>(
  options: CreateDataTableApiQueryAdapterOptions<TParams> = {},
): DataTableQueryAdapter<TParams> {
  const {
    pageKey = 'page',
    pageSizeKey = 'limit',
    searchKey = 'search',
    searchByKey = 'searchBy',
    sortByKey = 'sortBy',
    sortOrderKey = 'sortOrder',
    filtersKey = 'filters',
    multiSort = false,
  } = options

  return (query) => {
    const params: Record<string, unknown> = {
      [pageKey]: query.page,
      [pageSizeKey]: query.pageSize,
    }

    if (query.search?.value) {
      params[searchKey] = query.search.value
      params[searchByKey] = query.search.columnIds
    }

    if (options.serializeSort) {
      Object.assign(params, options.serializeSort(query))
    } else if (query.sort?.length) {
      if (multiSort) {
        params[sortByKey] = query.sort.map((sort) => sort.id)
        params[sortOrderKey] = query.sort.map((sort) => (sort.desc ? 'desc' : 'asc'))
      } else {
        const primarySort = query.sort[0]
        if (primarySort) {
          params[sortByKey] = primarySort.id
          params[sortOrderKey] = primarySort.desc ? 'desc' : 'asc'
        }
      }
    }

    const serializedFilters = options.serializeFilters?.(query)
    if (typeof serializedFilters === 'string') {
      params[filtersKey] = serializedFilters
    } else if (serializedFilters) {
      Object.assign(params, serializedFilters)
    } else if (query.filters?.length) {
      params[filtersKey] = defaultSerializeFilters(query.filters)
    }

    return options.map ? options.map(params, query) : (params as TParams)
  }
}

function isEmptyFilterValue(value: DataTableFilterValue): boolean {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'string') return value.trim() === ''
  if (isDateRangeValue(value)) return !value.start && !value.end
  return value === undefined || value === null
}

function normalizeLocalDateTimeForIso(
  value: string,
  bound: 'start' | 'end',
  timezone?: string,
): string {
  if (!timezone) return value
  if (timezone !== 'Z' && !/^[+-]\d{2}:\d{2}$/.test(timezone)) {
    throw new Error(
      `[DataTable Adapter] Unsupported timezone "${timezone}". Use "Z" or a fixed offset like "+07:00".`,
    )
  }

  const [datePart, timePart] = value.split('T')
  if (!datePart) return value

  const normalizedTime =
    timePart ??
    (bound === 'start' ? '00:00:00.000' : '23:59:59.999')
  const withSeconds = normalizedTime.includes(':')
    ? normalizedTime.split(':').length === 2
      ? `${normalizedTime}:00.000`
      : normalizedTime.includes('.')
        ? normalizedTime
        : `${normalizedTime}.000`
    : normalizedTime
  const date = new Date(`${datePart}T${withSeconds}${timezone}`)

  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

export function normalizeDataTableDateRangeFilter(
  value: DateRangeValue,
  options: Pick<DataTableApiQueryAdapterOptions, 'dateFormat' | 'timezone'> = {},
): { from?: string; to?: string } {
  const dateFormat = options.dateFormat ?? 'local'
  const normalize = (dateValue: string | undefined, bound: 'start' | 'end') => {
    if (!dateValue) return undefined
    if (dateFormat === 'local') return dateValue
    return normalizeLocalDateTimeForIso(dateValue, bound, options.timezone)
  }

  return {
    from: normalize(value.start, 'start'),
    to: normalize(value.end, 'end'),
  }
}

export function serializeDataTableSort(
  sort: DataTableQuery['sort'],
  options: Pick<DataTableApiQueryAdapterOptions, 'sortFormat' | 'sortKeyMap'> = {},
): string | string[] | Record<string, 'asc' | 'desc'> | undefined {
  if (!sort?.length) return undefined

  const mappedSort = sort
    .map((item) => {
      const id = options.sortKeyMap?.[item.id] ?? item.id
      const direction = item.desc ? 'desc' : 'asc'
      return id ? { id, direction } : null
    })
    .filter((item): item is { id: string; direction: 'asc' | 'desc' } => Boolean(item))

  if (!mappedSort.length) return undefined

  const format = options.sortFormat ?? 'csv'
  if (format === 'array') return mappedSort.map((item) => `${item.id}:${item.direction}`)
  if (format === 'object') {
    return mappedSort.reduce<Record<string, 'asc' | 'desc'>>((params, item) => {
      params[item.id] = item.direction
      return params
    }, {})
  }

  return mappedSort.map((item) => `${item.id}:${item.direction}`).join(',')
}

export function serializeDataTableFilters(
  filters: DataTableFilterQuery[] | undefined,
  options: Pick<
    DataTableApiQueryAdapterOptions,
    'dateFormat' | 'filterKeyMap' | 'includeEmptyFilters' | 'timezone'
  > = {},
): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  filters?.forEach((filter) => {
    if (!options.includeEmptyFilters && isEmptyFilterValue(filter.value)) return

    const key = options.filterKeyMap?.[filter.id] ?? filter.id

    if (isDateRangeValue(filter.value)) {
      const range = normalizeDataTableDateRangeFilter(filter.value, options)
      if (options.includeEmptyFilters || range.from) params[`${key}From`] = range.from
      if (options.includeEmptyFilters || range.to) params[`${key}To`] = range.to
      return
    }

    params[key] = filter.value
  })

  return params
}

export function toDataTableApiParams(
  query: DataTableQuery,
  options: DataTableApiQueryAdapterOptions = {},
): Record<string, unknown> {
  const {
    pageBase = 1,
    pageKey = 'page',
    pageSizeKey = 'limit',
    searchKey = 'search',
    searchByKey = 'searchBy',
    includeSearchBy = false,
    sortKey = 'sort',
  } = options

  const params: Record<string, unknown> = {
    [pageKey]: pageBase === 0 ? Math.max(query.page - 1, 0) : query.page,
    [pageSizeKey]: query.pageSize,
  }

  const search = query.search ?? query.metadata?.globalSearch

  if (search?.value) {
    params[searchKey] = search.value
    if (includeSearchBy) {
      params[searchByKey] = [...search.columnIds]
    }
  }

  const serializedSort = serializeDataTableSort(query.sort, options)
  if (serializedSort !== undefined) {
    params[sortKey] = serializedSort
  }

  Object.assign(params, serializeDataTableFilters(query.filters, options))

  return params
}

export function toNestJsTableParams(query: DataTableQuery): NestJsTableParams {
  return createNestJsQueryAdapter()(query)
}

export function createNestJsQueryAdapter<
  TParams extends Record<string, unknown> = NestJsTableParams,
>(
  options: NestJsQueryAdapterOptions<TParams> = {},
): DataTableQueryAdapter<TParams> {
  return (query) => {
    const baseParams = toDataTableServerParams(query)
    const params: NestJsTableParams = {
      page: baseParams.page,
      limit: baseParams.limit,
    }

    if (baseParams.search) {
      params.search = baseParams.search
      if (options.includeSearchBy) params.searchBy = baseParams.searchBy
    }

    if (baseParams.sortBy) {
      params.sortBy = baseParams.sortBy
      params.sortOrder = baseParams.sortOrder
    }

    if (query.filters?.length) {
      const serializedFilters =
        options.serializeFilters?.(query.filters, query) ?? baseParams.filters
      if (serializedFilters) params.filters = serializedFilters
    }

    return options.map ? options.map(params, query) : (params as unknown as TParams)
  }
}
