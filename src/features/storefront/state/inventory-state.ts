import type { QueryKey } from "@tanstack/vue-query";
import { cartQueryKey } from "@/features/cart/api/cart-api";
import { inventoryKeys } from "@/features/inventory/api/inventory-query-keys";
import { storefrontQueryKeys } from "@/features/storefront/api/storefront-api";
import { queryClient } from "@/lib/query-client";

export interface InventoryInvalidationContext {
  branchId?: string;
  productIds?: readonly string[];
  variantIds?: readonly string[];
}

function matchesAvailabilityContext(
  queryKey: QueryKey,
  context: InventoryInvalidationContext,
): boolean {
  if (queryKey[0] !== "storefront-availability") return false;
  const [, branchId, productId, variantId] = queryKey;
  if (context.branchId && branchId !== context.branchId) return false;
  const filtersByProduct = Boolean(context.productIds?.length);
  const filtersByVariant = Boolean(context.variantIds?.length);
  if (!filtersByProduct && !filtersByVariant) return true;
  return Boolean(
    context.productIds?.includes(String(productId)) ||
      context.variantIds?.includes(String(variantId)),
  );
}

export async function invalidateInventoryState(
  context: InventoryInvalidationContext = {},
): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({
      predicate: (query) =>
        matchesAvailabilityContext(query.queryKey, context),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: storefrontQueryKeys.all,
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: cartQueryKey,
      refetchType: "active",
    }),
  ];
  if (context.branchId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.scoped(context.branchId),
        refetchType: "active",
      }),
    );
  }
  await Promise.all(invalidations);
}
