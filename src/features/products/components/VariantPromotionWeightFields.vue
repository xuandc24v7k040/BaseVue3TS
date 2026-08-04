<script setup lang="ts">
import { Input } from "@/components/ui/input";
import VariantWeightField from "./VariantWeightField.vue";

withDefaults(
  defineProps<{
    idPrefix: string;
    salePrice: string;
    saleStartAt: string;
    saleEndAt: string;
    weightGram: string;
    weightError?: string;
    showWeightHelper?: boolean;
  }>(),
  {
    weightError: undefined,
    showWeightHelper: true,
  },
);

const emit = defineEmits<{
  "update:saleStartAt": [string];
  "update:saleEndAt": [string];
  "update:weight": [string];
}>();
</script>

<template>
  <div class="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
    <label
      v-if="salePrice"
      class="min-w-0 space-y-1 text-xs text-muted-foreground"
    >
      Bắt đầu khuyến mãi
      <Input
        :id="`${idPrefix}-saleStartAt`"
        :model-value="saleStartAt"
        type="datetime-local"
        @update:model-value="emit('update:saleStartAt', String($event))"
      />
    </label>
    <label
      v-if="salePrice"
      class="min-w-0 space-y-1 text-xs text-muted-foreground"
    >
      Kết thúc khuyến mãi
      <Input
        :id="`${idPrefix}-saleEndAt`"
        :model-value="saleEndAt"
        type="datetime-local"
        @update:model-value="emit('update:saleEndAt', String($event))"
      />
    </label>
    <VariantWeightField
      class="min-w-0"
      :id="`${idPrefix}-weightGram`"
      :model-value="weightGram"
      :error="weightError"
      :show-helper="showWeightHelper"
      compact-label
      @update:model-value="emit('update:weight', $event)"
    />
  </div>
</template>
