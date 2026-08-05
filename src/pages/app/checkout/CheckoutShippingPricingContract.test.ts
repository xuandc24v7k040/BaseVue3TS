import { describe, expect, it } from "vitest";
import checkoutSource from "./CheckoutPage.vue?raw";

describe("checkout dynamic shipping pricing contract", () => {
  it("renders only authoritative quote fields returned by the backend", () => {
    expect(checkoutSource).toContain(
      "draft.shippingQuote.chargeableWeightGram",
    );
    expect(checkoutSource).toContain("draft.shippingQuote.routeType");
    expect(checkoutSource).not.toContain("Phí vận chuyển cố định");
  });

  it("keeps Vietnamese domain errors and de-duplicates quote toasts", () => {
    expect(checkoutSource).toContain("CHECKOUT_PRODUCT_WEIGHT_INVALID");
    expect(checkoutSource).toContain("CHECKOUT_SHIPPING_WEIGHT_LIMIT_EXCEEDED");
    expect(checkoutSource).toContain("CHECKOUT_SHIPPING_POLICY_UNAVAILABLE");
    expect(checkoutSource).toContain("SHIPPING_QUOTE_TOAST_ID");
  });
});
