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
import { queryClient } from "@/lib/query-client";

export const cartQueryKey = ["customer-cart"] as const;

export function useCartQuery(enabled: MaybeRef<boolean>) {
  return useQuery(
    {
      queryKey: cartQueryKey,
      queryFn: ({ signal }) =>
        cartGet({ branchScoped: true }, signal).then(
          (response) => response.data,
        ),
      enabled: computed(() => unref(enabled)),
      retry: 1,
    },
    queryClient,
  );
}

export function useCartActions() {
  function sync(response: CartResponseDto): CartResponseDto {
    queryClient.setQueryData(cartQueryKey, response);
    return response;
  }

  return {
    add(payload: AddCartItemDto) {
      return cartAddItem(payload, { branchScoped: true }).then((response) =>
        sync(response.data),
      );
    },
    update(itemId: string, payload: UpdateCartItemQuantityDto) {
      return cartUpdateItem(itemId, payload).then((response) =>
        sync(response.data),
      );
    },
    remove(itemId: string) {
      return cartRemoveItem(itemId).then((response) => sync(response.data));
    },
    changeBranch(branchId: string) {
      return cartChangeBranch(
        { branchId },
        { headers: { [BRANCH_HEADER_NAME]: branchId } },
      ).then((response) => sync(response.data));
    },
  };
}
