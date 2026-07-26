<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "@lucide/vue";
import { computed, ref, watch } from "vue";
import VueEasyLightbox from "vue-easy-lightbox";
import type { PublicProductMediaDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  media: PublicProductMediaDto[];
  productName: string;
}>();
const selectedIndex = ref(0);
const lightboxVisible = ref(false);
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
  () => {
    selectedIndex.value = 0;
    lightboxVisible.value = false;
  },
);

function move(direction: -1 | 1): void {
  if (!props.media.length) return;
  selectedIndex.value =
    (selectedIndex.value + direction + props.media.length) % props.media.length;
}

function openLightbox(): void {
  if (selected.value) lightboxVisible.value = true;
}

function syncLightboxIndex(_oldIndex: number, newIndex: number): void {
  if (newIndex >= 0 && newIndex < props.media.length) {
    selectedIndex.value = newIndex;
  }
}
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
          class="size-16 shrink-0 overflow-hidden rounded-lg border bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          :class="
            index === selectedIndex
              ? 'border-[var(--bookora-green)]'
              : 'border-[var(--bookora-border)]'
          "
          :aria-label="`Xem ảnh ${index + 1}`"
          @click="selectedIndex = index"
        >
          <img
            :src="image.url"
            :alt="image.altText || `${productName} - ảnh ${index + 1}`"
            class="size-full object-contain"
          />
        </button>
        <button
          v-if="hiddenThumbnailCount"
          type="button"
          class="relative size-16 shrink-0 overflow-hidden rounded-lg border border-[var(--bookora-border)] bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
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
        <button
          type="button"
          class="size-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          :aria-label="`Phóng to ảnh ${selectedIndex + 1} của ${productName}`"
          @click="openLightbox"
        >
          <img
            :src="selected.url"
            :alt="selected.altText || `Bìa sách ${productName}`"
            class="size-full object-contain drop-shadow-xl"
          />
        </button>
        <Button
          type="button"
          size="sm"
          class="absolute bottom-3 right-3 bg-black/65 text-white hover:bg-black/80"
          @click="openLightbox"
          ><Maximize2 class="size-4" /> Phóng to</Button
        >
        <Button
          v-if="media.length > 1"
          type="button"
          size="icon"
          variant="outline"
          class="absolute left-2 top-1/2 rounded-full bg-background/90"
          aria-label="Ảnh trước"
          @click="move(-1)"
          ><ChevronLeft class="size-4"
        /></Button>
        <Button
          v-if="media.length > 1"
          type="button"
          size="icon"
          variant="outline"
          class="absolute right-2 top-1/2 rounded-full bg-background/90"
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
