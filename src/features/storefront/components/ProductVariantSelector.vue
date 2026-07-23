<script setup lang="ts">
import { computed } from 'vue'
import type { PublicOptionDto, PublicVariantDto } from '@/api/generated/models'

const props = defineProps<{
  options: PublicOptionDto[]
  variants: PublicVariantDto[]
  modelValue: string
}>()
const emit = defineEmits<{ 'update:modelValue': [variantId: string] }>()

const selected = computed(() => props.variants.find(variant => variant.id === props.modelValue) ?? null)
const selectedValues = computed(() => new Map(
  (selected.value?.optionValues ?? []).map(item => [item.optionId, item.optionValueId]),
))

function candidate(optionId: string, optionValueId: string): PublicVariantDto | undefined {
  return props.variants.find(variant => {
    const values = new Map(variant.optionValues.map(item => [item.optionId, item.optionValueId]))
    if (values.get(optionId) !== optionValueId) return false
    return props.options.every(option => {
      if (option.id === optionId) return true
      const selectedValue = selectedValues.value.get(option.id)
      return !selectedValue || values.get(option.id) === selectedValue
    })
  })
}

function choose(optionId: string, optionValueId: string): void {
  const variant = candidate(optionId, optionValueId)
  if (variant) emit('update:modelValue', variant.id)
}
</script>

<template>
  <div v-if="options.length" class="space-y-4">
    <fieldset v-for="option in options" :key="option.id">
      <legend class="mb-2 text-sm font-semibold">{{ option.name }}</legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="value in option.values"
          :key="value.id"
          type="button"
          :disabled="!candidate(option.id, value.id)"
          :aria-pressed="selectedValues.get(option.id) === value.id"
          :title="!candidate(option.id, value.id) ? 'Tổ hợp phiên bản này hiện không khả dụng' : undefined"
          class="min-h-11 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] disabled:cursor-not-allowed disabled:opacity-40"
          :class="selectedValues.get(option.id) === value.id ? 'border-[var(--bookora-green)] bg-[var(--bookora-soft)] text-[var(--bookora-green)]' : 'border-[var(--bookora-border)] bg-background hover:border-[var(--bookora-green)]'"
          @click="choose(option.id, value.id)"
        >
          <span v-if="option.presentationType === 'COLOR' && value.colorCode" class="mr-2 inline-block size-4 rounded-full border align-[-3px]" :style="{ backgroundColor: value.colorCode }" />
          <img v-else-if="option.presentationType === 'IMAGE' && value.imageUrl" :src="value.imageUrl" alt="" class="mr-2 inline-block size-7 rounded object-cover align-middle">
          {{ value.label }}
        </button>
      </div>
    </fieldset>
  </div>
</template>
