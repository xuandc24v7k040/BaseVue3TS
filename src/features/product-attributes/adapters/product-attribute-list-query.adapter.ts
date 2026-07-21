import type {
  ProductAttributesListParams,
  ProductAttributesListSortBy,
  ProductAttributesListType,
} from '@/api/generated/models'
import type {
  DataTableFilterValue,
  DataTableQuery,
  DateRangeValue,
} from '@/components/admin/table/interface'
const sorts: ProductAttributesListSortBy[] = [
    'name',
    'code',
    'type',
    'usageCount',
    'createdAt',
    'updatedAt',
  ],
  types: ProductAttributesListType[] = [
    'TEXT',
    'NUMBER',
    'BOOLEAN',
    'DATE',
    'SINGLE_SELECT',
    'MULTI_SELECT',
  ]
export function toProductAttributeListParams(
  q: DataTableQuery,
): ProductAttributesListParams {
  const val = (id: string) => q.filters?.find((f) => f.id === id)?.value,
    first = (v: DataTableFilterValue | undefined) => {
      const x = Array.isArray(v) ? v[0] : v
      return typeof x === 'string' ? x : undefined
    },
    usage = first(val('usageCount')),
    type = first(val('type')),
    raw = val('createdAt'),
    date =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as DateRangeValue)
        : undefined,
    s = q.sort?.[0],
    ok = sorts.includes(s?.id as ProductAttributesListSortBy),
    search = q.search?.value.trim()
  return {
    page: q.page,
    limit: q.pageSize,
    ...(search ? { search } : {}),
    ...(usage === 'USED' || usage === 'UNUSED' ? { usageStatus: usage } : {}),
    ...(types.includes(type as ProductAttributesListType)
      ? { type: type as ProductAttributesListType }
      : {}),
    ...(date?.start ? { createdFrom: date.start } : {}),
    ...(date?.end ? { createdTo: date.end } : {}),
    sortBy: ok ? (s?.id as ProductAttributesListSortBy) : 'createdAt',
    sortOrder: ok ? (s?.desc ? 'desc' : 'asc') : 'desc',
  }
}
