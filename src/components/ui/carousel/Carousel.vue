<script setup lang="ts">
import type { CarouselEmits, CarouselProps, WithClassAsProps } from './interface'
import { cn } from '@/lib/utils'
import { useProvideCarousel } from './useCarousel'

const props = withDefaults(defineProps<CarouselProps & WithClassAsProps>(), {
  orientation: 'horizontal',
})

const emits = defineEmits<CarouselEmits>()

const carousel = useProvideCarousel(props, emits)

defineExpose(carousel)

function onKeyDown(event: KeyboardEvent): void {
  const previousKey = props.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
  const nextKey = props.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'

  if (event.key === previousKey) {
    event.preventDefault()
    carousel.scrollPrev()
  } else if (event.key === nextKey) {
    event.preventDefault()
    carousel.scrollNext()
  }
}
</script>

<template>
  <div
    :class="cn('relative', props.class)"
    role="region"
    aria-roledescription="carousel"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <slot v-bind="carousel" />
  </div>
</template>
