<script setup lang="ts">
import { computed } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type {
  ProductAttributeDefinition,
  ProductAttributeFormValue,
} from '../utils/product-attribute-values'

const props = defineProps<{
  attribute: ProductAttributeDefinition
  modelValue: ProductAttributeFormValue
}>()
const emit = defineEmits<{ 'update:modelValue': [ProductAttributeFormValue] }>()

const textValue = computed(() => {
  const value = props.modelValue
  return Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? '' : value
})

function updateText(value: string | number): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <label v-if="attribute.type === 'BOOLEAN'" class="flex h-9 items-center gap-2 text-sm">
    <Checkbox
      :model-value="modelValue === true"
      @update:model-value="emit('update:modelValue', $event === true)"
    />
    Có
  </label>
  <Input
    v-else
    :id="`attribute-${attribute.id}`"
    :model-value="textValue"
    :type="attribute.type === 'NUMBER' ? 'number' : attribute.type === 'DATE' ? 'date' : 'text'"
    :placeholder="attribute.type === 'MULTI_SELECT' ? 'Nhập các giá trị, phân cách bằng dấu phẩy' : `Nhập ${attribute.name.toLocaleLowerCase('vi')}`"
    @update:model-value="updateText($event)"
  />
</template>
