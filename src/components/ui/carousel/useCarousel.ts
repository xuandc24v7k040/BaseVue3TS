import type {
  CarouselEmits,
  CarouselProps,
  UnwrapRefCarouselApi as CarouselApi,
} from './interface'
import { createInjectionState } from '@vueuse/core'
import emblaCarouselVue from 'embla-carousel-vue'
import { onMounted, ref } from 'vue'

const [useProvideCarousel, useInjectCarousel] = createInjectionState(
  ({ opts, orientation, plugins }: CarouselProps, emits: CarouselEmits) => {
    const [carouselRef, carouselApi] = emblaCarouselVue(
      {
        ...opts,
        axis: orientation === 'horizontal' ? 'x' : 'y',
      },
      plugins,
    )

    const canScrollNext = ref(false)
    const canScrollPrev = ref(false)

    function scrollPrev(): void {
      carouselApi.value?.scrollPrev()
    }

    function scrollNext(): void {
      carouselApi.value?.scrollNext()
    }

    function onSelect(api: CarouselApi): void {
      canScrollNext.value = api?.canScrollNext() ?? false
      canScrollPrev.value = api?.canScrollPrev() ?? false
    }

    onMounted(() => {
      if (!carouselApi.value) return

      carouselApi.value.on('init', onSelect)
      carouselApi.value.on('reInit', onSelect)
      carouselApi.value.on('select', onSelect)
      onSelect(carouselApi.value)
      emits('init-api', carouselApi.value)
    })

    return {
      carouselRef,
      carouselApi,
      canScrollPrev,
      canScrollNext,
      scrollPrev,
      scrollNext,
      orientation,
    }
  },
)

function useCarousel() {
  const carouselState = useInjectCarousel()

  if (!carouselState) throw new Error('useCarousel must be used within a <Carousel />')

  return carouselState
}

export { useCarousel, useProvideCarousel }
