<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { ProgressIndicator, ProgressRoot } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    modelValue?: number;
    class?: HTMLAttributes["class"];
  }>(),
  { modelValue: 0 },
);
</script>

<template>
  <ProgressRoot
    data-slot="progress"
    :model-value="Math.min(100, Math.max(0, props.modelValue))"
    :class="
      cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-muted',
        props.class,
      )
    "
  >
    <ProgressIndicator
      data-slot="progress-indicator"
      class="h-full w-full flex-1 bg-[var(--bookora-green)] transition-transform"
      :style="{
        transform: `translateX(-${100 - Math.min(100, Math.max(0, props.modelValue))}%)`,
      }"
    />
  </ProgressRoot>
</template>
