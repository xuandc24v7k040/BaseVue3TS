import type {
  SuppliersListParams,
  SuppliersListSortBy,
} from '@/api/generated/models'
import type {
  DataTableFilterValue,
  DataTableQuery,
  DateRangeValue,
} from '@/components/admin/table/interface'
const sorts: SuppliersListSortBy[] = [
  'name',
  'phone',
  'email',
  'address',
  'usageCount',
  'createdAt',
  'updatedAt',
]
const first = (v: DataTableFilterValue | undefined) => {
  const x = Array.isArray(v) ? v[0] : v
  return typeof x === 'string' ? x : undefined
}
const date = (v: DataTableFilterValue | undefined) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as DateRangeValue)
    : undefined
export function toSupplierListParams(q: DataTableQuery): SuppliersListParams {
  const get = (id: string) => q.filters?.find((f) => f.id === id)?.value,
    s = q.sort?.[0],
    ok = sorts.includes(s?.id as SuppliersListSortBy),
    created = date(get('createdAt')),
    usage = first(get('usageCount')),
    phone = first(get('phone')),
    email = first(get('email')),
    search = q.search?.value.trim()
  return {
    page: q.page,
    limit: q.pageSize,
    ...(search ? { search } : {}),
    ...(usage === 'USED' || usage === 'UNUSED' ? { usageStatus: usage } : {}),
    ...(phone === 'true'
      ? { hasPhone: true }
      : phone === 'false'
        ? { hasPhone: false }
        : {}),
    ...(email === 'true'
      ? { hasEmail: true }
      : email === 'false'
        ? { hasEmail: false }
        : {}),
    ...(created?.start ? { createdFrom: created.start } : {}),
    ...(created?.end ? { createdTo: created.end } : {}),
    sortBy: ok ? (s?.id as SuppliersListSortBy) : 'createdAt',
    sortOrder: ok ? (s?.desc ? 'desc' : 'asc') : 'desc',
  }
}
