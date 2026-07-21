import type {
  PublishersListParams,
  PublishersListSortBy,
} from '@/api/generated/models'
import type {
  DataTableQuery,
  DateRangeValue,
} from '@/components/admin/table/interface'
const sorts: PublishersListSortBy[] = [
  'name',
  'usageCount',
  'createdAt',
  'updatedAt',
]
export function toPublisherListParams(q: DataTableQuery): PublishersListParams {
  const value = (id: string) => q.filters?.find((f) => f.id === id)?.value,
    raw = value('usageCount'),
    usage = Array.isArray(raw) ? raw[0] : raw,
    dr = value('createdAt'),
    date =
      dr && typeof dr === 'object' && !Array.isArray(dr)
        ? (dr as DateRangeValue)
        : undefined,
    s = q.sort?.[0],
    ok = sorts.includes(s?.id as PublishersListSortBy),
    search = q.search?.value.trim()
  return {
    page: q.page,
    limit: q.pageSize,
    ...(search ? { search } : {}),
    ...(usage === 'USED' || usage === 'UNUSED' ? { usageStatus: usage } : {}),
    ...(date?.start ? { createdFrom: date.start } : {}),
    ...(date?.end ? { createdTo: date.end } : {}),
    sortBy: ok ? (s?.id as PublishersListSortBy) : 'createdAt',
    sortOrder: ok ? (s?.desc ? 'desc' : 'asc') : 'desc',
  }
}
