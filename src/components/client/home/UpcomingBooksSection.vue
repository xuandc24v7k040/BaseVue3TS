<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import type { PublicProductListItemDto } from '@/api/generated/models'
import { formatProductDate } from '@/features/products/utils/product-date'

defineProps<{ books: PublicProductListItemDto[] }>()

</script>

<template>
  <section class="w-full min-w-0 max-w-full rounded-xl border border-[var(--bookora-border)] bg-background p-4 sm:p-5">
    <div class="mb-4 flex min-w-0 items-start justify-between gap-3">
      <h2 class="min-w-0 text-xl font-bold tracking-tight text-[var(--bookora-ink)]">Sách sắp phát hành</h2>
      <RouterLink to="/books?filter=upcoming" class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-[var(--bookora-green)] hover:underline">
        Xem tất cả
        <ArrowRight aria-hidden="true" class="size-4" />
      </RouterLink>
    </div>
    <div class="grid w-full min-w-0 max-w-full auto-cols-[130px] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible">
      <RouterLink
        v-for="book in books"
        :key="book.id"
        :to="`/books/${book.slug}`"
        class="group min-w-0 rounded-lg border border-[var(--bookora-border)] p-2 text-center transition-colors hover:border-[var(--bookora-green)] hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
      >
        <time class="text-xs font-bold text-[var(--bookora-ink)]">{{ formatProductDate(book.releaseDate) }}</time>
        <img :src="book.primaryImage.url" :alt="book.primaryImage.altText || `Bìa sách ${book.name}`" class="mx-auto mt-2 aspect-[2/3] w-full max-w-24 object-contain drop-shadow-sm" width="300" height="450" loading="lazy">
        <h3 class="mt-2 line-clamp-2 text-xs font-semibold leading-4">{{ book.name }}</h3>
        <p class="mt-1 truncate text-[10px] text-[var(--bookora-muted)]">{{ book.authors.map(author => author.name).join(', ') }}</p>
      </RouterLink>
    </div>
  </section>
</template>
