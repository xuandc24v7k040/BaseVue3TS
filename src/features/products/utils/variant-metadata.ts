import type { ProductVariantResponseDto } from "@/api/generated/models";

export type VariantMetadataKey =
  "isbn" | "barcode" | "publicationYear" | "pageCount" | "packageSize";

export type VariantMetadataDraft = Record<
  VariantMetadataKey | "weightGram",
  string
>;

export const REQUIRED_WEIGHT_MESSAGE = "Trọng lượng là bắt buộc.";
export const INVALID_WEIGHT_MESSAGE =
  "Trọng lượng phải là số nguyên dương tính bằng gram.";

export const VARIANT_METADATA_REGISTRY: ReadonlyArray<{
  key: VariantMetadataKey;
  label: string;
  placeholder: string;
  inputType: "text" | "number";
  min?: number;
  max?: number;
}> = [
  { key: "isbn", label: "ISBN", placeholder: "Nhập ISBN", inputType: "text" },
  {
    key: "barcode",
    label: "Barcode",
    placeholder: "Nhập barcode",
    inputType: "text",
  },
  {
    key: "publicationYear",
    label: "Năm xuất bản",
    placeholder: "Ví dụ 2026",
    inputType: "number",
    min: 0,
    max: 9999,
  },
  {
    key: "pageCount",
    label: "Số trang",
    placeholder: "Ví dụ 196",
    inputType: "number",
    min: 0,
  },
  {
    key: "packageSize",
    label: "Kích thước đóng gói",
    placeholder: "Ví dụ 20 × 14 × 2 cm",
    inputType: "text",
  },
];

export function validateVariantWeight(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return REQUIRED_WEIGHT_MESSAGE;
  const weight = Number(normalized);
  if (!Number.isSafeInteger(weight) || weight <= 0 || weight > 100_000) {
    return INVALID_WEIGHT_MESSAGE;
  }
  return null;
}

export function selectedVariantMetadata(
  variant: ProductVariantResponseDto,
): VariantMetadataKey[] {
  return VARIANT_METADATA_REGISTRY.filter(
    ({ key }) => variant[key] !== null && variant[key] !== undefined,
  ).map(({ key }) => key);
}

export function validateVariantMetadata(
  draft: VariantMetadataDraft,
  selected: VariantMetadataKey[],
): string | null {
  for (const item of VARIANT_METADATA_REGISTRY) {
    if (!selected.includes(item.key)) continue;
    const value = draft[item.key].trim();
    if (item.inputType === "text") {
      if (value.length > 100)
        return `${item.label} không được vượt quá 100 ký tự.`;
      continue;
    }
    const number = Number(value);
    if (!Number.isInteger(number)) return `${item.label} phải là số nguyên.`;
    if (item.min !== undefined && number < item.min)
      return `${item.label} không được nhỏ hơn ${item.min}.`;
    if (item.max !== undefined && number > item.max)
      return `${item.label} không được lớn hơn ${item.max}.`;
  }
  return null;
}

export function variantMetadataPayload(
  draft: VariantMetadataDraft,
  selected: VariantMetadataKey[],
) {
  const text = (key: "isbn" | "barcode" | "packageSize") =>
    selected.includes(key) ? draft[key].trim() || null : null;
  const integer = (key: "publicationYear" | "pageCount") =>
    selected.includes(key) && draft[key] !== "" ? Number(draft[key]) : null;
  return {
    isbn: text("isbn"),
    barcode: text("barcode"),
    publicationYear: integer("publicationYear"),
    pageCount: integer("pageCount"),
    weightGram: Number(draft.weightGram),
    packageSize: text("packageSize"),
  };
}
