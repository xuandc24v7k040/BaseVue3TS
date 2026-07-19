import type {
  BranchAdminsListAssignmentState,
  BranchAdminsListParams,
  BranchAdminsListSortBy,
} from "@/api/generated/models";
import type {
  DataTableFilterValue,
  DataTableQuery,
} from "@/components/admin/table/interface";

const ASSIGNMENT_STATES: BranchAdminsListAssignmentState[] = [
  "UNASSIGNED",
  "ACTIVE",
  "INACTIVE_ONLY",
];

const SORT_FIELDS: BranchAdminsListSortBy[] = [
  "fullName",
  "email",
  "phone",
  "isActive",
  "primaryBranch",
  "assignments",
  "createdAt",
];

function firstString(
  value: DataTableFilterValue | undefined,
): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

export function toBranchAdminListParams(
  query: DataTableQuery,
): BranchAdminsListParams {
  const search = query.search?.value.trim();
  const accountStatus = firstString(
    query.filters?.find((item) => item.id === "isActive")?.value,
  );
  const rawAssignmentState = firstString(
    query.filters?.find((item) => item.id === "assignmentState")?.value,
  );
  const assignmentState = ASSIGNMENT_STATES.includes(
    rawAssignmentState as BranchAdminsListAssignmentState,
  )
    ? (rawAssignmentState as BranchAdminsListAssignmentState)
    : undefined;
  const assignedBranchId = firstString(
    query.filters?.find((item) => item.id === "assignedBranchId")?.value,
  );
  const primarySort = query.sort?.[0];
  const supportedSort = SORT_FIELDS.includes(
    primarySort?.id as BranchAdminsListSortBy,
  );
  const sortBy = supportedSort
    ? (primarySort?.id as BranchAdminsListSortBy)
    : "createdAt";

  return {
    page: query.page,
    limit: query.pageSize,
    ...(search ? { search } : {}),
    ...(accountStatus === "true"
      ? { isActive: true }
      : accountStatus === "false"
        ? { isActive: false }
        : {}),
    ...(assignmentState ? { assignmentState } : {}),
    ...(assignedBranchId ? { assignedBranchId } : {}),
    sortBy,
    sortOrder: supportedSort ? (primarySort?.desc ? "desc" : "asc") : "desc",
  };
}
