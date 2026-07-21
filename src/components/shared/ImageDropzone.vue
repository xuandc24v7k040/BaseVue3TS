<script setup lang="ts">
import { ImagePlus, Trash2, UploadCloud } from "@lucide/vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Button } from "@/components/ui/button";

const props = withDefaults(
  defineProps<{
    modelValue: File | null;
    currentUrl?: string | null;
    disabled?: boolean;
    imageAlt?: string;
  }>(),
  { currentUrl: null, disabled: false, imageAlt: "Ảnh đã chọn" },
);
const emit = defineEmits<{
  "update:modelValue": [file: File | null];
  remove: [];
  invalid: [message: string];
  valid: [];
}>();
const input = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isValidating = ref(false);
const previewUrl = ref<string | null>(null);
const shownUrl = computed(() => previewUrl.value ?? props.currentUrl);
const allowedTypes = new Map([
  ["image/jpeg", new Set(["jpg", "jpeg"])],
  ["image/png", new Set(["png"])],
  ["image/webp", new Set(["webp"])],
]);

function revoke(): void {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
}
watch(
  () => props.modelValue,
  (file) => {
    revoke();
    if (file) previewUrl.value = URL.createObjectURL(file);
  },
  { immediate: true },
);
onBeforeUnmount(revoke);

function resetInput(): void {
  if (input.value) input.value.value = "";
}

function invalid(message: string): void {
  emit("invalid", message);
  resetInput();
}

async function canDecode(file: File): Promise<boolean> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const valid = bitmap.width > 0 && bitmap.height > 0;
      bitmap.close();
      return valid;
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(false);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(false);
      image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function accept(files: FileList | null): Promise<void> {
  if (!files?.length || props.disabled || isValidating.value) return;
  if (files.length !== 1) {
    invalid("Chỉ được chọn một ảnh mỗi lần.");
    return;
  }

  const file = files[0];
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("vi") ?? "";
  const extensions = allowedTypes.get(file.type);
  if (!extensions?.has(extension)) {
    invalid("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    invalid("Ảnh không được vượt quá 5 MB.");
    return;
  }

  isValidating.value = true;
  const decodable = await canDecode(file);
  isValidating.value = false;
  if (!decodable) {
    invalid("Không thể đọc ảnh đã chọn. Vui lòng chọn tệp ảnh khác.");
    return;
  }

  emit("valid");
  emit("update:modelValue", file);
  resetInput();
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="shownUrl"
      class="relative overflow-hidden rounded-lg border bg-muted/30"
    >
      <img
        :src="shownUrl"
        :alt="imageAlt"
        class="h-44 w-full object-cover"
      /><Button
        type="button"
        size="sm"
        variant="destructive"
        class="absolute right-2 top-2"
        :disabled="disabled || isValidating"
        @click="modelValue ? emit('update:modelValue', null) : emit('remove')"
        ><Trash2 class="mr-2 h-4 w-4" />Xóa ảnh</Button
      >
    </div>
    <button
      type="button"
      class="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 py-8 text-center transition-colors hover:bg-muted/40"
      :class="
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25'
      "
        :disabled="disabled || isValidating"
      @click="input?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="
        isDragging = false;
        accept($event.dataTransfer?.files ?? null);
      "
    >
      <UploadCloud class="mb-3 h-8 w-8 text-muted-foreground" /><span
        class="font-medium"
        >Kéo thả ảnh hoặc bấm để chọn</span
      ><span class="mt-1 text-xs text-muted-foreground"
        >JPEG, PNG hoặc WebP · tối đa 5 MB</span
      >
    </button>
    <input
      ref="input"
      type="file"
      class="sr-only"
      accept="image/jpeg,image/png,image/webp"
      @change="accept(($event.target as HTMLInputElement).files)"
    />
    <p
      v-if="modelValue"
      class="flex items-center gap-2 truncate text-sm text-muted-foreground"
    >
      <ImagePlus class="h-4 w-4" />{{ modelValue.name }}
    </p>
  </div>
</template>
