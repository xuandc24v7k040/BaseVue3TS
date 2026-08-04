import { describe, expect, it } from "vitest";
import type {
  PublicAttributeDto,
  PublicVariantDto,
} from "@/api/generated/models";
import { resolveProductMetadata } from "./resolved-product-metadata";

const variant = (
  overrides: Partial<PublicVariantDto> = {},
): PublicVariantDto => ({
  id: "variant-1",
  name: "Mặc định",
  isDefault: true,
  price: {
    original: 75_000,
    current: 70_000,
    onSale: true,
    discountPercent: 7,
  },
  isbn: null,
  barcode: null,
  publicationYear: null,
  pageCount: null,
  weightGram: 350,
  packageSize: null,
  optionValues: [],
  media: [],
  ...overrides,
});

const attribute = (
  code: string,
  name: string,
  value: string,
): PublicAttributeDto => ({
  code,
  name,
  value,
});

describe("resolveProductMetadata", () => {
  it("lets the selected variant override product metadata without duplicates", () => {
    const result = resolveProductMetadata(
      [
        attribute("PAGE_COUNT", "Số trang", "96"),
        attribute("LANGUAGE", "Ngôn ngữ", "Tiếng Việt"),
      ],
      variant({ pageCount: 500 }),
    );

    expect(result.filter((item) => item.key === "pageCount")).toEqual([
      { key: "pageCount", label: "Số trang", value: "500" },
    ]);
    expect(result).toContainEqual({
      key: "attribute:LANGUAGE",
      label: "Ngôn ngữ",
      value: "Tiếng Việt",
    });
  });

  it("keeps the product value only when the variant value is absent", () => {
    expect(
      resolveProductMetadata(
        [attribute("PAGE_COUNT", "Số trang", "96")],
        variant(),
      ),
    ).toContainEqual({ key: "pageCount", label: "Số trang", value: "96" });
  });

  it("renders all customer-visible variant fields and formats gram", () => {
    const result = resolveProductMetadata(
      [],
      variant({
        isbn: "0124",
        barcode: "0310",
        publicationYear: 2026,
        pageCount: 500,
        weightGram: 1_250,
        packageSize: "20 × 14 × 2 cm",
      }),
    );

    expect(
      Object.fromEntries(result.map((item) => [item.key, item.value])),
    ).toEqual({
      isbn: "0124",
      barcode: "0310",
      publicationYear: "2026",
      pageCount: "500",
      weightGram: "1.250 g",
      packageDimensions: "20 × 14 × 2 cm",
    });
  });

  it("omits empty and non-positive values", () => {
    expect(
      resolveProductMetadata(
        [
          attribute("PAGE_COUNT", "Số trang", "0"),
          attribute("BRAND", "Thương hiệu", "  "),
        ],
        variant({ weightGram: 0 }),
      ),
    ).toEqual([]);
  });
});
