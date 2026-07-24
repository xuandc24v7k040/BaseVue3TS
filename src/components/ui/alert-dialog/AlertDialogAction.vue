<script setup lang="ts">
import type { AlertDialogActionProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogAction } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<
  AlertDialogActionProps & { class?: HTMLAttributes["class"] }
>();
const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <AlertDialogAction
    v-bind="delegatedProps"
    :class="
      cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </AlertDialogAction>
</template>
