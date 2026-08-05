import { describe, expect, it } from "vitest";
import { cartTotalQuantity, cartVariantSummary } from "./cart-display";

describe("cartVariantSummary", () => {
  it("hides the implementation label for a SIMPLE product", () => {
    expect(
      cartVariantSummary({ variantLabel: "Mặc định", options: [] }),
    ).toEqual({ visible: false, text: "", items: [] });
  });

  it("renders a one-option variant exactly once", () => {
    const summary = cartVariantSummary({
      variantLabel: "Phân loại: Góc nhỏ ấm áp",
      options: [{ name: "Phân loại", value: "Góc nhỏ ấm áp" }],
    });

    expect(summary.text).toBe("Phân loại: Góc nhỏ ấm áp");
    expect(summary.items).toHaveLength(1);
  });

  it("adds the option label when the variant label contains only a value", () => {
    expect(
      cartVariantSummary({
        variantLabel: "Tái bản 2025",
        options: [{ name: "Phiên bản", value: "Tái bản 2025" }],
      }).text,
    ).toBe("Phiên bản: Tái bản 2025");
  });

  it("keeps the canonical backend summary for FO024", () => {
    const summary = cartVariantSummary({
      variantLabel: "Màu mực: Xanh · Quy cách: Hộp 10",
      options: [
        { name: "Số lượng", value: "Hộp 10" },
        { name: "Màu mực", value: "Xanh" },
      ],
    });

    expect(summary.text).toBe("Màu mực: Xanh · Quy cách: Hộp 10");
  });

  it("preserves option order and removes exact duplicate options", () => {
    const summary = cartVariantSummary({
      variantLabel: "",
      options: [
        { name: "Màu", value: "Xanh" },
        { name: "Quy cách", value: "Hộp 10" },
        { name: " Màu ", value: " Xanh " },
      ],
    });

    expect(summary.text).toBe("Màu: Xanh · Quy cách: Hộp 10");
    expect(summary.items.map((item) => item.key)).toEqual([
      "màu:xanh",
      "quy cách:hộp 10",
    ]);
  });
});

describe("cartTotalQuantity", () => {
  it("counts quantities rather than cart lines", () => {
    expect(
      cartTotalQuantity([
        { quantity: 2 },
        { quantity: 1 },
        { quantity: 1 },
        { quantity: 1 },
        { quantity: 1 },
        { quantity: 1 },
        { quantity: 1 },
      ]),
    ).toBe(8);
  });
});
