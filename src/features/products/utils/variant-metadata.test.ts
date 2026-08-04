import { describe, expect, it } from "vitest";
import type { ProductVariantResponseDto } from "@/api/generated/models";
import {
  VARIANT_METADATA_REGISTRY,
  selectedVariantMetadata,
  validateVariantMetadata,
  validateVariantWeight,
  variantMetadataPayload,
  type VariantMetadataDraft,
} from "./variant-metadata";

const draft: VariantMetadataDraft = {
  isbn: " 978-604 ",
  barcode: "",
  publicationYear: "2026",
  pageCount: "0",
  weightGram: "250",
  packageSize: "",
};

describe("variant metadata helpers", () => {
  it("does not expose required weight in the optional metadata menu", () => {
    expect(
      VARIANT_METADATA_REGISTRY.map((item) => String(item.key)),
    ).not.toContain("weightGram");
  });

  it("hydrates only non-null fields and preserves numeric zero", () => {
    const variant = {
      isbn: null,
      barcode: "893",
      publicationYear: null,
      pageCount: 0,
      weightGram: 350,
      packageSize: null,
    } as ProductVariantResponseDto;
    expect(selectedVariantMetadata(variant)).toEqual(["barcode", "pageCount"]);
  });

  it("emits null for removed metadata and normalized values for selected fields", () => {
    expect(
      variantMetadataPayload(draft, ["isbn", "publicationYear", "pageCount"]),
    ).toEqual({
      isbn: "978-604",
      barcode: null,
      publicationYear: 2026,
      pageCount: 0,
      weightGram: 250,
      packageSize: null,
    });
  });

  it("validates integer ranges in Vietnamese", () => {
    expect(
      validateVariantMetadata({ ...draft, publicationYear: "10000" }, [
        "publicationYear",
      ]),
    ).toBe("Năm xuất bản không được lớn hơn 9999.");
  });

  it.each(["", "0", "-1", "1.5", "350.5", "abc"])(
    "rejects invalid required weight %p",
    (weight) => {
      expect(validateVariantWeight(weight)).not.toBeNull();
    },
  );

  it("accepts a positive integer weight", () => {
    expect(validateVariantWeight("350")).toBeNull();
  });
});
