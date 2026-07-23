<script setup lang="ts">
import type { Component } from 'vue'
import {
  Atom,
  Baby,
  BookOpen,
  Brain,
  ChartNoAxesCombined,
  Grid2X2,
  Landmark,
  Sprout,
} from '@lucide/vue'
import { RouterLink } from 'vue-router'
import type { PublicCategoryResponseDto } from '@/api/generated/models'

defineProps<{ categories: PublicCategoryResponseDto[] }>()

const categoryIcons: Component[] = [BookOpen, ChartNoAxesCombined, Sprout, Baby, Brain, Atom, Landmark]
</script>

<template>
  <nav
    aria-label="Danh mục sách"
    class="min-w-0 max-w-full overflow-x-auto rounded-xl border border-[var(--bookora-border)] bg-background [scrollbar-width:none]"
  >
    <div class="grid min-w-[760px] grid-cols-8 px-2 py-3">
      <RouterLink
        v-for="(category, index) in categories"
        :key="category.id"
        :to="category.slug === 'all' ? '/books' : `/books?category=${category.slug}`"
        class="group flex min-h-20 flex-col items-center justify-center gap-2 border-[var(--bookora-border)] px-3 text-center text-sm font-medium transition-colors hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--bookora-green)]"
        :class="index < categories.length - 1 ? 'border-r' : ''"
      >
        <img v-if="category.imageUrl" :src="category.imageUrl" alt="" class="size-7 object-contain">
        <component v-else :is="category.slug === 'all' ? Grid2X2 : categoryIcons[index % categoryIcons.length]" aria-hidden="true" class="size-7 text-[var(--bookora-green)] transition-transform duration-200 group-hover:-translate-y-0.5" :stroke-width="1.7" />
        {{ category.name }}
      </RouterLink>
    </div>
  </nav>
</template>
