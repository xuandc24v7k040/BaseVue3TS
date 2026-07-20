export function toCategorySlugPreview(
  value: string,
  parentName?: string | null,
): string {
  return (parentName ? `${parentName}-${value}` : value)
    .trim()
    .toLocaleLowerCase("vi")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
