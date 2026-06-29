<script setup lang="ts">
import type { ScrollAreaRootProps } from "reka-ui"
import type { ComponentPublicInstance, HTMLAttributes } from "vue"
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ChevronDown, ChevronUp } from "@lucide/vue"
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaViewport,
} from "reka-ui"
import { cn } from "@/lib/utils"
import ScrollBar from "./ScrollBar.vue"

type ScrollbarOrientation = "vertical" | "horizontal" | "both"

const props = withDefaults(
  defineProps<
    ScrollAreaRootProps & {
      class?: HTMLAttributes["class"]
      scrollbarOrientation?: ScrollbarOrientation
      showScrollButtons?: boolean
      scrollStep?: number
    }
  >(),
  {
    scrollbarOrientation: "vertical",
    showScrollButtons: false,
    scrollStep: 80,
  },
)

const delegatedProps = reactiveOmit(
  props,
  "class",
  "scrollbarOrientation",
  "showScrollButtons",
  "scrollStep",
)
const viewportRef = ref<Element | ComponentPublicInstance | null>(null)
const canScrollUp = ref(false)
const canScrollDown = ref(false)
let resizeObserver: ResizeObserver | null = null

const hasVerticalScrollbar = computed(
  () => props.scrollbarOrientation === "vertical" || props.scrollbarOrientation === "both",
)
const hasHorizontalScrollbar = computed(
  () => props.scrollbarOrientation === "horizontal" || props.scrollbarOrientation === "both",
)
const shouldShowScrollButtons = computed(
  () => hasVerticalScrollbar.value && props.showScrollButtons && (canScrollUp.value || canScrollDown.value),
)

function getViewportElement(): HTMLElement | null {
  const refValue = viewportRef.value
  if (!refValue) return null
  if (refValue instanceof HTMLElement) return refValue
  if (refValue instanceof Element) return null

  const rootElement = refValue.$el
  if (rootElement instanceof HTMLElement) return rootElement
  return null
}

function updateScrollState() {
  const viewport = getViewportElement()
  if (!viewport) return

  const maxScrollTop = Math.max(viewport.scrollHeight - viewport.clientHeight, 0)
  canScrollUp.value = viewport.scrollTop > 1
  canScrollDown.value = viewport.scrollTop < maxScrollTop - 1
}

function scrollByStep(direction: "up" | "down") {
  const viewport = getViewportElement()
  if (!viewport) return

  viewport.scrollBy({
    top: direction === "up" ? -props.scrollStep : props.scrollStep,
    behavior: "smooth",
  })
}

function setupResizeObserver() {
  resizeObserver?.disconnect()

  const viewport = getViewportElement()
  if (!viewport || typeof ResizeObserver === "undefined") return

  resizeObserver = new ResizeObserver(updateScrollState)
  resizeObserver.observe(viewport)
  const content = viewport.firstElementChild
  if (content) resizeObserver.observe(content)
}

onMounted(() => {
  nextTick(() => {
    updateScrollState()
    setupResizeObserver()
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(
  () => props.showScrollButtons,
  () => {
    nextTick(() => {
      updateScrollState()
      setupResizeObserver()
    })
  },
)
</script>

<template>
  <ScrollAreaRoot
    data-slot="scroll-area"
    v-bind="delegatedProps"
    :class="cn('relative', props.class)"
  >
    <ScrollAreaViewport
      ref="viewportRef"
      data-slot="scroll-area-viewport"
      class="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:outline-1 [&::-webkit-scrollbar]:hidden"
      @scroll="updateScrollState"
    >
      <slot />
    </ScrollAreaViewport>
    <ScrollBar v-if="hasVerticalScrollbar" />
    <ScrollBar v-if="hasHorizontalScrollbar" orientation="horizontal" />
    <ScrollAreaCorner />

    <button
      v-if="shouldShowScrollButtons"
      type="button"
      :disabled="!canScrollUp"
      aria-label="Cuộn lên"
      :class="
        cn(
          'absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-sm border bg-background/95 text-muted-foreground shadow-sm transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !canScrollUp && 'pointer-events-none opacity-35',
        )
      "
      @click="scrollByStep('up')"
    >
      <ChevronUp class="h-3.5 w-3.5" />
    </button>

    <button
      v-if="shouldShowScrollButtons"
      type="button"
      :disabled="!canScrollDown"
      aria-label="Cuộn xuống"
      :class="
        cn(
          'absolute bottom-0.5 right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-sm border bg-background/95 text-muted-foreground shadow-sm transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !canScrollDown && 'pointer-events-none opacity-35',
        )
      "
      @click="scrollByStep('down')"
    >
      <ChevronDown class="h-3.5 w-3.5" />
    </button>
  </ScrollAreaRoot>
</template>
