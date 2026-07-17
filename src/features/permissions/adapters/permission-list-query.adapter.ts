import type { PermissionsListParams, PermissionsListSortBy } from '@/api/generated/models'
import type { DataTableFilterValue, DataTableQuery, DateRangeValue } from '@/components/admin/table/interface'

const SUPPORTED_SORTS: PermissionsListSortBy[] = [
  'code', 'name', 'resource', 'action', 'guardName', 'description', 'createdAt', 'updatedAt',
]

function firstValue(value: DataTableFilterValue | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' ? candidate : undefined
}

function dateRange(value: DataTableFilterValue | undefined): DateRangeValue | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined
}

export function toPermissionListParams(query: DataTableQuery): PermissionsListParams {
  const search = query.search?.value.trim()
  const valueFor = (id: string) => firstValue(query.filters?.find((filter) => filter.id === id)?.value)
  const createdAt = dateRange(query.filters?.find((filter) => filter.id === 'createdAt')?.value)
  const sort = query.sort?.[0]
  const supported = SUPPORTED_SORTS.includes(sort?.id as PermissionsListSortBy)
  return {
    page: query.page,
    limit: query.pageSize,
    ...(search ? { search } : {}),
    ...(valueFor('resource') ? { resource: valueFor('resource') } : {}),
    ...(valueFor('action') ? { action: valueFor('action') } : {}),
    ...(createdAt?.start ? { createdFrom: createdAt.start } : {}),
    ...(createdAt?.end ? { createdTo: createdAt.end } : {}),
    sortBy: supported ? sort?.id as PermissionsListSortBy : 'createdAt',
    sortOrder: supported ? (sort?.desc ? 'desc' : 'asc') : 'desc',
  }
}
