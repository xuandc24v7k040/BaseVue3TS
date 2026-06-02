import type {
  DataTableFilterQuery,
  DataTableQuery,
  DataTableQueryMetadata,
  DataTableServerParams,
} from './interface'

export type DataTableQueryAdapter<TParams> = (query: DataTableQuery) => TParams

interface DataTableServerParamOptions<TParams extends Record<string, unknown>> {
  map?: (params: DataTableServerParams, query: DataTableQuery) => TParams
  serializeFilters?: (filters: DataTableFilterQuery[]) => string
  serializeFilterMetadata?: (metadata: DataTableQueryMetadata) => Partial<DataTableServerParams>
}

interface DataTableApiQueryAdapterOptions<TParams extends Record<string, unknown>> {
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

export interface BookoraNestJsTableParams extends Record<string, unknown> {
  page: number
  limit: number
  search?: string
  searchBy?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: string
}

interface BookoraNestJsQueryAdapterOptions<
  TParams extends Record<string, unknown>,
> {
  includeSearchBy?: boolean
  serializeFilters?: (filters: DataTableFilterQuery[], query: DataTableQuery) => string | undefined
  map?: (params: BookoraNestJsTableParams, query: DataTableQuery) => TParams
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
  options: DataTableApiQueryAdapterOptions<TParams> = {},
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
        const [primarySort] = query.sort
        params[sortByKey] = primarySort.id
        params[sortOrderKey] = primarySort.desc ? 'desc' : 'asc'
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

export function toBookoraNestJsTableParams(query: DataTableQuery): BookoraNestJsTableParams {
  return createBookoraNestJsQueryAdapter()(query)
}

export function createBookoraNestJsQueryAdapter<
  TParams extends Record<string, unknown> = BookoraNestJsTableParams,
>(
  options: BookoraNestJsQueryAdapterOptions<TParams> = {},
): DataTableQueryAdapter<TParams> {
  return (query) => {
    const primarySort = query.sort?.[0]
    const params: BookoraNestJsTableParams = {
      page: query.page,
      limit: query.pageSize,
    }

    if (query.search?.value) {
      params.search = query.search.value
      if (options.includeSearchBy) params.searchBy = query.search.columnIds
    }

    if (primarySort) {
      params.sortBy = primarySort.id
      params.sortOrder = primarySort.desc ? 'desc' : 'asc'
    }

    if (query.filters?.length) {
      const serializedFilters =
        options.serializeFilters?.(query.filters, query) ?? defaultSerializeFilters(query.filters)
      if (serializedFilters) params.filters = serializedFilters
    }

    return options.map ? options.map(params, query) : (params as unknown as TParams)
  }
}
