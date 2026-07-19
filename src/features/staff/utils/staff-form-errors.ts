export function normalizeFieldErrors<Field extends string>(
  errors: Record<string, string[]> | undefined,
  allowedFields: readonly Field[],
): Partial<Record<Field, string>> {
  if (!errors) return {};

  const allowed = new Set<string>(allowedFields);
  const normalized: Partial<Record<Field, string>> = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (!allowed.has(field)) continue;
    const message = messages
      .map((item) => item.trim().replace(/\s+/g, " "))
      .find(Boolean);
    if (message && !normalized[field as Field]) {
      normalized[field as Field] = message;
    }
  }
  return normalized;
}
