<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Search } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: string
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div data-slot="command-input-wrapper" class="relative border-b p-2">
    <Search class="pointer-events-none absolute left-5 top-4 size-4 text-muted-foreground" />
    <Input
      :model-value="props.modelValue"
      data-slot="command-input"
      :class="cn('pl-9', props.class)"
      v-bind="$attrs"
      @update:model-value="emit('update:modelValue', String($event))"
    />
  </div>
</template>
