import type {
  AuthorsListParams,
  AuthorsListSortBy,
} from '@/api/generated/models'
import type {
  DataTableQuery,
  DateRangeValue,
} from '@/components/admin/table/interface'
const sorts: AuthorsListSortBy[] = [
  'name',
  'usageCount',
  'createdAt',
  'updatedAt',
]
export function toAuthorListParams(q: DataTableQuery): AuthorsListParams {
  const val = (id: string) => q.filters?.find((f) => f.id === id)?.value,
    raw = val('usageCount'),
    usage = Array.isArray(raw) ? raw[0] : raw,
    dr = val('createdAt'),
    date =
      dr && typeof dr === 'object' && !Array.isArray(dr)
        ? (dr as DateRangeValue)
        : undefined,
    s = q.sort?.[0],
    ok = sorts.includes(s?.id as AuthorsListSortBy),
    search = q.search?.value.trim()
  return {
    page: q.page,
    limit: q.pageSize,
    ...(search ? { search } : {}),
    ...(usage === 'USED' || usage === 'UNUSED' ? { usageStatus: usage } : {}),
    ...(date?.start ? { createdFrom: date.start } : {}),
    ...(date?.end ? { createdTo: date.end } : {}),
    sortBy: ok ? (s?.id as AuthorsListSortBy) : 'createdAt',
    sortOrder: ok ? (s?.desc ? 'desc' : 'asc') : 'desc',
  }
}
