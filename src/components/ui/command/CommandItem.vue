<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  selected?: boolean
  active?: boolean
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <button
    type="button"
    role="option"
    data-slot="command-item"
    :aria-selected="selected"
    :disabled="disabled"
    :class="cn(
      'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
      active && 'bg-muted',
      props.class,
    )"
  >
    <slot />
  </button>
</template>
