<script setup lang="ts">
import type { RadioGroupItemEmits, RadioGroupItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import {
  RadioGroupIndicator,
  RadioGroupItem,
  useForwardPropsEmits,
} from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<
  RadioGroupItemProps & { class?: HTMLAttributes["class"] }
>();
const emits = defineEmits<RadioGroupItemEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <RadioGroupItem
    data-slot="radio-group-item"
    :class="
      cn(
        'border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive size-4 shrink-0 rounded-full border shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    v-bind="forwarded"
  >
    <RadioGroupIndicator
      data-slot="radio-group-indicator"
      class="relative grid size-full place-content-center after:block after:size-2 after:rounded-full after:bg-current"
    />
  </RadioGroupItem>
</template>
