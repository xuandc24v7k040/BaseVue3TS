<script setup lang="ts">
import type { WithClassAsProps } from './interface'
import type { ComponentPublicInstance } from 'vue'
import { cn } from '@/lib/utils'
import { useCarousel } from './useCarousel'

defineOptions({ inheritAttrs: false })

const props = defineProps<WithClassAsProps>()
const carousel = useCarousel()

function setCarouselElement(element: Element | ComponentPublicInstance | null): void {
  carousel.carouselRef.value = element instanceof HTMLElement ? element : undefined
}
</script>

<template>
  <div :ref="setCarouselElement" class="h-full overflow-hidden">
    <div
      v-bind="$attrs"
      :class="cn('flex h-full', carousel.orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col', props.class)"
    >
      <slot />
    </div>
  </div>
</template>
