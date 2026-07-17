<script setup lang="ts">
import { ChevronRight, LockKeyhole, ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'

defineProps<{
  selectedCount: number
  loading: boolean
  error: boolean
  readOnly: boolean
  disabled?: boolean
}>()
defineEmits<{ open: [] }>()
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm font-medium">Quyền hạn</span>
      <span v-if="readOnly" class="inline-flex items-center gap-1 text-xs text-muted-foreground"><LockKeyhole class="h-3.5 w-3.5" />Chỉ đọc</span>
    </div>
    <Button
      type="button"
      variant="outline"
      class="h-auto min-h-12 w-full justify-start whitespace-normal px-3 py-2 text-left"
      aria-haspopup="dialog"
      :disabled="disabled"
      @click="$emit('open')"
    >
      <ShieldCheck class="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
      <span class="min-w-0 flex-1">
        <span v-if="loading" class="block text-sm text-muted-foreground">Đang tải quyền hạn...</span>
        <span v-else-if="error" class="block text-sm text-destructive">Không thể tải quyền hạn. Mở để thử lại.</span>
        <span v-else-if="selectedCount" class="block text-sm">Đã chọn {{ selectedCount }} quyền</span>
        <span v-else class="block text-sm text-muted-foreground">Chưa chọn quyền nào</span>
        <span class="mt-0.5 block text-xs text-muted-foreground">Chọn quyền hạn cho vai trò</span>
      </span>
      <ChevronRight class="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
    </Button>
  </div>
</template>
