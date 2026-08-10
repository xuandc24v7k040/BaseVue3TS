<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorefrontRelatedProductsQuery } from "@/features/storefront/api/storefront-api";
import ProductCard from "@/features/storefront/components/ProductCard.vue";

const props = defineProps<{
  productId: string;
  categorySlug?: string | null;
}>();

const relatedQuery = useStorefrontRelatedProductsQuery(
  computed(() => props.productId),
);
const products = computed(() => {
  const unique = new Map(
    (relatedQuery.data.value ?? [])
      .filter((product) => product.id !== props.productId)
      .map((product) => [product.id, product]),
  );
  return [...unique.values()].slice(0, 3);
});
const carouselOptions = {
  align: "start",
  loop: false,
  duration:
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 20
      : 30,
} as const;
</script>

<template>
  <section
    v-if="
      (relatedQuery.isPending.value && !relatedQuery.data.value) ||
      (!relatedQuery.isError.value && products.length)
    "
    class="related-products min-w-0 overflow-hidden rounded-xl border border-[var(--bookora-border)] bg-background p-5"
    aria-labelledby="related-products-title"
  >
    <div class="mb-4 flex items-center justify-between gap-4">
      <h2 id="related-products-title" class="text-xl font-bold">
        Sản phẩm liên quan
      </h2>
      <RouterLink
        v-if="categorySlug"
        :to="{
          name: 'client-book-list',
          query: { category: categorySlug },
        }"
        class="shrink-0 text-sm font-semibold text-[var(--bookora-green)] hover:underline"
      >
        Xem tất cả →
      </RouterLink>
    </div>

    <div
      v-if="relatedQuery.isPending.value && !relatedQuery.data.value"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Đang tải sản phẩm liên quan"
    >
      <Skeleton
        v-for="index in 3"
        :key="index"
        data-testid="related-product-skeleton"
        class="aspect-[3/5] rounded-xl"
      />
    </div>

    <Carousel v-else :opts="carouselOptions" class="related-carousel min-w-0">
      <CarouselContent class="-ml-3">
        <CarouselItem
          v-for="product in products"
          :key="product.id"
          class="basis-[86%] pl-3 sm:basis-1/2 lg:basis-1/3"
        >
          <ProductCard :product="product" class="h-full" />
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious
        v-if="products.length > 1"
        class="related-carousel-control left-2 z-10 border-[var(--bookora-border)] bg-background shadow-md transition-[opacity,box-shadow] duration-200 hover:shadow-lg disabled:pointer-events-none disabled:opacity-0 lg:hidden"
      >
        <ChevronLeft class="size-4" />
        <span class="sr-only">Sản phẩm trước</span>
      </CarouselPrevious>
      <CarouselNext
        v-if="products.length > 1"
        class="related-carousel-control right-2 z-10 border-[var(--bookora-border)] bg-background shadow-md transition-[opacity,box-shadow] duration-200 hover:shadow-lg disabled:pointer-events-none disabled:opacity-0 lg:hidden"
      >
        <ChevronRight class="size-4" />
        <span class="sr-only">Sản phẩm tiếp theo</span>
      </CarouselNext>
    </Carousel>
  </section>
</template>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  .related-carousel :deep(.related-carousel-control:not(:disabled)) {
    opacity: 0;
  }

  .related-carousel:hover :deep(.related-carousel-control:not(:disabled)),
  .related-carousel:focus-within
    :deep(.related-carousel-control:not(:disabled)) {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .related-products :deep(*) {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
