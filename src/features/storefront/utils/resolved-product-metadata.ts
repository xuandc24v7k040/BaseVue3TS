import type {
  PublicAttributeDto,
  PublicVariantDto,
} from "@/api/generated/models";
import { formatProductDate } from "@/features/products/utils/product-date";

export interface ResolvedProductMetadataItem {
  key: string;
  label: string;
  value: string;
}

const ATTRIBUTE_CANONICAL_KEYS: Readonly<Record<string, string>> = {
  ISBN: "isbn",
  BARCODE: "barcode",
  PAGE_COUNT: "pageCount",
  PUBLICATION_YEAR: "publicationYear",
  PUBLISHED_YEAR: "publicationYear",
  WEIGHT_GRAM: "weightGram",
  PACKAGE_SIZE: "packageDimensions",
  PACKAGE_DIMENSIONS: "packageDimensions",
};

const POSITIVE_NUMERIC_KEYS = new Set([
  "pageCount",
  "publicationYear",
  "weightGram",
]);

function canonicalAttributeKey(code: string): string {
  const normalized = code.trim().toUpperCase();
  return ATTRIBUTE_CANONICAL_KEYS[normalized] ?? `attribute:${normalized}`;
}

function displayValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (POSITIVE_NUMERIC_KEYS.has(key)) {
    const number = Number(normalized);
    if (!Number.isFinite(number) || number <= 0) return null;
  }
  return normalized;
}

function productMetadataItem(
  attribute: PublicAttributeDto,
): ResolvedProductMetadataItem | null {
  const key = canonicalAttributeKey(attribute.code);
  const value = displayValue(key, attribute.value);
  if (!value) return null;
  return {
    key,
    label: attribute.name,
    value:
      attribute.code.trim().toUpperCase() === "PUBLICATION_DATE"
        ? formatProductDate(value)
        : value,
  };
}

function variantMetadataItems(
  variant: PublicVariantDto,
): ResolvedProductMetadataItem[] {
  const weight = displayValue("weightGram", variant.weightGram);
  return [
    { key: "isbn", label: "ISBN", value: displayValue("isbn", variant.isbn) },
    {
      key: "barcode",
      label: "Barcode",
      value: displayValue("barcode", variant.barcode),
    },
    {
      key: "publicationYear",
      label: "Năm xuất bản",
      value: displayValue("publicationYear", variant.publicationYear),
    },
    {
      key: "pageCount",
      label: "Số trang",
      value: displayValue("pageCount", variant.pageCount),
    },
    {
      key: "weightGram",
      label: "Trọng lượng",
      value: weight
        ? `${new Intl.NumberFormat("vi-VN").format(Number(weight))} g`
        : null,
    },
    {
      key: "packageDimensions",
      label: "Kích thước đóng gói",
      value: displayValue("packageDimensions", variant.packageSize),
    },
  ].filter((item): item is ResolvedProductMetadataItem => item.value !== null);
}

export function resolveProductMetadata(
  attributes: readonly PublicAttributeDto[],
  variant: PublicVariantDto,
): ResolvedProductMetadataItem[] {
  const resolved = new Map<string, ResolvedProductMetadataItem>();
  attributes.forEach((attribute) => {
    const item = productMetadataItem(attribute);
    if (item) resolved.set(item.key, item);
  });
  variantMetadataItems(variant).forEach((item) => resolved.set(item.key, item));
  return [...resolved.values()];
}
