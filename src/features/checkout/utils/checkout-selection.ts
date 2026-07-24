const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

export function parseCheckoutCartItemIds(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter((id) => ULID_PATTERN.test(id)),
    ),
  ];
}

export function serializeCheckoutCartItemIds(ids: readonly string[]): string {
  return ids.join(",");
}
