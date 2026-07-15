<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { LoaderCircle, TriangleAlert } from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import type { ErrorResponseDto } from '@/api/generated/models'
import { authKeys } from '@/api/keys/auth.key'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth.store'
import { deactivateBranch } from '../api/branch-api'
import { branchKeys } from '../api/branch-query-keys'
import type { Branch } from '../types'

const props = defineProps<{ open: boolean; branch: Branch | null }>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  deactivated: []
}>()

const queryClient = useQueryClient()
const authStore = useAuthStore()
const isSubmitting = ref(false)
const errorMessage = ref('')

async function confirm(): Promise<void> {
  if (!props.branch || isSubmitting.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    await deactivateBranch(props.branch.id)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(null, props.branch.id) }),
      queryClient.invalidateQueries({ queryKey: branchKeys.options() }),
      queryClient.invalidateQueries({ queryKey: authKeys.me }),
      authStore.refreshCurrentUser(),
    ])
    toast.success('Chi nhánh đã ngừng hoạt động.')
    emit('deactivated')
    emit('update:open', false)
  } catch (error) {
    errorMessage.value = axios.isAxiosError<ErrorResponseDto>(error)
      ? error.response?.data.message || 'Không thể ngừng hoạt động chi nhánh.'
      : 'Không thể ngừng hoạt động chi nhánh.'
    toast.error(errorMessage.value)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <TriangleAlert class="h-5 w-5 text-destructive" />
          Ngừng hoạt động chi nhánh
        </DialogTitle>
        <DialogDescription>
          Thao tác này không xóa dữ liệu vật lý và hiện không có API kích hoạt lại.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3 text-sm">
        <p>Bạn sắp ngừng hoạt động <strong>{{ branch?.name }}</strong>.</p>
        <p class="rounded-lg border bg-muted/40 p-3 text-muted-foreground">
          Backend có thể từ chối nếu chi nhánh vẫn còn phân công nhân sự đang hoạt động.
        </p>
        <p v-if="errorMessage" role="alert" class="text-destructive">{{ errorMessage }}</p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" :disabled="isSubmitting" @click="emit('update:open', false)">Hủy</Button>
        <Button type="button" variant="destructive" :disabled="isSubmitting" @click="confirm">
          <LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
          Ngừng hoạt động
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
