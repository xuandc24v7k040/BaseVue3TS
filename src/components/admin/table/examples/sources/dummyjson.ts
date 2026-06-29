import type { DataTableFilterOption, DataTableFilterQuery, DataTableQuery } from '../../interface'

export interface DummyJsonProductRow {
  id: number
  title: string
  brand: string
  category: string
  price: number
  discountPercentage: number
  rating: number
  stock: number
  availabilityStatus: string
  thumbnail?: string
}

export interface DummyJsonProductsRequest {
  mode: 'server' | 'simulated-filter'
  endpoint: string
  url: string
  params: {
    limit: number
    skip: number
    q?: string
    sortBy?: string
    order?: 'asc' | 'desc'
  }
}

export interface DummyJsonProductsPage {
  items: DummyJsonProductRow[]
  total: number
  pageCount: number
  skip: number
  limit: number
  request: DummyJsonProductsRequest
}

const productSortFieldMap: Record<string, string> = {
  id: 'id',
  title: 'title',
  category: 'category',
  brand: 'brand',
  price: 'price',
  discountPercentage: 'discountPercentage',
  rating: 'rating',
  stock: 'stock',
  availabilityStatus: 'availabilityStatus',
}

export type DummyJsonProductFilterId =
  | 'category'
  | 'priceRange'
  | 'ratingRange'
  | 'stockStatus'
  | 'discountRange'

export const dummyJsonProductFilterOptions: Record<
  DummyJsonProductFilterId,
  DataTableFilterOption[]
> = {
  category: [
    { label: 'Beauty', value: 'beauty' },
    { label: 'Fragrances', value: 'fragrances' },
    { label: 'Furniture', value: 'furniture' },
    { label: 'Groceries', value: 'groceries' },
    { label: 'Home decoration', value: 'home-decoration' },
    { label: 'Kitchen accessories', value: 'kitchen-accessories' },
    { label: 'Laptops', value: 'laptops' },
    { label: 'Mens shirts', value: 'mens-shirts' },
    { label: 'Mens shoes', value: 'mens-shoes' },
    { label: 'Mens watches', value: 'mens-watches' },
    { label: 'Mobile accessories', value: 'mobile-accessories' },
    { label: 'Motorcycle', value: 'motorcycle' },
    { label: 'Skin care', value: 'skin-care' },
    { label: 'Smartphones', value: 'smartphones' },
    { label: 'Sports accessories', value: 'sports-accessories' },
    { label: 'Sunglasses', value: 'sunglasses' },
    { label: 'Tablets', value: 'tablets' },
    { label: 'Tops', value: 'tops' },
    { label: 'Vehicle', value: 'vehicle' },
    { label: 'Womens bags', value: 'womens-bags' },
    { label: 'Womens dresses', value: 'womens-dresses' },
    { label: 'Womens jewellery', value: 'womens-jewellery' },
    { label: 'Womens shoes', value: 'womens-shoes' },
    { label: 'Womens watches', value: 'womens-watches' },
  ],
  priceRange: [
    { label: 'Under $50', value: 'under-50' },
    { label: '$50 - $100', value: '50-100' },
    { label: '$100 - $500', value: '100-500' },
    { label: 'Over $500', value: 'over-500' },
  ],
  ratingRange: [
    { label: '4.5+ stars', value: '4.5-up' },
    { label: '4.0 - 4.49 stars', value: '4-4.49' },
    { label: '3.0 - 3.99 stars', value: '3-3.99' },
    { label: 'Under 3 stars', value: 'under-3' },
  ],
  stockStatus: [
    { label: 'In stock', value: 'in-stock', variant: 'success' },
    { label: 'Low stock', value: 'low-stock', variant: 'warning' },
    { label: 'Out of stock', value: 'out-of-stock', variant: 'destructive' },
  ],
  discountRange: [
    { label: 'No discount', value: 'none' },
    { label: 'Under 10%', value: 'under-10' },
    { label: '10% - 20%', value: '10-20' },
    { label: 'Over 20%', value: 'over-20' },
  ],
}

