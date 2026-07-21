<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
withDefaults(defineProps<{ open: boolean; src: string; alt: string; title?: string }>(), {
  title: "Xem ảnh",
});
const emit = defineEmits<{ "update:open": [open: boolean] }>();
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"
    ><DialogContent class="max-w-3xl"
      ><DialogHeader
        ><DialogTitle>{{ title }}</DialogTitle
        ><DialogDescription>{{ alt }}</DialogDescription></DialogHeader
      ><img
        :src="src"
        :alt="alt"
        class="max-h-[70dvh] w-full rounded-lg object-contain" /></DialogContent
  ></Dialog>
</template>
