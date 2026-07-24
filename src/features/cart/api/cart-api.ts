import { useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRef, unref } from "vue";
import {
  cartAddItem,
  cartChangeBranch,
  cartGet,
  cartRemoveItem,
  cartUpdateItem,
} from "@/api/generated/endpoints/cart/cart";
import type {
  AddCartItemDto,
  CartResponseDto,
  UpdateCartItemQuantityDto,
} from "@/api/generated/models";
import { BRANCH_HEADER_NAME } from "@/api/http/branch-scope";
import {
  publishCartInvalidated,
  type CartSyncReason,
} from "@/features/cart/state/cart-sync-channel";
import { queryClient } from "@/lib/query-client";

export const cartQueryKey = ["customer-cart"] as const;
let cartRequestSequence = 0;

async function fetchLatestCart(signal?: AbortSignal): Promise<CartResponseDto> {
  const sequence = ++cartRequestSequence;
  const response = await cartGet({ branchScoped: true }, signal);
  if (sequence !== cartRequestSequence) {
    return (
      queryClient.getQueryData<CartResponseDto>(cartQueryKey) ?? response.data
    );
  }
  queryClient.setQueryData(cartQueryKey, response.data);
  return response.data;
}

export function useCartQuery(enabled: MaybeRef<boolean>) {
  return useQuery(
    {
      queryKey: cartQueryKey,
      queryFn: ({ signal }) => fetchLatestCart(signal),
      enabled: computed(() => unref(enabled)),
      retry: 1,
    },
    queryClient,
  );
}

export function useCartActions() {
  async function sync(
    response: CartResponseDto,
    reason: CartSyncReason,
  ): Promise<CartResponseDto> {
    ++cartRequestSequence;
    await queryClient.cancelQueries({ queryKey: cartQueryKey });
    queryClient.setQueryData(cartQueryKey, response);
    publishCartInvalidated(reason);
    return response;
  }

  return {
    add(payload: AddCartItemDto, reason: CartSyncReason = "ADD_ITEM") {
      return cartAddItem(payload, { branchScoped: true }).then((response) =>
        sync(response.data, reason),
      );
    },
    update(itemId: string, payload: UpdateCartItemQuantityDto) {
      return cartUpdateItem(itemId, payload).then((response) =>
        sync(response.data, "UPDATE_QUANTITY"),
      );
    },
    remove(itemId: string) {
      return cartRemoveItem(itemId).then((response) =>
        sync(response.data, "REMOVE_ITEM"),
      );
    },
    changeBranch(branchId: string) {
      return cartChangeBranch(
        { branchId },
        { headers: { [BRANCH_HEADER_NAME]: branchId } },
      ).then((response) => sync(response.data, "BRANCH_RECONCILIATION"));
    },
    async refresh() {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      return fetchLatestCart();
    },
  };
}
