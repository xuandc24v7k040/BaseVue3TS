import type { BranchesListParams, BranchesListSortBy } from '@/api/generated/models'
import type { DataTableFilterValue, DataTableQuery, DateRangeValue } from '@/components/admin/table/interface'

const SUPPORTED_SORTS: BranchesListSortBy[] = ['code', 'name', 'isActive', 'createdAt', 'updatedAt']

function firstFilterValue(value: DataTableFilterValue | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' ? candidate : undefined
}

function dateRangeValue(value: DataTableFilterValue | undefined): DateRangeValue | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value
}

export function toBranchListParams(query: DataTableQuery): BranchesListParams {
  const search = query.search?.value.trim()
  const status = firstFilterValue(query.filters?.find((filter) => filter.id === 'isActive')?.value)
  const createdAt = dateRangeValue(query.filters?.find((filter) => filter.id === 'createdAt')?.value)
  const sort = query.sort?.[0]
  const isSupportedSort = SUPPORTED_SORTS.includes(sort?.id as BranchesListSortBy)
  const sortBy = isSupportedSort
    ? sort?.id as BranchesListSortBy
    : 'code'

  return {
    page: query.page,
    limit: query.pageSize,
    ...(search ? { search } : {}),
    ...(status === 'true' ? { isActive: true } : status === 'false' ? { isActive: false } : {}),
    ...(createdAt?.start ? { createdFrom: createdAt.start } : {}),
    ...(createdAt?.end ? { createdTo: createdAt.end } : {}),
    sortBy,
    sortOrder: isSupportedSort ? (sort?.desc ? 'desc' : 'asc') : 'desc',
  }
}
