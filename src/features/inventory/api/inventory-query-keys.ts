import type {
  InventoryStocksListParams,
  StockReceiptsListParams,
} from "@/api/generated/models";
import { branchScopedQueryKeys } from "@/api/branch-query-cache";

export const inventoryKeys = {
  variantOptions: (params: object) =>
    ["inventory", "variant-options", params] as const,
  scoped: (branchId: string) =>
    [...branchScopedQueryKeys.scope(branchId), "inventory"] as const,
  stocks: (branchId: string, params: InventoryStocksListParams) =>
    [...inventoryKeys.scoped(branchId), "stocks", params] as const,
  receipts: (branchId: string, params: StockReceiptsListParams) =>
    [...inventoryKeys.scoped(branchId), "receipts", params] as const,
  receipt: (branchId: string, id: string) =>
    [...inventoryKeys.scoped(branchId), "receipts", id] as const,
};
