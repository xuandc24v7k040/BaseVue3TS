<script setup lang="ts">
import { AlertCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'

interface DataTableStateOverlayProps {
  isLoading?: boolean
  isRefetching?: boolean
  error?: Error | string | null
}

withDefaults(defineProps<DataTableStateOverlayProps>(), {
  isLoading: false,
  isRefetching: false,
  error: null,
})

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="error"
      class="absolute inset-0 z-50 flex items-center justify-center bg-background p-6"
      role="alert"
      aria-live="assertive"
    >
      <div class="max-w-md space-y-4 text-center">
        <slot name="error" :error="error" :retry="() => emit('retry')">
          <div
            class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10"
          >
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
  </Transition>

  <Transition name="fade">
    <div
      v-if="isLoading || isRefetching"
      class="pointer-events-none absolute inset-0 z-40"
      role="status"
      aria-live="polite"
      :aria-label="isRefetching ? 'Đang cập nhật dữ liệu' : 'Đang tải dữ liệu'"
    >
      <div class="absolute inset-x-0 top-0 h-1 overflow-hidden bg-primary/10">
        <div class="data-table-progress h-full w-1/3 bg-primary/70" />
      </div>

      <span class="sr-only">{{ isRefetching ? 'Đang cập nhật dữ liệu' : 'Đang tải dữ liệu' }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.data-table-progress {
  animation: data-table-progress 1.2s ease-in-out infinite;
  transform-origin: left center;
}

@keyframes data-table-progress {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(320%);
  }
}
</style>
