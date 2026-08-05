import type { CartItemResponseDto } from "@/api/generated/models";

type CartVariantSource = Pick<CartItemResponseDto, "options" | "variantLabel">;
type CartQuantitySource = Pick<CartItemResponseDto, "quantity">;

export interface CartVariantSummaryItem {
  key: string;
  label: string;
  value: string;
}

export interface CartVariantSummary {
  visible: boolean;
  text: string;
  items: CartVariantSummaryItem[];
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
}

function optionItems(
  options: CartVariantSource["options"],
): CartVariantSummaryItem[] {
  const seen = new Set<string>();
  const items: CartVariantSummaryItem[] = [];

  for (const option of options) {
    const label = option.name.trim();
    const value = option.value.trim();
    if (!label || !value) continue;

    const key = `${normalize(label)}:${normalize(value)}`;
    if (seen.has(key)) continue;

    seen.add(key);
    items.push({ key, label, value });
  }

  return items;
}

function isCompleteLabeledSummary(
  variantLabel: string,
  items: CartVariantSummaryItem[],
): boolean {
  const normalizedLabel = normalize(variantLabel);
  const labelCount = variantLabel.match(/:/g)?.length ?? 0;

  return (
    labelCount >= items.length &&
    items.every((item) => normalizedLabel.includes(normalize(item.value)))
  );
}

export function cartVariantSummary(
  item: CartVariantSource,
): CartVariantSummary {
  const items = optionItems(item.options);

  // A cart line without selected options is a SIMPLE product. Its backend
  // variant label (for example "Mặc định") is an implementation detail.
  if (!items.length) return { visible: false, text: "", items };

  const variantLabel = item.variantLabel.trim();
  const text = isCompleteLabeledSummary(variantLabel, items)
    ? variantLabel
    : items.map(({ label, value }) => `${label}: ${value}`).join(" · ");

  return { visible: Boolean(text), text, items };
}

export function cartTotalQuantity(items: readonly CartQuantitySource[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
