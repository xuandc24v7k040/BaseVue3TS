import { describe, expect, it } from "vitest";
import {
  parseCheckoutCartItemIds,
  serializeCheckoutCartItemIds,
} from "./checkout-selection";

const FIRST_CART_ITEM_ID = "01KY7EVAPRC2KXK38JEW4FMB2P";
const SECOND_CART_ITEM_ID = "01KY7EVAPRC2KXK38JEW4FMB2Q";

describe("checkout selection navigation", () => {
  it("preserves exact CartItem IDs across route navigation", () => {
    const serialized = serializeCheckoutCartItemIds([
      FIRST_CART_ITEM_ID,
      SECOND_CART_ITEM_ID,
    ]);

    expect(parseCheckoutCartItemIds(serialized)).toEqual([
      FIRST_CART_ITEM_ID,
      SECOND_CART_ITEM_ID,
    ]);
  });

  it("does not turn a checked selection into an empty payload", () => {
    expect(
      parseCheckoutCartItemIds(serializeCheckoutCartItemIds([FIRST_CART_ITEM_ID])),
    ).toEqual([FIRST_CART_ITEM_ID]);
  });

  it("rejects missing and malformed route state before preview", () => {
    expect(parseCheckoutCartItemIds(undefined)).toEqual([]);
    expect(parseCheckoutCartItemIds("variant-id")).toEqual([]);
  });
});
