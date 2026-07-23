import { describe, expect, it } from "vitest";
import cartApiSource from "./api/cart-api.ts?raw";
import cartPageSource from "../../pages/app/cart/CartPage.vue?raw";
import detailSource from "../../pages/app/catalog/BookDetailPage.vue?raw";
import { cartErrorMessage } from "./utils/cart-error";

describe("Phase 13 cart contract", () => {
  it("maps backend machine codes to Vietnamese messages", () => {
    expect(
      cartErrorMessage({
        response: {
          status: 400,
          data: { code: "CART_QUANTITY_EXCEEDS_STOCK" },
        },
        isAxiosError: true,
        message: "Request failed",
        name: "AxiosError",
        config: {},
        toJSON: () => ({}),
      }),
    ).toBe("Số lượng vượt quá tồn kho hiện tại.");
  });

  it("uses shadcn Checkbox and computes selection only from eligible items", () => {
    expect(cartPageSource).toContain(
      'import { Checkbox } from "@/components/ui/checkbox"',
    );
    expect(cartPageSource).toContain("item.isCheckoutEligible");
    expect(cartPageSource).toContain('"indeterminate"');
    expect(cartPageSource).toContain("selectedItemIds");
  });

  it("keeps Cart server-backed and sends only variant id plus quantity", () => {
    expect(cartApiSource).toContain("cartAddItem");
    expect(cartApiSource).not.toContain("localStorage");
    expect(cartApiSource).toContain("[BRANCH_HEADER_NAME]: branchId");
    expect(detailSource).toContain("productVariantId:");
    expect(detailSource).toContain("quantity: quantity.value");
    expect(detailSource).not.toContain("price:");
  });
});
