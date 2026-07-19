import type { BranchAdminsListParams } from "@/api/generated/models";

export const branchAdminKeys = {
  all: ["branch-admin-management"] as const,
  lists: () => [...branchAdminKeys.all, "list"] as const,
  list: (params: BranchAdminsListParams) =>
    [...branchAdminKeys.lists(), params] as const,
  details: () => [...branchAdminKeys.all, "detail"] as const,
  detail: (id: string) => [...branchAdminKeys.details(), id] as const,
  assignedToBranch: (branchId: string, params: BranchAdminsListParams) =>
    [...branchAdminKeys.all, "assigned-to-branch", branchId, params] as const,
  candidatesForBranch: (branchId: string, params: BranchAdminsListParams) =>
    [
      ...branchAdminKeys.all,
      "candidates-for-branch",
      branchId,
      params,
    ] as const,
};
