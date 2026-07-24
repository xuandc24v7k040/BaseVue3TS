import type { Query } from "@tanstack/vue-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/query-client";
import { invalidateInventoryState } from "./inventory-state";

describe("inventory state invalidation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("targets ordered product or variant keys in the authoritative branch", async () => {
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();

    await invalidateInventoryState({
      branchId: "branch-1",
      productIds: ["product-1"],
      variantIds: ["variant-1"],
    });

    const filters = invalidate.mock.calls[0]?.[0];
    const predicate =
      typeof filters === "function" ? undefined : filters?.predicate;
    expect(predicate).toBeTypeOf("function");
    const query = (queryKey: readonly unknown[]) =>
      ({ queryKey }) as Query<unknown, Error, unknown, readonly unknown[]>;

    expect(
      predicate?.(
        query(["storefront-availability", "branch-1", "product-1", undefined]),
      ),
    ).toBe(true);
    expect(
      predicate?.(
        query([
          "storefront-availability",
          "branch-1",
          "another-product",
          "variant-1",
        ]),
      ),
    ).toBe(true);
    expect(
      predicate?.(
        query(["storefront-availability", "branch-2", "product-1", "variant-1"]),
      ),
    ).toBe(false);
  });
});
