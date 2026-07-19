import type { UsersFindAllParams, UsersFindAllSortBy } from '@/api/generated/models'
import type { DataTableFilterValue, DataTableQuery } from '@/components/admin/table/interface'

const SUPPORTED_SORTS: UsersFindAllSortBy[] = [
  'fullName',
  'email',
  'phone',
  'type',
  'provider',
  'isActive',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
]

function firstValue(value: DataTableFilterValue | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' ? candidate : undefined
}

export function toUserListParams(query: DataTableQuery): UsersFindAllParams {
  const search = query.search?.value.trim()
  const valueFor = (id: string) => firstValue(query.filters?.find((filter) => filter.id === id)?.value)
  const type = valueFor('type')
  const provider = valueFor('provider')
  const active = valueFor('isActive')
  const sort = query.sort?.[0]
  const supportedSort = SUPPORTED_SORTS.includes(sort?.id as UsersFindAllSortBy)

  return {
    page: query.page,
    limit: query.pageSize,
    ...(search ? { search } : {}),
    ...(type === 'SYSTEM' || type === 'BRANCH' || type === 'CUSTOMER' ? { type } : {}),
    ...(provider === 'LOCAL' || provider === 'GOOGLE' ? { provider } : {}),
    ...(active === 'true' ? { isActive: true } : active === 'false' ? { isActive: false } : {}),
    sortBy: supportedSort ? sort?.id as UsersFindAllSortBy : 'createdAt',
    sortOrder: supportedSort ? (sort?.desc ? 'desc' : 'asc') : 'desc',
  }
}
