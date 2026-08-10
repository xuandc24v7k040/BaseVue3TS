<script setup lang="ts">
import { BookOpen, Star } from "@lucide/vue";
import { ref } from "vue";
import { RouterLink } from "vue-router";
import type { PublicProductListItemDto } from "@/api/generated/models";
import { Card } from "@/components/ui/card";
import WishlistButton from "@/features/engagement/components/WishlistButton.vue";
import { formatProductDate } from "@/features/products/utils/product-date";

withDefaults(
  defineProps<{
    product: PublicProductListItemDto;
    view?: "grid" | "list";
    showRank?: boolean;
  }>(),
  {
    view: "grid",
    showRank: false,
  },
);

const imageFailed = ref(false);
const priceFormatter = new Intl.NumberFormat("vi-VN");

function formatPrice(price: number): string {
  return `${priceFormatter.format(price)}đ`;
}
</script>

<template>
  <Card
    class="group relative min-w-0 gap-0 border border-[var(--bookora-border)] bg-background p-3 shadow-none transition-[box-shadow,border-color] hover:border-[var(--bookora-green)]/50 hover:shadow-md focus-within:border-[var(--bookora-green)]/60 focus-within:shadow-sm"
    :class="
      view === 'list'
        ? 'grid grid-cols-[110px_minmax(0,1fr)] gap-4 sm:grid-cols-[150px_minmax(0,1fr)]'
        : ''
    "
  >
    <span
      v-if="showRank && product.rank"
      class="absolute left-2 top-2 z-10 grid size-6 place-items-center rounded bg-[var(--bookora-green)] text-xs font-bold text-white"
      >{{ product.rank }}</span
    >
    <WishlistButton
      :product-id="product.id"
      class="absolute right-2 top-2 z-10 size-9 rounded-full bg-background/85 text-[var(--bookora-muted)] shadow-sm hover:text-[var(--bookora-green)]"
    />

    <RouterLink
      :to="`/san-pham/${product.slug}`"
      class="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] focus-visible:ring-offset-2"
    >
      <div
        class="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-muted/20 p-2"
      >
        <img
          v-if="!imageFailed"
          :src="product.primaryImage.url"
          :alt="product.primaryImage.altText || `Bìa sách ${product.name}`"
          class="h-full w-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-[1.02]"
          width="300"
          height="450"
          loading="lazy"
          @error="imageFailed = true"
        />
        <BookOpen
          v-else
          aria-hidden="true"
          class="size-14 text-[var(--bookora-green)]/45"
        />
      </div>
    </RouterLink>

    <div class="min-w-0 pt-3" :class="view === 'list' ? 'pt-1 pr-10' : ''">
      <RouterLink
        :to="`/san-pham/${product.slug}`"
        class="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
      >
        <h3
          class="line-clamp-2 text-sm font-semibold leading-5 text-[var(--bookora-ink)]"
          :class="view === 'grid' ? 'min-h-10' : 'text-base'"
        >
          {{ product.name }}
        </h3>
      </RouterLink>
      <p class="mt-0.5 truncate text-xs text-[var(--bookora-muted)]">
        {{
          product.authors.map((author) => author.name).join(", ") ||
          "Đang cập nhật tác giả"
        }}
      </p>
      <div class="mt-1 flex items-center gap-1 text-xs text-amber-600">
        <Star aria-hidden="true" class="size-3.5 fill-current" />
        <span>{{ product.averageRating?.toFixed(1) ?? "Chưa có" }}</span>
        <span class="text-[var(--bookora-muted)]"
          >({{ product.reviewCount }})</span
        >
      </div>
      <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong class="text-sm text-red-600">{{
          formatPrice(product.price.current)
        }}</strong>
        <del
          v-if="product.price.onSale"
          class="text-xs text-[var(--bookora-muted)]"
          >{{ formatPrice(product.price.original) }}</del
        >
        <span
          v-if="product.price.onSale"
          class="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600"
          >-{{ product.price.discountPercent }}%</span
        >
      </div>
      <p
        v-if="product.releaseDate"
        class="mt-2 text-xs text-[var(--bookora-green)]"
      >
        Phát hành {{ formatProductDate(product.releaseDate) }}
      </p>
      <p
        v-if="view === 'list'"
        class="mt-3 text-sm leading-6 text-[var(--bookora-muted)]"
      >
        Xem thông tin phiên bản, hình ảnh và tình trạng còn hàng tại chi nhánh
        bạn chọn.
      </p>
    </div>
  </Card>
</template>
