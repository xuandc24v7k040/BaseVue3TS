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
    <div class="grid w-full min-w-0 max-w-full auto-cols-[minmax(210px,240px)] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain px-0.5 pb-2 pt-1 [scrollbar-width:none]">
      <RouterLink
        v-for="book in books"
        :key="book.id"
        :to="`/books/${book.slug}`"
        class="group grid min-h-72 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto_auto] rounded-xl border border-[var(--bookora-border)] bg-background p-3.5 text-center transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:border-[var(--bookora-green)]/55 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
      >
        <time class="mx-auto inline-flex rounded-md bg-[var(--bookora-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--bookora-green)]">
          Phát hành {{ formatProductDate(book.releaseDate) }}
        </time>
        <div class="mt-3 flex min-h-40 items-center justify-center">
          <img :src="book.primaryImage.url" :alt="book.primaryImage.altText || `Bìa sách ${book.name}`" class="aspect-[2/3] h-40 w-auto max-w-full object-contain drop-shadow-md" width="300" height="450" loading="lazy">
        </div>
        <h3 class="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5 transition-colors duration-200 group-hover:text-[var(--bookora-green)]">{{ book.name }}</h3>
        <p class="mt-1 truncate text-xs text-[var(--bookora-muted)]">{{ book.authors.map(author => author.name).join(', ') || 'Đang cập nhật' }}</p>
      </RouterLink>
    </div>
  </section>
</template>
