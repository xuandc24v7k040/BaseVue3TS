<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

withDefaults(
  defineProps<{
    id: string;
    modelValue: string;
    error?: string;
    showLabel?: boolean;
    showHelper?: boolean;
    compactLabel?: boolean;
  }>(),
  {
    error: "",
    showLabel: true,
    showHelper: true,
    compactLabel: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [string];
}>();

function update(value: string | number): void {
  emit("update:modelValue", String(value));
}

function blockInvalidKey(event: KeyboardEvent): void {
  if (["-", "+", ".", ",", "e", "E"].includes(event.key))
    event.preventDefault();
}
</script>

<template>
  <div
    class="min-w-0"
    :class="compactLabel ? 'space-y-0' : 'space-y-1.5'"
  >
    <Label
      v-if="showLabel"
      :for="id"
      :class="
        compactLabel
          ? 'text-xs font-normal leading-4 text-muted-foreground'
          : undefined
      "
    >
      Trọng lượng <span class="text-destructive" aria-hidden="true">*</span>
    </Label>
    <div class="relative">
      <Input
        :id="id"
        :model-value="modelValue"
        type="number"
        min="1"
        max="100000"
        step="1"
        inputmode="numeric"
        placeholder="Ví dụ 350"
        class="pr-9"
        :class="
          error ? 'border-destructive focus-visible:ring-destructive' : ''
        "
        :aria-invalid="Boolean(error)"
        :aria-describedby="
          error ? `${id}-error` : showHelper ? `${id}-helper` : undefined
        "
        @keydown="blockInvalidKey"
        @update:model-value="update"
      />
      <span
        class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
        >g</span
      >
    </div>
    <p v-if="error" :id="`${id}-error`" class="text-xs text-destructive">
      {{ error }}
    </p>
    <p
      v-else-if="showHelper"
      :id="`${id}-helper`"
      class="text-xs text-muted-foreground"
    >
      Nhập trọng lượng thực của một cuốn sách, bao gồm ruột sách và bìa.
    </p>
  </div>
</template>
