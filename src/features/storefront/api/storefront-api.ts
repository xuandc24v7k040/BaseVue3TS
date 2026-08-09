import { useQuery } from "@tanstack/vue-query";
import type { MaybeRef } from "vue";
import { computed, unref } from "vue";
import {
  storefrontCategoriesList,
  storefrontHomeGet,
  storefrontProductAvailability,
  storefrontProductDetail,
  storefrontProductSearchSuggestions,
  storefrontProductSummaries,
  storefrontProductsList,
} from "@/api/generated/endpoints/storefront-catalog/storefront-catalog";
import { storefrontBranchesList } from "@/api/generated/endpoints/storefront-branches/storefront-branches";
import type {
  StorefrontProductsListParams,
} from "@/api/generated/models";

export const storefrontQueryKeys = {
  all: ["storefront"] as const,
  branches: ["storefront", "branches"] as const,
  categories: ["storefront", "categories"] as const,
  home: ["storefront", "home"] as const,
  products: (params: StorefrontProductsListParams) =>
    ["storefront", "products", params] as const,
  searchSuggestions: (q: string, limit: number) =>
    ["storefront", "search-suggestions", q, limit] as const,
  productSummaries: (ids: string[]) =>
    ["storefront", "product-summaries", ids] as const,
  detail: (slug: string) => ["storefront", "detail", slug] as const,
  availability: (
    branchId: string | null,
    productId: string,
  ) =>
    [
      "storefront-availability",
      branchId,
      productId,
    ] as const,
};

export function useStorefrontBranchesQuery() {
  return useQuery({
    queryKey: storefrontQueryKeys.branches,
    queryFn: ({ signal }) =>
      storefrontBranchesList(undefined, signal).then(
        (response) => response.data,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useStorefrontCategoriesQuery() {
  return useQuery({
    queryKey: storefrontQueryKeys.categories,
    queryFn: ({ signal }) =>
      storefrontCategoriesList(undefined, signal).then(
        (response) => response.data,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useStorefrontHomeQuery() {
  return useQuery({
    queryKey: storefrontQueryKeys.home,
    queryFn: ({ signal }) =>
      storefrontHomeGet(undefined, signal).then((response) => response.data),
  });
}

export function useStorefrontProductsQuery(
  params: MaybeRef<StorefrontProductsListParams>,
) {
  return useQuery({
    queryKey: computed(() => storefrontQueryKeys.products(unref(params))),
    queryFn: ({ signal }) =>
      storefrontProductsList(
        unref(params),
        { paramsSerializer: { indexes: null } },
        signal,
      ).then((response) => response.data),
    placeholderData: (previous) => previous,
  });
}

export function useStorefrontSearchSuggestionsQuery(
  query: MaybeRef<string>,
  limit = 5,
) {
  const normalizedQuery = computed(() =>
    unref(query).trim().replace(/\s+/gu, " "),
  );
  return useQuery({
    queryKey: computed(() =>
      storefrontQueryKeys.searchSuggestions(normalizedQuery.value, limit),
    ),
    queryFn: ({ signal }) =>
      storefrontProductSearchSuggestions(
        { q: normalizedQuery.value, limit },
        undefined,
        signal,
      ).then((response) => response.data),
    enabled: computed(() => normalizedQuery.value.length >= 2),
    staleTime: 30_000,
    retry: false,
  });
}

export function useStorefrontProductSummariesQuery(ids: MaybeRef<string[]>) {
  const normalizedIds = computed(() => [...new Set(unref(ids))].slice(0, 12));
  return useQuery({
    queryKey: computed(() =>
      storefrontQueryKeys.productSummaries(normalizedIds.value),
    ),
    queryFn: ({ signal }) =>
      storefrontProductSummaries(
        { ids: normalizedIds.value },
        { paramsSerializer: { indexes: null } },
        signal,
      ).then((response) => response.data),
    enabled: computed(() => normalizedIds.value.length > 0),
    placeholderData: (previous) => previous,
    retry: 1,
  });
}

export function useStorefrontProductDetailQuery(slug: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => storefrontQueryKeys.detail(unref(slug))),
    queryFn: ({ signal }) =>
      storefrontProductDetail(unref(slug), undefined, signal).then(
        (response) => response.data,
      ),
    enabled: computed(() => Boolean(unref(slug))),
    retry: false,
  });
}

export function useStorefrontAvailabilityQuery(
  branchId: MaybeRef<string | null>,
  productId: MaybeRef<string>,
) {
  return useQuery({
    queryKey: computed(() =>
      storefrontQueryKeys.availability(
        unref(branchId),
        unref(productId),
      ),
    ),
    queryFn: ({ signal }) =>
      storefrontProductAvailability(
        unref(productId),
        undefined,
        { branchScoped: true },
        signal,
      ).then((response) => response.data),
    enabled: computed(() => Boolean(unref(branchId) && unref(productId))),
    retry: 1,
  });
}
