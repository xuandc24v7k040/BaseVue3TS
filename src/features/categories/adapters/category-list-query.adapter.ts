import type { CategoriesTreeParams } from "@/api/generated/models";
import type { DataTableQuery } from "@/components/admin/table/interface";

function firstFilter(query: DataTableQuery, id: string): string | undefined {
  const value = query.filters?.find((filter) => filter.id === id)?.value;
  return Array.isArray(value)
    ? String(value[0] ?? "") || undefined
    : value === undefined
      ? undefined
      : String(value);
}

export function toCategoryTreeParams(
  query: DataTableQuery,
): CategoriesTreeParams {
  const active = firstFilter(query, "isActive");
  const level = firstFilter(query, "level");
  const sort = query.sort?.[0];
  return {
    ...(query.search?.value ? { search: query.search.value } : {}),
    ...(firstFilter(query, "type")
      ? { type: firstFilter(query, "type") as CategoriesTreeParams["type"] }
      : {}),
    ...(level ? { level: Number(level) as CategoriesTreeParams["level"] } : {}),
    ...(active === undefined ? {} : { isActive: active === "true" }),
    sortBy: (sort?.id as CategoriesTreeParams["sortBy"]) ?? "sortOrder",
    sortOrder: sort?.desc ? "desc" : "asc",
  };
}
