<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatVndInput, normalizeVndInput } from '../utils/product-money'

const props = withDefaults(defineProps<{
  modelValue: string
  id?: string
  disabled?: boolean
  error?: string
  placeholder?: string
}>(), { disabled: false, error: '', placeholder: '0' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const focused = ref(false)
const displayValue = computed(() => focused.value ? props.modelValue : formatVndInput(props.modelValue))

function onInput(event: Event) {
  emit('update:modelValue', normalizeVndInput((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="space-y-1">
    <div class="relative">
      <input
        :id="id"
        :value="displayValue"
        :disabled="disabled"
        :placeholder="placeholder"
        inputmode="numeric"
        autocomplete="off"
        class="h-10 w-full rounded-md border bg-background px-3 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        :class="error ? 'border-destructive' : 'border-input'"
        @focus="focused = true"
        @blur="focused = false"
        @input="onInput"
      >
      <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">₫</span>
    </div>
    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
  </div>
</template>
