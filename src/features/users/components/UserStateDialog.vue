<script setup lang="ts">
import { ref, watch } from 'vue'
import { LoaderCircle, LockKeyhole, RotateCcw } from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { activateUser, disableUser } from '../api/user-api'
import { userKeys } from '../api/user-query-keys'
import type { User } from '../types'
import { userBusinessErrorMessage } from '../utils/user-errors'

const props = defineProps<{ open: boolean; mode: 'disable' | 'activate'; user: User | null }>()
const emit = defineEmits<{ 'update:open': [open: boolean]; changed: [user: User] }>()
const queryClient = useQueryClient()
const isSubmitting = ref(false)
const errorMessage = ref('')

watch(() => [props.open, props.mode, props.user?.id], () => { errorMessage.value = ''; isSubmitting.value = false })

async function confirm(): Promise<void> {
  if (!props.user || isSubmitting.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const response = props.mode === 'disable' ? await disableUser(props.user.id) : await activateUser(props.user.id)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: userKeys.detail(props.user.id) }),
    ])
    toast.success(props.mode === 'disable' ? 'Đã khóa tài khoản.' : 'Đã kích hoạt tài khoản. Người dùng cần đăng nhập lại.')
    emit('changed', response.data)
    emit('update:open', false)
  } catch (error) {
    errorMessage.value = userBusinessErrorMessage(
      error,
      props.mode === 'disable' ? 'Không thể khóa tài khoản.' : 'Không thể kích hoạt tài khoản.',
    )
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2"><LockKeyhole v-if="mode === 'disable'" class="h-5 w-5 text-destructive" /><RotateCcw v-else class="h-5 w-5" />{{ mode === 'disable' ? 'Khóa tài khoản' : 'Kích hoạt tài khoản' }}</DialogTitle>
        <DialogDescription>{{ mode === 'disable' ? 'Tài khoản sẽ không thể đăng nhập và các phiên đang hoạt động sẽ bị thu hồi. Dữ liệu người dùng không bị xóa.' : 'Kích hoạt không khôi phục phiên cũ, vai trò hoặc phân công chi nhánh. Người dùng phải đăng nhập lại.' }}</DialogDescription>
      </DialogHeader>
      <div class="space-y-3 text-sm">
        <p>Bạn đang thao tác với <strong>{{ user?.fullName || user?.email }}</strong>.</p>
        <p v-if="mode === 'activate' && user?.type === 'BRANCH'" class="rounded-lg border bg-muted/40 p-3 text-muted-foreground">Tài khoản nội bộ chỉ được kích hoạt khi có phân công hợp lệ tại chi nhánh đang hoạt động và đúng một chi nhánh chính.</p>
        <p v-if="errorMessage" role="alert" class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">{{ errorMessage }}</p>
      </div>
      <DialogFooter><Button type="button" variant="outline" :disabled="isSubmitting" @click="emit('update:open', false)">Hủy</Button><Button type="button" :variant="mode === 'disable' ? 'destructive' : 'default'" :disabled="isSubmitting" @click="confirm"><LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />{{ mode === 'disable' ? 'Khóa tài khoản' : 'Kích hoạt' }}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
</template>
