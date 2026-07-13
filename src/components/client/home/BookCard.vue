<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Card } from '@/components/ui/card'
import type { HomeBookMock } from '@/pages/app/home/home.mock'

defineProps<{ book: HomeBookMock }>()

const priceFormatter = new Intl.NumberFormat('vi-VN')

function formatPrice(price: number): string {
  return `${priceFormatter.format(price)}đ`
}
</script>

<template>
  <Card class="group relative min-w-0 gap-0 border-0 bg-transparent p-2 shadow-none transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-sm">
    <span
      v-if="book.rank"
      class="absolute left-1 top-1 z-10 grid size-6 place-items-center rounded-md bg-[var(--bookora-green)] text-xs font-bold text-white"
    >
      {{ book.rank }}
    </span>
    <RouterLink :to="book.href" class="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] focus-visible:ring-offset-2">
      <div class="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-[var(--bookora-cream)] p-2">
        <img
          :src="book.cover"
          :alt="`Bìa sách ${book.title}`"
          class="h-full w-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-[1.02]"
          width="300"
          height="450"
          loading="lazy"
        >
      </div>
      <div class="pt-3">
        <h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[var(--bookora-ink)]">
          {{ book.title }}
        </h3>
        <p class="mt-0.5 truncate text-xs text-[var(--bookora-muted)]">{{ book.author }}</p>
        <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <strong class="text-sm text-[var(--bookora-ink)]">{{ formatPrice(book.currentPrice) }}</strong>
          <del v-if="book.originalPrice" class="text-xs text-[var(--bookora-muted)]">
            {{ formatPrice(book.originalPrice) }}
          </del>
          <span v-if="book.discountPercent" class="text-xs font-semibold text-red-500">
            -{{ book.discountPercent }}%
          </span>
        </div>
      </div>
    </RouterLink>
  </Card>
</template>
