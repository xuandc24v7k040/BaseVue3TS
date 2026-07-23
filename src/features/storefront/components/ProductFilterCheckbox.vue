<script setup lang="ts">
import { Checkbox } from "@/components/ui/checkbox";

defineProps<{
  id: string;
  checked: boolean;
  label: string;
  count?: number;
  disabled?: boolean;
}>();
const emit = defineEmits<{ change: [checked: boolean] }>();
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <Checkbox
      :id="id"
      :model-value="checked"
      :disabled="disabled"
      @update:model-value="(value) => emit('change', value === true)"
    />
    <label
      :for="id"
      class="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
    >
      <span class="min-w-0 flex-1 truncate">{{ label }}</span>
      <span
        v-if="count !== undefined"
        class="text-xs text-[var(--bookora-muted)]"
        >({{ count }})</span
      >
    </label>
  </div>
</template>
