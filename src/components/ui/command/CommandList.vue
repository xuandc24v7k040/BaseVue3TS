<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <ScrollArea data-slot="command-list" :class="cn('h-64', props.class)">
    <div role="listbox" class="space-y-1 p-2 pr-4">
      <slot />
    </div>
  </ScrollArea>
</template>
