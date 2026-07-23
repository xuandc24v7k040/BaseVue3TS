<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div
    role="alert"
    data-slot="alert"
    :class="
      cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
        $props.class,
      )
    "
  >
    <slot />
  </div>
</template>
