import type { CategoriesTreeParams } from "@/api/generated/models";
import type { CategoryType } from "../types";

export const categoryKeys = {
  all: ["categories"] as const,
  trees: () => [...categoryKeys.all, "tree"] as const,
  tree: (params: CategoriesTreeParams) =>
    [...categoryKeys.trees(), params] as const,
  rootOptions: (type?: CategoryType) =>
    [...categoryKeys.all, "root-options", type ?? "all"] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};
