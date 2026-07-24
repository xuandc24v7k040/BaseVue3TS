import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartResponseDto } from "@/api/generated/models";
import { queryClient } from "@/lib/query-client";

const {
  cartAddItemMock,
  cartGetMock,
  publishCartInvalidatedMock,
} = vi.hoisted(() => ({
  cartAddItemMock: vi.fn(),
  cartGetMock: vi.fn(),
  publishCartInvalidatedMock: vi.fn(),
}));

vi.mock("@/api/generated/endpoints/cart/cart", () => ({
  cartGet: cartGetMock,
  cartAddItem: cartAddItemMock,
  cartChangeBranch: vi.fn(),
  cartRemoveItem: vi.fn(),
  cartUpdateItem: vi.fn(),
}));

vi.mock("@/features/cart/state/cart-sync-channel", () => ({
  publishCartInvalidated: publishCartInvalidatedMock,
}));

import {
  cartQueryKey,
  useCartActions,
} from "@/features/cart/api/cart-api";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function cart(totalQuantity: number): CartResponseDto {
  return { totalQuantity } as CartResponseDto;
}

describe("cart central synchronization", () => {
  beforeEach(() => {
    cartAddItemMock.mockReset();
    cartGetMock.mockReset();
    publishCartInvalidatedMock.mockReset();
    queryClient.clear();
  });

  it("does not let an older refresh overwrite the latest cart state", async () => {
    const first = deferred<{ data: CartResponseDto }>();
    const second = deferred<{ data: CartResponseDto }>();
    cartGetMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const actions = useCartActions();

    const olderRefresh = actions.refresh();
    await vi.waitFor(() => expect(cartGetMock).toHaveBeenCalledTimes(1));
    const latestRefresh = actions.refresh();
    await vi.waitFor(() => expect(cartGetMock).toHaveBeenCalledTimes(2));

    second.resolve({ data: cart(1) });
    await latestRefresh;
    first.resolve({ data: cart(9) });
    await olderRefresh;

    expect(
      queryClient.getQueryData<CartResponseDto>(cartQueryKey)?.totalQuantity,
    ).toBe(1);
  });

  it("publishes BUY_NOW only after the authoritative add response is applied", async () => {
    cartAddItemMock.mockResolvedValue({ data: cart(2) });

    await useCartActions().add(
      { productVariantId: "variant-1", quantity: 1 },
      "BUY_NOW",
    );

    expect(
      queryClient.getQueryData<CartResponseDto>(cartQueryKey)?.totalQuantity,
    ).toBe(2);
    expect(publishCartInvalidatedMock).toHaveBeenCalledOnce();
    expect(publishCartInvalidatedMock).toHaveBeenCalledWith("BUY_NOW");
  });

  it("does not publish a cart event when the mutation fails", async () => {
    cartAddItemMock.mockRejectedValue(new Error("network"));

    await expect(
      useCartActions().add({
        productVariantId: "variant-1",
        quantity: 1,
      }),
    ).rejects.toThrow("network");

    expect(publishCartInvalidatedMock).not.toHaveBeenCalled();
  });
});
