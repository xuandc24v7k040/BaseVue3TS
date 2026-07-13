<script setup lang="ts">
import { BookOpen } from '@lucide/vue'
import { RouterLink } from 'vue-router'

withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false,
})
</script>

<template>
  <RouterLink
    to="/"
    aria-label="Bookora, về trang chủ"
    class="group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] focus-visible:ring-offset-2"
  >
    <BookOpen
      aria-hidden="true"
      class="size-9 shrink-0 text-[var(--bookora-green)] transition-transform duration-200 group-hover:-rotate-3 sm:size-10"
      :stroke-width="1.6"
    />
    <span class="min-w-0">
      <span class="block text-lg font-bold tracking-[0.04em] text-[var(--bookora-ink)] sm:text-xl">
        BOOKORA
      </span>
      <span v-if="!compact" class="block whitespace-nowrap text-[10px] font-medium text-[var(--bookora-muted)] sm:text-[11px]">
        Tri thức mở lối tương lai
      </span>
    </span>
  </RouterLink>
</template>

<style>
.bookora-client-theme {
  --bookora-green: oklch(0.38 0.095 148);
  --bookora-green-hover: oklch(0.32 0.085 148);
  --bookora-green-soft: oklch(0.63 0.09 144);
  --bookora-soft: oklch(0.96 0.018 130);
  --bookora-cream: oklch(0.975 0.012 83);
  --bookora-canvas: oklch(0.995 0.004 90);
  --bookora-ink: oklch(0.19 0.025 148);
  --bookora-muted: oklch(0.49 0.02 145);
  --bookora-border: oklch(0.9 0.012 120);
}
</style>
