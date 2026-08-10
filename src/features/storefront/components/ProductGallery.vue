<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "@lucide/vue";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from "vue";
import VueEasyLightbox from "vue-easy-lightbox";
import type { PublicProductMediaDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const props = defineProps<{
  media: PublicProductMediaDto[];
  productName: string;
}>();
const selectedIndex = ref(0);
const lightboxVisible = ref(false);
const carouselApi = shallowRef<CarouselApi>();
const carouselOptions = {
  align: "start" as const,
  duration: 30,
  loop: true,
};
const selected = computed(() => props.media[selectedIndex.value] ?? null);
const visibleThumbnails = computed(() =>
  props.media.length > 4 ? props.media.slice(0, 3) : props.media,
);
const hiddenThumbnailCount = computed(() =>
  props.media.length > 4 ? props.media.length - 3 : 0,
);
const lightboxImages = computed(() =>
  props.media.map((image, index) => ({
    src: image.url,
    title: image.altText || `${props.productName} - ảnh ${index + 1}`,
    alt: image.altText || `${props.productName} - ảnh ${index + 1}`,
  })),
);

watch(
  () => props.media.map((item) => item.id).join(","),
  async () => {
    selectedIndex.value = 0;
    lightboxVisible.value = false;
    await nextTick();
    carouselApi.value?.reInit();
    carouselApi.value?.scrollTo(0, true);
  },
);

function syncSelectedImage(api: CarouselApi): void {
  if (!api) return;
  selectedIndex.value = api.selectedScrollSnap();
}

function setCarouselApi(api: CarouselApi): void {
  if (!api) return;
  carouselApi.value = api;
  syncSelectedImage(api);
  api.on("select", syncSelectedImage);
}

function move(direction: -1 | 1): void {
  if (!props.media.length) return;
  if (carouselApi.value) {
    direction === 1
      ? carouselApi.value.scrollNext()
      : carouselApi.value.scrollPrev();
    return;
  }
  selectedIndex.value =
    (selectedIndex.value + direction + props.media.length) % props.media.length;
}

function selectImage(index: number): void {
  if (index < 0 || index >= props.media.length || index === selectedIndex.value) {
    return;
  }
  if (carouselApi.value) {
    carouselApi.value.scrollTo(index);
    return;
  }
  selectedIndex.value = index;
}

function openLightbox(): void {
  if (selected.value) lightboxVisible.value = true;
}

function syncLightboxIndex(_oldIndex: number, newIndex: number): void {
  if (newIndex >= 0 && newIndex < props.media.length) {
    selectImage(newIndex);
  }
}

onBeforeUnmount(() => {
  carouselApi.value?.off("select", syncSelectedImage);
});
</script>

<template>
  <section aria-label="Bộ sưu tập ảnh sản phẩm" class="min-w-0">
    <div v-if="selected" class="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
      <div
        class="order-2 flex min-w-0 gap-2 overflow-hidden sm:order-1 sm:flex-col"
      >
        <button
          v-for="(image, index) in visibleThumbnails"
          :key="image.id"
          type="button"
          class="size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-white p-1 transition-[border-color,background-color,box-shadow] duration-180 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          :class="
            index === selectedIndex
              ? 'border-[var(--bookora-green)] bg-[var(--bookora-green)]/5 shadow-sm'
              : 'border-[var(--bookora-border)]'
          "
          :aria-label="`Xem ảnh ${index + 1}`"
          :aria-current="index === selectedIndex ? 'true' : undefined"
          @click="selectImage(index)"
        >
          <img
            :src="image.url"
            :alt="image.altText || `${productName} - ảnh ${index + 1}`"
            class="size-full object-contain transition-transform duration-200"
            :class="index === selectedIndex ? 'scale-[1.03]' : 'scale-100'"
          />
        </button>
        <button
          v-if="hiddenThumbnailCount"
          type="button"
          class="relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[var(--bookora-border)] bg-black disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          :aria-label="`Xem thêm ${hiddenThumbnailCount} ảnh`"
          @click="openLightbox"
        >
          <img
            :src="media[3]?.url"
            :alt="media[3]?.altText || `${productName} - ảnh 4`"
            class="size-full object-cover opacity-45"
          />
          <span class="absolute inset-0 grid place-items-center bg-black/35 text-lg font-semibold text-white">
            +{{ hiddenThumbnailCount }}
          </span>
        </button>
      </div>
      <div
        class="relative order-1 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-[var(--bookora-cream)] p-5 sm:order-2"
      >
        <Carousel
          class="size-full"
          :opts="carouselOptions"
          aria-label="Ảnh sản phẩm"
          @init-api="setCarouselApi"
        >
          <CarouselContent
            class="-ml-0 h-full"
            data-testid="product-gallery-track"
          >
            <CarouselItem
              v-for="(image, index) in media"
              :key="image.id"
              class="h-full pl-0"
              :aria-hidden="selectedIndex !== index"
            >
              <button
                type="button"
                class="relative isolate size-full cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
                :aria-label="`Phóng to ảnh ${index + 1} của ${productName}`"
                :tabindex="selectedIndex === index ? 0 : -1"
                @click="openLightbox"
              >
                <img
                  :src="image.url"
                  :alt="image.altText || `Bìa sách ${productName}`"
                  class="size-full object-contain drop-shadow-xl"
                />
              </button>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
        <Button
          type="button"
          size="sm"
          class="absolute bottom-3 right-3 cursor-pointer bg-black/65 text-white disabled:cursor-not-allowed hover:bg-black/80"
          @click="openLightbox"
          ><Maximize2 class="size-4" /> Phóng to</Button
        >
        <Button
          v-if="media.length > 1"
          type="button"
          size="icon"
          variant="outline"
          class="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-background/90 shadow-sm transition-[border-color,color,box-shadow] duration-180 disabled:cursor-not-allowed hover:border-[var(--bookora-green)]/50 hover:text-[var(--bookora-green)] hover:shadow"
          aria-label="Ảnh trước"
          @click="move(-1)"
          ><ChevronLeft class="size-4"
        /></Button>
        <Button
          v-if="media.length > 1"
          type="button"
          size="icon"
          variant="outline"
          class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-background/90 shadow-sm transition-[border-color,color,box-shadow] duration-180 disabled:cursor-not-allowed hover:border-[var(--bookora-green)]/50 hover:text-[var(--bookora-green)] hover:shadow"
          aria-label="Ảnh tiếp theo"
          @click="move(1)"
          ><ChevronRight class="size-4"
        /></Button>
      </div>
    </div>
    <div
      v-else
      class="grid aspect-[4/5] place-items-center rounded-xl border border-dashed bg-[var(--bookora-cream)] text-sm text-[var(--bookora-muted)]"
    >
      Chưa có hình ảnh sản phẩm
    </div>

    <VueEasyLightbox
      :visible="lightboxVisible"
      :imgs="lightboxImages"
      :index="selectedIndex"
      :loop="media.length > 1"
      @hide="lightboxVisible = false"
      @on-index-change="syncLightboxIndex"
    />
  </section>
</template>
