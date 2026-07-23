<script setup lang="ts">
import { ChevronRight, Menu } from '@lucide/vue'
import { onClickOutside } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { PublicCategoryResponseDto } from '@/api/generated/models'
import { Button } from '@/components/ui/button'

const props = defineProps<{ categories: PublicCategoryResponseDto[] }>()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const open = ref(false)
const activeSlug = ref<string | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

const activeCategory = computed(() =>
  props.categories.find(category => category.slug === activeSlug.value) ?? props.categories[0] ?? null,
)

watch(() => props.categories, categories => {
  if (!categories.some(category => category.slug === activeSlug.value)) {
    activeSlug.value = categories[0]?.slug ?? null
  }
}, { immediate: true })

onClickOutside(root, () => close())
onBeforeUnmount(() => clearCloseTimer())

function clearCloseTimer(): void {
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = null
}

function scheduleClose(): void {
  clearCloseTimer()
  closeTimer = setTimeout(() => close(), 180)
}

function close(restoreFocus = false): void {
  clearCloseTimer()
  open.value = false
  if (restoreFocus) void nextTick(() => trigger.value?.focus())
}

function toggle(): void {
  open.value = !open.value
  if (open.value && !activeSlug.value) activeSlug.value = props.categories[0]?.slug ?? null
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close(true)
  }
  if (event.key === 'ArrowDown' && !open.value) {
    event.preventDefault()
    open.value = true
  }
}
</script>

<template>
  <div ref="root" class="relative" @mouseenter="clearCloseTimer" @mouseleave="scheduleClose" @keydown="handleKeydown">
    <Button
      ref="trigger"
      type="button"
      variant="ghost"
      class="gap-2 px-2 text-sm font-semibold hover:bg-[var(--bookora-soft)]"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-controls="storefront-category-mega-menu"
      @click="toggle"
    >
      <Menu aria-hidden="true" class="size-5" />
      Danh mục
    </Button>

    <div
      v-if="open"
      id="storefront-category-mega-menu"
      role="menu"
      class="absolute left-0 top-[calc(100%+0.75rem)] z-50 grid w-[620px] grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[var(--bookora-border)] bg-background shadow-xl"
    >
      <div class="border-r border-[var(--bookora-border)] bg-[var(--bookora-cream)] p-3">
        <RouterLink
          v-for="category in categories"
          :key="category.id"
          :to="`/books?category=${category.slug}`"
          role="menuitem"
          class="flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          :class="activeCategory?.id === category.id ? 'bg-[var(--bookora-soft)] text-[var(--bookora-green)]' : ''"
          @mouseenter="activeSlug = category.slug"
          @focus="activeSlug = category.slug"
          @click="close()"
        >
          {{ category.name }}
          <ChevronRight aria-hidden="true" class="size-4" />
        </RouterLink>
      </div>
      <div class="p-5">
        <div v-if="activeCategory" class="flex items-center justify-between border-b border-[var(--bookora-border)] pb-3">
          <h2 class="text-lg font-bold">{{ activeCategory.name }}</h2>
          <RouterLink :to="`/books?category=${activeCategory.slug}`" class="text-sm font-semibold text-[var(--bookora-green)] hover:underline" @click="close()">
            Xem tất cả →
          </RouterLink>
        </div>
        <div v-if="activeCategory?.children.length" class="grid grid-cols-2 gap-1 pt-3">
          <RouterLink
            v-for="child in activeCategory.children"
            :key="child.id"
            :to="`/books?category=${child.slug}`"
            role="menuitem"
            class="rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            @click="close()"
          >{{ child.name }}</RouterLink>
        </div>
        <p v-else class="py-8 text-center text-sm text-[var(--bookora-muted)]">Danh mục này chưa có nhóm con.</p>
      </div>
    </div>
  </div>
</template>
