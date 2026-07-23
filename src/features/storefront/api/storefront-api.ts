import { useQuery } from "@tanstack/vue-query";
import type { MaybeRef } from "vue";
import { computed, unref } from "vue";
import {
  storefrontCategoriesList,
  storefrontHomeGet,
  storefrontProductAvailability,
  storefrontProductDetail,
  storefrontProductsList,
} from "@/api/generated/endpoints/storefront-catalog/storefront-catalog";
import { storefrontBranchesList } from "@/api/generated/endpoints/storefront-branches/storefront-branches";
import type {
  StorefrontProductAvailabilityParams,
  StorefrontProductsListParams,
} from "@/api/generated/models";

export const storefrontQueryKeys = {
  all: ["storefront"] as const,
  branches: ["storefront", "branches"] as const,
  categories: ["storefront", "categories"] as const,
  home: ["storefront", "home"] as const,
  products: (params: StorefrontProductsListParams) =>
    ["storefront", "products", params] as const,
  detail: (slug: string) => ["storefront", "detail", slug] as const,
  availability: (
    branchId: string | null,
    productId: string,
    variantId: string | undefined,
  ) =>
    [
      "storefront-availability",
      branchId,
      productId,
      variantId ?? null,
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
  params: MaybeRef<StorefrontProductAvailabilityParams>,
) {
  return useQuery({
    queryKey: computed(() =>
      storefrontQueryKeys.availability(
        unref(branchId),
        unref(productId),
        unref(params).variantId,
      ),
    ),
    queryFn: ({ signal }) =>
      storefrontProductAvailability(
        unref(productId),
        unref(params),
        { branchScoped: true },
        signal,
      ).then((response) => response.data),
    enabled: computed(() => Boolean(unref(branchId) && unref(productId))),
    retry: 1,
  });
}