const productFilterIdSet = new Set<DummyJsonProductFilterId>([
  'category',
  'priceRange',
  'ratingRange',
  'stockStatus',
  'discountRange',
])

export const dummyJsonProductsSource = {
  baseUrl: 'https://dummyjson.com',
  resource: 'products',
  defaultLimit: 10,
  simulatedFilterLimit: 1000,
  supportedFeatures: {
    pagination: true,
    search: true,
    sorting: true,
    filters: true,
  },
  filterMode: 'simulated' as const,
  sortFieldMap: productSortFieldMap,
} as const

export function createDummyJsonProductsRequest(
  query: DataTableQuery,
): DummyJsonProductsRequest {
  const page = toPositiveInteger(query.page, 1)
  const limit = toPositiveInteger(query.pageSize, dummyJsonProductsSource.defaultLimit)
  const skip = (page - 1) * limit
  const hasFilters = hasProductFilters(query.filters)
  const keyword = query.search?.value.trim()
  const endpoint = keyword
    ? `${dummyJsonProductsSource.resource}/search`
    : dummyJsonProductsSource.resource
  const primarySort = query.sort?.[0]
  const sortBy = primarySort ? dummyJsonProductsSource.sortFieldMap[primarySort.id] : undefined
  const params: DummyJsonProductsRequest['params'] = {
    limit: hasFilters ? dummyJsonProductsSource.simulatedFilterLimit : limit,
    skip: hasFilters ? 0 : skip,
  }

  if (keyword) params.q = keyword
  if (sortBy) {
    params.sortBy = sortBy
    params.order = primarySort?.desc ? 'desc' : 'asc'
  }

  const url = new URL(`${dummyJsonProductsSource.baseUrl}/${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  return {
    mode: hasFilters ? 'simulated-filter' : 'server',
    endpoint,
    url: url.toString(),
    params,
  }
}

export async function fetchDummyJsonProducts(
  query: DataTableQuery,
  signal?: AbortSignal,
): Promise<DummyJsonProductsPage> {
  const request = createDummyJsonProductsRequest(query)
  const response = await fetch(request.url, { signal })

  if (!response.ok) {
    const statusText = response.statusText ? ` ${response.statusText}` : ''
    throw new Error(`DummyJSON products request failed (${response.status}${statusText})`)
  }

  return mapDummyJsonProductsResponse(await response.json(), query, request)
}

export function mapDummyJsonProductsResponse(
  payload: unknown,
  query: DataTableQuery,
  request = createDummyJsonProductsRequest(query),
): DummyJsonProductsPage {
  if (!isRecord(payload) || !Array.isArray(payload.products)) {
    throw new Error('DummyJSON products response is not in the expected shape.')
  }

  if (request.mode === 'simulated-filter') {
    const page = toPositiveInteger(query.page, 1)
    const limit = toPositiveInteger(query.pageSize, dummyJsonProductsSource.defaultLimit)
    const skip = (page - 1) * limit
    const filteredProducts = applyProductFilters(payload.products.map(mapProduct), query.filters)
    const sortedProducts = sortProducts(filteredProducts, query.sort)
    const total = sortedProducts.length
    const pageCount = total === 0 ? 0 : Math.ceil(total / limit)

    return {
      items: sortedProducts.slice(skip, skip + limit),
      total,
      pageCount,
      skip,
      limit,
      request,
    }
  }

  const limit = toPositiveInteger(payload.limit, query.pageSize)
  const total = toNonNegativeInteger(payload.total, payload.products.length)
  const skip = toNonNegativeInteger(payload.skip, request.params.skip)
  const pageCount = total === 0 ? 0 : Math.ceil(total / limit)

  return {
    items: payload.products.map(mapProduct),
    total,
    pageCount,
    skip,
    limit,
    request,
  }
}

function hasProductFilters(filters: DataTableQuery['filters']): boolean {
  return Boolean(filters?.some((filter) => productFilterIdSet.has(filter.id as DummyJsonProductFilterId)))
}

function applyProductFilters(
  products: DummyJsonProductRow[],
  filters: DataTableQuery['filters'],
): DummyJsonProductRow[] {
  const activeFilters = filters?.filter((filter) =>
    productFilterIdSet.has(filter.id as DummyJsonProductFilterId),
  )

  if (!activeFilters?.length) return products

  return products.filter((product) =>
    activeFilters.every((filter) => matchesProductFilter(product, filter)),
  )
}

function matchesProductFilter(product: DummyJsonProductRow, filter: DataTableFilterQuery): boolean {
  const values = toFilterValues(filter.value)
  if (values.length === 0) return true

  switch (filter.id) {
    case 'category':
      return values.includes(product.category)
    case 'priceRange':
      return values.some((value) => matchesPriceRange(product.price, value))
    case 'ratingRange':
      return values.some((value) => matchesRatingRange(product.rating, value))
    case 'stockStatus':
      return values.includes(getStockStatusValue(product.stock))
    case 'discountRange':
      return values.some((value) => matchesDiscountRange(product.discountPercentage, value))
    default:
      return true
  }
}

function sortProducts(
  products: DummyJsonProductRow[],
  sort: DataTableQuery['sort'],
): DummyJsonProductRow[] {
  const primarySort = sort?.[0]
  if (!primarySort) return products

  const sortKey = productSortFieldMap[primarySort.id]
  if (!sortKey) return products

  const sortedProducts = [...products]
  sortedProducts.sort((first, second) => {
    const firstValue = first[sortKey as keyof DummyJsonProductRow]
    const secondValue = second[sortKey as keyof DummyJsonProductRow]
    const result =
      typeof firstValue === 'number' && typeof secondValue === 'number'
        ? firstValue - secondValue
        : String(firstValue ?? '').localeCompare(String(secondValue ?? ''))

    return primarySort.desc ? -result : result
  })

  return sortedProducts
}

function toFilterValues(value: DataTableFilterQuery['value']): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  return []
}

function matchesPriceRange(price: number, range: string): boolean {
  if (range === 'under-50') return price < 50
  if (range === '50-100') return price >= 50 && price <= 100
  if (range === '100-500') return price > 100 && price <= 500
  if (range === 'over-500') return price > 500
  return true
}

function matchesRatingRange(rating: number, range: string): boolean {
  if (range === '4.5-up') return rating >= 4.5
  if (range === '4-4.49') return rating >= 4 && rating < 4.5
  if (range === '3-3.99') return rating >= 3 && rating < 4
  if (range === 'under-3') return rating < 3
  return true
}

function matchesDiscountRange(discount: number, range: string): boolean {
  if (range === 'none') return discount <= 0
  if (range === 'under-10') return discount > 0 && discount < 10
  if (range === '10-20') return discount >= 10 && discount <= 20
  if (range === 'over-20') return discount > 20
  return true
}

function mapProduct(value: unknown): DummyJsonProductRow {
  if (!isRecord(value)) {
    throw new Error('DummyJSON product item is not an object.')
  }

  const id = readRequiredNumber(value, 'id')
  const stock = readNumber(value, 'stock', 0)

  return {
    id,
    title: readString(value, 'title', `Product ${id}`),
    brand: readString(value, 'brand', 'Unknown brand'),
    category: readString(value, 'category', 'uncategorized'),
    price: readNumber(value, 'price', 0),
    discountPercentage: readNumber(value, 'discountPercentage', 0),
    rating: readNumber(value, 'rating', 0),
    stock,
    availabilityStatus: readString(value, 'availabilityStatus', getStockLabel(stock)),
    thumbnail: readOptionalString(value, 'thumbnail'),
  }
}

function getStockLabel(stock: number): string {
  if (stock <= 0) return 'Out of stock'
  if (stock <= 10) return 'Low stock'
  return 'In stock'
}

function getStockStatusValue(stock: number): string {
  if (stock <= 0) return 'out-of-stock'
  if (stock <= 10) return 'low-stock'
  return 'in-stock'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function readRequiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`DummyJSON product is missing numeric "${key}".`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string, fallback: number): number {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readString(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}
