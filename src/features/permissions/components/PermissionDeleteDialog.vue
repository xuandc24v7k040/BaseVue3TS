<script setup lang="ts">
import axios from 'axios'
import { computed, ref, watch } from 'vue'
import { LoaderCircle, TriangleAlert } from '@lucide/vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import type { ErrorResponseDto } from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deletePermission, getPermission } from '../api/permission-api'
import { permissionKeys } from '../api/permission-query-keys'
import type { Permission } from '../types'
import { isDangerousPermission } from '../utils/dangerous-permissions'

const props = defineProps<{ open: boolean; permission: Permission | null }>()
const emit = defineEmits<{ 'update:open': [open: boolean]; deleted: [] }>()
const queryClient = useQueryClient()
const isSubmitting = ref(false)
const errorMessage = ref('')
const detailQuery = useQuery({
  queryKey: computed(() => permissionKeys.detail(props.permission?.id ?? '')),
  queryFn: ({ signal }) => getPermission(props.permission!.id, signal),
  enabled: computed(() => props.open && Boolean(props.permission?.id)),
})
const detail = computed(() => detailQuery.data.value?.data)
const totalUsage = computed(() => {
  const count = detail.value?._count
  return count ? count.rolePermissions + count.userPermissions + count.userBranchPermissions : 0
})
const canDelete = computed(() => Boolean(detail.value) && totalUsage.value === 0 && !isDangerousPermission(detail.value!.code))
watch(() => props.open, () => { errorMessage.value = ''; isSubmitting.value = false })

async function confirm(): Promise<void> {
  if (!detail.value || !canDelete.value || isSubmitting.value) return
  isSubmitting.value = true; errorMessage.value = ''
  try {
    await deletePermission(detail.value.id)
    await queryClient.invalidateQueries({ queryKey: permissionKeys.lists() })
    queryClient.removeQueries({ queryKey: permissionKeys.detail(detail.value.id), exact: true })
    toast.success('Đã xóa quyền vĩnh viễn.')
    emit('deleted'); emit('update:open', false)
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (status === 409) await detailQuery.refetch()
    const fallback = status === 409 ? 'Quyền vừa được sử dụng nên không thể xóa.' : status === 403 ? 'Bạn không có quyền xóa quyền này.' : 'Không thể xóa quyền.'
    errorMessage.value = axios.isAxiosError<ErrorResponseDto>(error) ? error.response?.data.message || fallback : fallback
    toast.error(errorMessage.value)
  } finally { isSubmitting.value = false }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"><DialogContent class="max-w-lg"><DialogHeader><DialogTitle class="flex items-center gap-2"><TriangleAlert class="h-5 w-5 text-destructive" />Xóa quyền</DialogTitle><DialogDescription>Thao tác này xóa vĩnh viễn quyền khỏi hệ thống và không thể hoàn tác.</DialogDescription></DialogHeader>
    <div v-if="detailQuery.isFetching.value" class="flex min-h-32 items-center justify-center"><LoaderCircle class="h-6 w-6 animate-spin" /><span class="sr-only">Đang kiểm tra mức độ sử dụng</span></div>
    <div v-else-if="detailQuery.isError.value" class="space-y-3 text-sm"><p role="alert" class="text-destructive">Không thể kiểm tra mức độ sử dụng của quyền.</p><Button type="button" variant="outline" @click="detailQuery.refetch()">Thử lại</Button></div>
    <div v-else-if="detail" class="space-y-4 text-sm"><p>Bạn sắp xóa <strong>{{ detail.name }}</strong> (<code class="break-all">{{ detail.code }}</code>).</p><div class="grid grid-cols-1 gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3"><div><p class="text-muted-foreground">Vai trò</p><p class="text-lg font-semibold">{{ detail._count.rolePermissions }}</p></div><div><p class="text-muted-foreground">Người dùng</p><p class="text-lg font-semibold">{{ detail._count.userPermissions }}</p></div><div><p class="text-muted-foreground">Người dùng/chi nhánh</p><p class="text-lg font-semibold">{{ detail._count.userBranchPermissions }}</p></div></div><p v-if="totalUsage > 0" class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">Quyền đang được sử dụng nên không thể xóa.</p><p v-if="isDangerousPermission(detail.code)" class="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">Quyền nhạy cảm được hệ thống bảo vệ và không thể xóa.</p><p v-if="errorMessage" role="alert" class="text-destructive">{{ errorMessage }}</p></div>
    <DialogFooter class="flex-col-reverse sm:flex-row"><Button type="button" variant="outline" class="w-full sm:w-auto" :disabled="isSubmitting" @click="emit('update:open', false)">Hủy</Button><Button type="button" variant="destructive" class="w-full sm:w-auto" :disabled="isSubmitting || !canDelete" @click="confirm"><LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />Xóa vĩnh viễn</Button></DialogFooter>
  </DialogContent></Dialog>
</template>
