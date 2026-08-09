import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type {
  StorefrontProductsListParams,
  StorefrontProductsListSort,
} from "@/api/generated/models";
import { STORAGE_KEYS } from "@/constants/storage-key.constant";

const validSorts = new Set<StorefrontProductsListSort>([
  "relevance",
  "popular",
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
  "release_asc",
]);
const validPageSizes = new Set([12, 24, 36]);

function first(value: unknown): string | undefined {
  if (Array.isArray(value))
    return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function list(value: unknown): string[] | undefined {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = values
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length ? normalized : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = Number(first(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function useProductFilters() {
  const route = useRoute();
  const router = useRouter();
  const view = ref<"grid" | "list">(
    localStorage.getItem(STORAGE_KEYS.storefrontView) === "list"
      ? "list"
      : "grid",
  );
  const params = computed<StorefrontProductsListParams>(() => {
    const sortValue = first(route.query.sort) as
      StorefrontProductsListSort | undefined;
    const pageSizeValue = Number(first(route.query.pageSize));
    const q = first(route.query.q)?.trim() || undefined;
    return {
      page: Math.max(1, Number(first(route.query.page)) || 1),
      pageSize: (validPageSizes.has(pageSizeValue) ? pageSizeValue : 12) as
        12 | 24 | 36,
      q,
      categorySlug: first(route.query.category)?.trim() || undefined,
      priceMin: positiveNumber(route.query.priceMin),
      priceMax: positiveNumber(route.query.priceMax),
      author: list(route.query.author),
      publisher: list(route.query.publisher),
      attribute: list(route.query.attribute),
      onSale: first(route.query.onSale) === "true" || undefined,
      upcoming: first(route.query.upcoming) === "true" || undefined,
      sort:
        sortValue && validSorts.has(sortValue)
          ? sortValue
          : q
            ? "relevance"
            : "popular",
    };
  });

  watch(view, (value) =>
    localStorage.setItem(STORAGE_KEYS.storefrontView, value),
  );

  async function update(
    values: Record<string, string | number | boolean | string[] | undefined>,
    resetPage = true,
  ): Promise<void> {
    const query: Record<string, string | string[]> = {};
    for (const [key, raw] of Object.entries({ ...route.query, ...values })) {
      if (
        raw === undefined ||
        raw === "" ||
        raw === false ||
        (Array.isArray(raw) && raw.length === 0)
      )
        continue;
      query[key] = Array.isArray(raw) ? raw.map(String) : String(raw);
    }
    if (resetPage) delete query.page;
    await router.replace({ query });
  }

  function toggleList(
    key: "author" | "publisher" | "attribute",
    value: string,
    enabled: boolean,
  ): Promise<void> {
    const current = list(route.query[key]) ?? [];
    const next = enabled
      ? [...new Set([...current, value])]
      : current.filter((item) => item !== value);
    return update({ [key]: next });
  }

  function reset(): Promise<void> {
    return router.replace({ query: {} }).then(() => undefined);
  }

  return { params, view, update, toggleList, reset };
}
