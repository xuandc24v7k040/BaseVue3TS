<script setup lang="ts">
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface DataTableStateOverlayProps {
  isLoading?: boolean
  error?: Error | string | null
}

withDefaults(defineProps<DataTableStateOverlayProps>(), {
  isLoading: false,
  error: null,
})

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div
    v-if="error"
    class="absolute inset-0 z-50 flex items-center justify-center bg-background p-6"
    role="alert"
    aria-live="assertive"
  >
    <div class="max-w-md space-y-4 text-center">
      <slot name="error" :error="error" :retry="() => emit('retry')">
        <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle class="h-5 w-5 text-destructive" />
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold text-foreground">Có lỗi xảy ra</h3>
          <p class="text-sm text-muted-foreground">
            {{ typeof error === 'string' ? error : error.message }}
          </p>
        </div>
        <slot name="error-actions">
          <Button size="sm" @click="emit('retry')">Thử lại</Button>
        </slot>
      </slot>
    </div>
  </div>

  <div
    v-else-if="isLoading"
    class="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    role="status"
    aria-live="polite"
    aria-label="Đang tải dữ liệu"
  >
    <slot name="loading">
      <div class="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
        <Loader2 class="h-4 w-4 animate-spin text-primary" />
        <span>Đang tải...</span>
      </div>
    </slot>
  </div>
</template>
