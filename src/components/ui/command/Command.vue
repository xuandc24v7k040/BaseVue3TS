<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="command" :class="cn('flex min-h-0 flex-col overflow-hidden', props.class)">
    <slot />
  </div>
</template>
