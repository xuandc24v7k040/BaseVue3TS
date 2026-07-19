import type {
  StaffListParams,
  StaffListSortBy,
  StaffListSortOrder,
} from "@/api/generated/models";
import type {
  DataTableFilterValue,
  DataTableQuery,
} from "@/components/admin/table/interface";

function firstValue(
  value: DataTableFilterValue | undefined,
): string | undefined {
  if (Array.isArray(value))
    return value[0] === undefined ? undefined : String(value[0]);
  return value === undefined || value === null || value === ""
    ? undefined
    : String(value);
}

function booleanValue(
  value: DataTableFilterValue | undefined,
): boolean | undefined {
  const normalized = firstValue(value);
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

export function toStaffListParams(query: DataTableQuery): StaffListParams {
  const sorting = query.sort?.[0];
  const search = query.search?.value.trim();
  return {
    page: query.page,
    limit: query.pageSize,
    ...(search ? { search } : {}),
    sortBy: (sorting?.id as StaffListSortBy | undefined) ?? "assignedAt",
    sortOrder: (sorting
      ? sorting.desc
        ? "desc"
        : "asc"
      : "desc") as StaffListSortOrder,
    userIsActive: booleanValue(
      query.filters?.find(({ id }) => id === "userIsActive")?.value,
    ),
    assignmentIsActive: booleanValue(
      query.filters?.find(({ id }) => id === "assignmentIsActive")?.value,
    ),
    isPrimary: booleanValue(
      query.filters?.find(({ id }) => id === "isPrimary")?.value,
    ),
    roleId: firstValue(query.filters?.find(({ id }) => id === "roleId")?.value),
  };
}
