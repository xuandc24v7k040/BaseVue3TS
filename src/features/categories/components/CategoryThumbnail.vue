<script setup lang="ts">
import { ref } from "vue";
import { Eye, ImageIcon } from "@lucide/vue";
import ImagePreviewDialog from "@/components/shared/ImagePreviewDialog.vue";

defineProps<{ src: string | null; alt: string }>();
const previewOpen = ref(false);
</script>

<template>
  <button
    v-if="src"
    type="button"
    class="group relative h-10 w-10 shrink-0 overflow-hidden rounded border"
    :aria-label="`Xem ảnh ${alt}`"
    @click="previewOpen = true"
  >
    <img :src="src" :alt="alt" class="h-full w-full object-cover" />
    <span class="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><Eye class="h-4 w-4 text-white" /></span>
  </button>
  <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground"><ImageIcon class="h-4 w-4" /></span>
  <ImagePreviewDialog v-if="src" v-model:open="previewOpen" :src="src" :alt="alt" />
</template>
