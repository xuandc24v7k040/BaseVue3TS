<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { LoaderCircle, TriangleAlert } from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import type { ErrorResponseDto } from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deactivateRole } from '../api/role-api'
import { roleKeys } from '../api/role-query-keys'
import type { Role } from '../types'

const props = defineProps<{ open: boolean; role: Role | null }>()
const emit = defineEmits<{ 'update:open': [open: boolean]; deactivated: [] }>()
const queryClient = useQueryClient()
const isSubmitting = ref(false)
const errorMessage = ref('')

async function confirm(): Promise<void> {
  if (!props.role || props.role.isSystem || !props.role.isActive || isSubmitting.value) return
  isSubmitting.value = true; errorMessage.value = ''
  try {
    await deactivateRole(props.role.id)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(props.role.id) }),
    ])
    toast.success('Vai trò đã ngừng hoạt động.')
    emit('deactivated'); emit('update:open', false)
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    const fallback = status === 409 ? 'Vai trò đang được bảo vệ hoặc đang được sử dụng.' : status === 403 ? 'Bạn không có quyền ngừng hoạt động vai trò này.' : 'Không thể ngừng hoạt động vai trò.'
    errorMessage.value = axios.isAxiosError<ErrorResponseDto>(error) ? error.response?.data.message || fallback : fallback
    toast.error(errorMessage.value)
  } finally { isSubmitting.value = false }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"><DialogContent class="max-w-lg"><DialogHeader><DialogTitle class="flex items-center gap-2"><TriangleAlert class="h-5 w-5 text-destructive" />Ngừng hoạt động vai trò</DialogTitle><DialogDescription>Thao tác này không xóa dữ liệu vật lý và hiện không có API kích hoạt lại.</DialogDescription></DialogHeader><div class="space-y-3 text-sm"><p>Bạn sắp ngừng hoạt động <strong>{{ role?.name }}</strong>.</p><p class="rounded-lg border bg-muted/40 p-3 text-muted-foreground">Vai trò hệ thống được bảo vệ và không thể ngừng hoạt động.</p><p v-if="errorMessage" role="alert" class="text-destructive">{{ errorMessage }}</p></div><DialogFooter><Button type="button" variant="outline" :disabled="isSubmitting" @click="emit('update:open', false)">Hủy</Button><Button type="button" variant="destructive" :disabled="isSubmitting || Boolean(role?.isSystem) || !role?.isActive" @click="confirm"><LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />Ngừng hoạt động</Button></DialogFooter></DialogContent></Dialog>
</template>
