<script setup lang="ts">
import { ArrowRight, ChevronLeft, ChevronRight } from '@lucide/vue'
import { ref, type ComponentPublicInstance } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { PublicProductListItemDto } from '@/api/generated/models'
import ProductCard from '@/features/storefront/components/ProductCard.vue'

withDefaults(
  defineProps<{
    title: string
    books: PublicProductListItemDto[]
    viewAllHref: string
    showControls?: boolean
  }>(),
  {
    showControls: false,
  },
)

const track = ref<ComponentPublicInstance | null>(null)

function scroll(direction: 'previous' | 'next'): void {
  const root = track.value?.$el
  if (!(root instanceof HTMLElement)) return
  const viewport = root.querySelector<HTMLElement>(
    '[data-slot="scroll-area-viewport"]',
  )
  viewport?.scrollBy({
    left: direction === 'next' ? 420 : -420,
    behavior: 'smooth',
  })
}
</script>

<template>
  <section
    class="relative w-full min-w-0 max-w-full rounded-xl border border-[var(--bookora-border)] bg-background px-4 py-4 sm:px-5"
  >
    <div class="mb-3 flex min-w-0 items-center justify-between gap-3">
      <h2
        class="min-w-0 text-xl font-bold tracking-tight text-[var(--bookora-ink)]"
      >
        {{ title }}
      </h2>
      <RouterLink
        :to="viewAllHref"
        class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-[var(--bookora-green)] hover:underline"
      >
        Xem tất cả
        <ArrowRight aria-hidden="true" class="size-4" />
      </RouterLink>
    </div>

    <ScrollArea
      ref="track"
      type="auto"
      scrollbar-orientation="horizontal"
      class="w-full min-w-0 max-w-full overflow-hidden pb-2"
    >
      <div
        class="grid w-max auto-cols-[145px] grid-flow-col gap-2 px-0.5 pt-1 lg:w-full lg:auto-cols-auto lg:grid-flow-row"
        :class="books.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'"
      >
        <ProductCard
          v-for="book in books"
          :key="book.id"
          :product="book"
          :show-rank="showControls"
        />
      </div>
    </ScrollArea>

    <template v-if="showControls">
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Xem sách trước"
        class="absolute left-1 top-1/2 z-20 hidden size-9 -translate-y-1/2 rounded-full border-[var(--bookora-border)] bg-background shadow-sm hover:bg-[var(--bookora-soft)] sm:inline-flex"
        @click="scroll('previous')"
      >
        <ChevronLeft aria-hidden="true" class="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Xem sách tiếp theo"
        class="absolute right-1 top-1/2 z-20 hidden size-9 -translate-y-1/2 rounded-full border-[var(--bookora-border)] bg-background shadow-sm hover:bg-[var(--bookora-soft)] sm:inline-flex"
        @click="scroll('next')"
      >
        <ChevronRight aria-hidden="true" class="size-4" />
      </Button>
    </template>
  </section>
</template>
