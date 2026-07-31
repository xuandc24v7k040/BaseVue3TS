<script setup lang="ts">
import { ref, watch } from "vue";
import { Package } from "@lucide/vue";

const props = defineProps<{
  src?: string | null;
  alt: string;
}>();

const failed = ref(false);

watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <div
    class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/60"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      class="size-full object-cover"
      loading="lazy"
      @error="failed = true"
    />
    <Package v-else class="size-5 text-muted-foreground" aria-hidden="true" />
  </div>
</template>

