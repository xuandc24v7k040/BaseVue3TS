import type { PublicProductDetailDto } from "@/api/generated/models";

export interface ProductCategoryBreadcrumbItem {
  id: string;
  label: string;
  to: {
    path: "/books";
    query: { category: string };
  };
}

type ProductBreadcrumbSource = Pick<
  PublicProductDetailDto,
  "categories" | "primaryCategory"
>;

function toBreadcrumbItem(category: {
  id: string;
  name: string;
  slug: string;
}): ProductCategoryBreadcrumbItem {
  return {
    id: category.id,
    label: category.name,
    to: {
      path: "/books",
      query: { category: category.slug },
    },
  };
}

export function buildPrimaryCategoryBreadcrumb(
  product: ProductBreadcrumbSource,
): ProductCategoryBreadcrumbItem[] {
  const primary = product.primaryCategory;
  if (!primary) return [];

  const items: ProductCategoryBreadcrumbItem[] = [];
  if (primary.parent && primary.parent.id !== primary.id) {
    items.push(toBreadcrumbItem(primary.parent));
  }
  items.push(toBreadcrumbItem(primary));
  return items;
}
