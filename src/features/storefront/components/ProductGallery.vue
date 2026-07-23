<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  X,
} from "@lucide/vue";
import { computed, ref, watch } from "vue";
import type { PublicProductMediaDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const props = defineProps<{
  media: PublicProductMediaDto[];
  productName: string;
}>();
const selectedIndex = ref(0);
const previewOpen = ref(false);
const zoom = ref(1);
const touchStartX = ref<number | null>(null);
const selected = computed(() => props.media[selectedIndex.value] ?? null);

watch(
  () => props.media.map((item) => item.id).join(","),
  () => {
    selectedIndex.value = 0;
    zoom.value = 1;
  },
);
watch(previewOpen, (open) => {
  if (!open) zoom.value = 1;
});

function move(direction: -1 | 1): void {
  if (!props.media.length) return;
  selectedIndex.value =
    (selectedIndex.value + direction + props.media.length) % props.media.length;
  zoom.value = 1;
}

function finishSwipe(event: TouchEvent): void {
  const end = event.changedTouches[0]?.clientX;
  if (touchStartX.value === null || end === undefined) return;
  const distance = end - touchStartX.value;
  if (Math.abs(distance) > 48) move(distance > 0 ? -1 : 1);
  touchStartX.value = null;
}
</script>

<template>
  <section aria-label="Bộ sưu tập ảnh sản phẩm" class="min-w-0">
    <div v-if="selected" class="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)]">
      <div
        class="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col sm:overflow-y-auto"
      >
        <button
          v-for="(image, index) in media"
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
      </div>
      <div
        class="relative order-1 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-[var(--bookora-cream)] p-5 sm:order-2"
      >
        <img
          :src="selected.url"
          :alt="selected.altText || `Bìa sách ${productName}`"
          class="size-full object-contain drop-shadow-xl"
        />
        <Button
          type="button"
          size="sm"
          class="absolute bottom-3 right-3 bg-black/65 text-white hover:bg-black/80"
          @click="previewOpen = true"
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

    <Dialog v-model:open="previewOpen">
      <DialogContent
        class="bookora-client-theme h-[min(92svh,900px)] max-w-[min(94vw,1100px)] overflow-hidden border-0 bg-black/95 p-0 text-white"
        @keydown.left.prevent="move(-1)"
        @keydown.right.prevent="move(1)"
      >
        <DialogTitle class="sr-only">Xem ảnh {{ productName }}</DialogTitle
        ><DialogDescription class="sr-only"
          >Dùng phím mũi tên để chuyển ảnh, Escape để đóng.</DialogDescription
        >
        <div class="absolute right-3 top-3 z-20 flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Thu nhỏ"
            :disabled="zoom <= 1"
            @click="zoom = Math.max(1, zoom - 0.25)"
            ><Minus /></Button
          ><Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Phóng to"
            :disabled="zoom >= 3"
            @click="zoom = Math.min(3, zoom + 0.25)"
            ><Plus /></Button
          ><Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Đóng xem ảnh"
            @click="previewOpen = false"
            ><X
          /></Button>
        </div>
        <div
          class="flex size-full items-center justify-center overflow-auto p-8"
          @touchstart="touchStartX = $event.touches[0]?.clientX ?? null"
          @touchend="finishSwipe"
        >
          <img
            v-if="selected"
            :src="selected.url"
            :alt="selected.altText || productName"
            class="max-h-full max-w-full object-contain transition-transform"
            :style="{ transform: `scale(${zoom})` }"
          />
        </div>
        <Button
          v-if="media.length > 1"
          type="button"
          size="icon"
          variant="secondary"
          class="absolute left-3 top-1/2 z-20 rounded-full"
          aria-label="Ảnh trước"
          @click="move(-1)"
          ><ChevronLeft /></Button
        ><Button
          v-if="media.length > 1"
          type="button"
          size="icon"
          variant="secondary"
          class="absolute right-3 top-1/2 z-20 rounded-full"
          aria-label="Ảnh tiếp theo"
          @click="move(1)"
          ><ChevronRight
        /></Button>
      </DialogContent>
    </Dialog>
  </section>
</template>
