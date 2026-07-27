import type { AdminOrdersListParams } from "@/api/generated/models";
import { branchScopedQueryKeys } from "@/api/branch-query-cache";

export const adminOrderKeys = {
  scoped: (branchId: string) =>
    [...branchScopedQueryKeys.scope(branchId), "admin-orders"] as const,
  lists: (branchId: string) =>
    [...adminOrderKeys.scoped(branchId), "list"] as const,
  list: (branchId: string, params: AdminOrdersListParams) =>
    [...adminOrderKeys.lists(branchId), params] as const,
  details: (branchId: string) =>
    [...adminOrderKeys.scoped(branchId), "detail"] as const,
  detail: (branchId: string, orderId: string) =>
    [...adminOrderKeys.details(branchId), orderId] as const,
};
