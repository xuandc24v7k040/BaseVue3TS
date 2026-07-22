<script setup lang="ts">
import { ref } from 'vue'
import { Trash2 } from '@lucide/vue'
import type { ProductAttributeResponseDto } from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import ProductAttributeFormDialog from '@/features/product-attributes/components/ProductAttributeFormDialog.vue'
import type {
  ProductAttributeDefinition,
  ProductAttributeFormValue,
} from '../utils/product-attribute-values'
import ProductAttributeSelector from './ProductAttributeSelector.vue'
import ProductAttributeValueField from './ProductAttributeValueField.vue'

defineProps<{
  selected: ProductAttributeDefinition[]
  values: Record<string, ProductAttributeFormValue>
}>()
const emit = defineEmits<{
  select: [ProductAttributeDefinition]
  remove: [string]
  'update:value': [string, ProductAttributeFormValue]
}>()
const quickCreateOpen = ref(false)

function created(attribute: ProductAttributeResponseDto): void {
  emit('select', attribute)
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="selected.length === 0" class="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
      Chưa thêm thuộc tính mô tả nào.
    </p>
    <div v-else class="grid gap-3 md:grid-cols-2">
      <div v-for="attribute in selected" :key="attribute.id" class="min-w-0 rounded-lg border p-3">
        <div class="mb-2 flex items-start justify-between gap-2">
          <Label :for="attribute.type === 'BOOLEAN' ? undefined : `attribute-${attribute.id}`" class="min-w-0 break-words">
            {{ attribute.name }}
          </Label>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            :aria-label="`Xóa thuộc tính ${attribute.name} khỏi sản phẩm`"
            @click="emit('remove', attribute.id)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
        <ProductAttributeValueField
          :attribute="attribute"
          :model-value="values[attribute.id]!"
          @update:model-value="emit('update:value', attribute.id, $event)"
        />
      </div>
    </div>
    <ProductAttributeSelector
      :selected-ids="selected.map((attribute) => attribute.id)"
      @select="emit('select', $event)"
      @create="quickCreateOpen = true"
    />
    <ProductAttributeFormDialog
      :open="quickCreateOpen"
      mode="create"
      :attribute="null"
      @update:open="quickCreateOpen = $event"
      @saved="created"
    />
  </div>
</template>
