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
import type { HomeCategoryIcon, HomeCategoryMock } from '@/pages/app/home/home.mock'

defineProps<{ categories: HomeCategoryMock[] }>()

const categoryIcons: Record<HomeCategoryIcon, Component> = {
  book: BookOpen,
  chart: ChartNoAxesCombined,
  sprout: Sprout,
  teddy: Baby,
  brain: Brain,
  atom: Atom,
  landmark: Landmark,
  grid: Grid2X2,
}
</script>

<template>
  <nav aria-label="Danh mục sách" class="overflow-x-auto rounded-xl border border-[var(--bookora-border)] bg-background [scrollbar-width:none]">
    <div class="grid min-w-[760px] grid-cols-8 px-2 py-3">
      <RouterLink
        v-for="(category, index) in categories"
        :key="category.id"
        :to="category.href"
        class="group flex min-h-20 flex-col items-center justify-center gap-2 border-[var(--bookora-border)] px-3 text-center text-sm font-medium transition-colors hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--bookora-green)]"
        :class="index < categories.length - 1 ? 'border-r' : ''"
      >
        <component :is="categoryIcons[category.icon]" aria-hidden="true" class="size-7 text-[var(--bookora-green)] transition-transform duration-200 group-hover:-translate-y-0.5" :stroke-width="1.7" />
        {{ category.name }}
      </RouterLink>
    </div>
  </nav>
</template>
