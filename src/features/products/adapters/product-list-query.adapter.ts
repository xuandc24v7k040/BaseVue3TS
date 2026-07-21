import type { ProductsListParams, ProductsListSortBy } from '@/api/generated/models'
import type { DataTableFilterValue, DataTableQuery, DateRangeValue } from '@/components/admin/table/interface'

const sortable: ProductsListSortBy[] = ['name', 'status', 'releaseDate', 'createdAt', 'updatedAt']
const first = (value: DataTableFilterValue | undefined) => {
  const item = Array.isArray(value) ? value[0] : value
  return typeof item === 'string' ? item : undefined
}
const date = (value: DataTableFilterValue | undefined) => value && typeof value === 'object' && !Array.isArray(value) ? value as DateRangeValue : undefined

export function toProductListParams(query: DataTableQuery): ProductsListParams {
  const get = (id: string) => query.filters?.find((filter) => filter.id === id)?.value
  const sort = query.sort?.[0]
  const created = date(get('createdAt'))
  const release = date(get('releaseDate'))
  const search = query.search?.value.trim()
  const status = first(get('status'))
  return {
    page: query.page,
    limit: query.pageSize,
    ...(search ? { search } : {}),
    ...(status === 'DRAFT' || status === 'ACTIVE' || status === 'INACTIVE' || status === 'DISCONTINUED' ? { status } : {}),
    ...(first(get('categories')) ? { categoryId: first(get('categories')) } : {}),
    ...(first(get('supplier')) ? { supplierId: first(get('supplier')) } : {}),
    ...(first(get('publisher')) ? { publisherId: first(get('publisher')) } : {}),
    ...(first(get('authors')) ? { authorId: first(get('authors')) } : {}),
    ...(created?.start ? { createdFrom: created.start } : {}),
    ...(created?.end ? { createdTo: created.end } : {}),
    ...(release?.start ? { releaseFrom: release.start } : {}),
    ...(release?.end ? { releaseTo: release.end } : {}),
    sortBy: sortable.includes(sort?.id as ProductsListSortBy) ? sort?.id as ProductsListSortBy : 'createdAt',
    sortOrder: sortable.includes(sort?.id as ProductsListSortBy) ? sort?.desc ? 'desc' : 'asc' : 'desc',
  }
}
