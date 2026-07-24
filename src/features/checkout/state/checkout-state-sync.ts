import { useCartActions } from "@/features/cart/api/cart-api";
import {
  publishCartInvalidated,
  type CartSyncReason,
} from "@/features/cart/state/cart-sync-channel";
import { publishInventoryChanged } from "@/features/storefront/state/inventory-sync-channel";
import { invalidateInventoryState } from "@/features/storefront/state/inventory-state";
import { queryClient } from "@/lib/query-client";

export async function synchronizeCheckoutState(
  inventoryChanged: boolean,
  cartReason?: CartSyncReason,
): Promise<void> {
  await useCartActions().refresh();
  if (cartReason) publishCartInvalidated(cartReason);
  if (!inventoryChanged) return;

  await Promise.all([
    invalidateInventoryState(),
    queryClient.invalidateQueries({ queryKey: ["customer-orders"] }),
    queryClient.invalidateQueries({ queryKey: ["customer-order"] }),
  ]);
  publishInventoryChanged();
}
