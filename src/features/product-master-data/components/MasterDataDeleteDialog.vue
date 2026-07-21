<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import { Button, buttonVariants } from '@/components/ui/button'

const props = defineProps<{
  open: boolean
  name: string
  title: string
  description: string
  pending?: boolean
  blockedReason?: string
}>()
const emit = defineEmits<{ 'update:open': [boolean]; confirm: [] }>()
function confirm(): void {
  if (props.pending || props.blockedReason) return
  emit('confirm')
}
</script>

<template>
  <AlertDialogRoot :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogPortal>
      <AlertDialogOverlay
        class="fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <AlertDialogContent
        class="pointer-events-auto fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div class="flex flex-col gap-2 text-center sm:text-left">
          <AlertDialogTitle class="text-lg font-semibold">
            {{ title }}
          </AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground">
            {{ blockedReason || description }}
            <span class="mt-2 block font-medium text-foreground">
              “{{ name }}”
            </span>
          </AlertDialogDescription>
        </div>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel
            type="button"
            :disabled="pending"
            :class="buttonVariants({ variant: 'outline' })"
          >
            {{ blockedReason ? 'Đóng' : 'Hủy' }}
          </AlertDialogCancel>
          <Button
            v-if="!blockedReason"
            type="button"
            variant="destructive"
            :disabled="pending"
            @click="confirm"
          >
            <LoaderCircle v-if="pending" class="mr-2 h-4 w-4 animate-spin" />
            Xóa
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
