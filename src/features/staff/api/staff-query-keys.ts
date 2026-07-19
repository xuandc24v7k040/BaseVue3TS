import type {
  StaffAssignablePermissionsParams,
  RolesListParams,
  StaffCandidatesParams,
  StaffAssignableRolesParams,
  StaffListParams,
} from "@/api/generated/models";
import { branchScopedQueryKeys } from "@/api/branch-query-cache";

export const staffKeys = {
  scoped: (branchId: string) =>
    [...branchScopedQueryKeys.scope(branchId), "staff"] as const,
  lists: (branchId: string) => [...staffKeys.scoped(branchId), "list"] as const,
  list: (branchId: string, params: StaffListParams) =>
    [...staffKeys.lists(branchId), params] as const,
  details: (branchId: string) =>
    [...staffKeys.scoped(branchId), "detail"] as const,
  detail: (branchId: string, staffId: string) =>
    [...staffKeys.details(branchId), staffId] as const,
  candidates: (branchId: string, params: StaffCandidatesParams) =>
    [...staffKeys.scoped(branchId), "candidates", params] as const,
  roleCatalog: (branchId: string, params: RolesListParams) =>
    [...staffKeys.scoped(branchId), "role-catalog", params] as const,
  assignableRoles: (
    branchId: string,
    mode: "create" | "assign",
    params: StaffAssignableRolesParams,
  ) =>
    [...staffKeys.scoped(branchId), "assignable-roles", mode, params] as const,
  roleGrants: (branchId: string, roleIds: string[]) =>
    [
      ...staffKeys.scoped(branchId),
      "role-grants",
      [...roleIds].sort(),
    ] as const,
  permissionCatalog: (
    branchId: string,
    params: StaffAssignablePermissionsParams,
  ) => [...staffKeys.scoped(branchId), "permission-catalog", params] as const,
  globalAssignments: (staffId: string) =>
    ["staff", staffId, "assignments"] as const,
  activeBranches: () => ["staff", "active-branches"] as const,
};
