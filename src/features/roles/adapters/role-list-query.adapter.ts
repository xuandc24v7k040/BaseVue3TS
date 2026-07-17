import type { RolesListParams, RolesListSortBy } from '@/api/generated/models'
import type { DataTableFilterValue, DataTableQuery, DateRangeValue } from '@/components/admin/table/interface'

const SUPPORTED_SORTS: RolesListSortBy[] = [
  'code', 'name', 'description', 'type', 'guardName', 'level',
  'isSystem', 'isActive', 'createdAt', 'updatedAt',
]

function firstValue(value: DataTableFilterValue | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' ? candidate : undefined
}

function dateRange(value: DataTableFilterValue | undefined): DateRangeValue | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined
}

export function toRoleListParams(query: DataTableQuery): RolesListParams {
  const search = query.search?.value.trim()
  const valueFor = (id: string) => firstValue(query.filters?.find((filter) => filter.id === id)?.value)
  const type = valueFor('type')
  const active = valueFor('isActive')
  const system = valueFor('isSystem')
  const createdAt = dateRange(query.filters?.find((filter) => filter.id === 'createdAt')?.value)
  const sort = query.sort?.[0]
  const supported = SUPPORTED_SORTS.includes(sort?.id as RolesListSortBy)

  return {
    page: query.page,
    limit: query.pageSize,
    ...(search ? { search } : {}),
    ...(type === 'SYSTEM' || type === 'BRANCH' || type === 'CUSTOMER' ? { type } : {}),
    ...(active === 'true' ? { isActive: true } : active === 'false' ? { isActive: false } : {}),
    ...(system === 'true' ? { isSystem: true } : system === 'false' ? { isSystem: false } : {}),
    ...(createdAt?.start ? { createdFrom: createdAt.start } : {}),
    ...(createdAt?.end ? { createdTo: createdAt.end } : {}),
    sortBy: supported ? sort?.id as RolesListSortBy : 'createdAt',
    sortOrder: supported ? (sort?.desc ? 'desc' : 'asc') : 'desc',
  }
}
