<script setup lang="ts">
import axios from 'axios'
import { computed, ref } from 'vue'
import { Pencil, RefreshCcw, ShieldAlert, Trash2 } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getPermission } from '../api/permission-api'
import { permissionKeys } from '../api/permission-query-keys'
import PermissionDeleteDialog from '../components/PermissionDeleteDialog.vue'
import PermissionFormDialog from '../components/PermissionFormDialog.vue'
import { formatPermissionDate } from '../components/permission-columns'
import { isDangerousPermission } from '../utils/dangerous-permissions'
import { formatPermissionAction, formatPermissionLabel, formatPermissionResource } from '../utils/permission-labels'

const route = useRoute(); const router = useRouter(); const id = computed(() => String(route.params.id ?? ''))
const query = useQuery({ queryKey: computed(() => permissionKeys.detail(id.value)), queryFn: ({ signal }) => getPermission(id.value, signal), enabled: computed(() => Boolean(id.value)) })
const permission = computed(() => query.data.value?.data)
const status = computed(() => axios.isAxiosError(query.error.value) ? query.error.value.response?.status : undefined)
const totalUsage = computed(() => permission.value ? permission.value._count.rolePermissions + permission.value._count.userPermissions + permission.value._count.userBranchPermissions : 0)
const dangerous = computed(() => Boolean(permission.value && isDangerousPermission(permission.value.code)))
const editOpen = ref(false); const deleteOpen = ref(false)
</script>

<template>
  <section class="space-y-6"><AdminBreadcrumb group-label="Tổ chức & phân quyền" :group-to="{ name: 'super-admin-branches' }" section-label="Quyền" :section-to="{ name: 'super-admin-permissions' }" :current-label="permission ? formatPermissionLabel(permission) : undefined" :loading="query.isPending.value" />
    <div v-if="query.isPending.value" class="space-y-4"><Skeleton class="h-10 w-64" /><Skeleton class="h-48 w-full" /><Skeleton class="h-40 w-full" /></div>
    <div v-else-if="query.isError.value" class="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"><h1 class="text-xl font-semibold">{{ status === 404 ? 'Không tìm thấy quyền' : status === 403 ? 'Bạn không có quyền xem quyền này' : 'Không thể tải thông tin quyền' }}</h1><p class="mt-2 text-sm text-muted-foreground">Vui lòng thử lại hoặc quay về danh sách.</p><div class="mt-4 flex justify-center gap-2"><Button v-if="status !== 404 && status !== 403" type="button" variant="outline" @click="query.refetch()"><RefreshCcw class="mr-2 h-4 w-4" />Thử lại</Button><Button type="button" @click="router.push({ name: 'super-admin-permissions' })">Về danh sách</Button></div></div>
    <template v-else-if="permission"><div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h1 class="break-words text-2xl font-semibold sm:text-3xl">{{ formatPermissionLabel(permission) }}</h1><Badge v-if="dangerous" variant="destructive">Quyền nhạy cảm</Badge></div><p class="mt-1 break-all font-mono text-sm text-muted-foreground">{{ permission.code }}</p></div><div class="flex flex-wrap gap-2"><PermissionGate :all-of="[ADMIN_PERMISSIONS.PERMISSIONS_UPDATE]"><Button type="button" variant="outline" :disabled="dangerous" @click="editOpen = true"><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</Button></PermissionGate><PermissionGate :all-of="[ADMIN_PERMISSIONS.PERMISSIONS_DELETE]"><Button type="button" variant="destructive" :disabled="dangerous || totalUsage > 0" @click="deleteOpen = true"><Trash2 class="mr-2 h-4 w-4" />Xóa</Button></PermissionGate></div></div>
      <div v-if="dangerous" class="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><ShieldAlert class="h-5 w-5 shrink-0" /><p>Quyền nhạy cảm được hệ thống bảo vệ và không thể thay đổi hoặc xóa.</p></div>
      <Card><CardHeader><CardTitle>Thông tin quyền</CardTitle></CardHeader><CardContent class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div><p class="text-sm text-muted-foreground">Mã</p><p class="break-all font-mono font-medium">{{ permission.code }}</p></div><div><p class="text-sm text-muted-foreground">Tên</p><p>{{ permission.name }}</p></div><div><p class="text-sm text-muted-foreground">Guard</p><p>{{ permission.guardName }}</p></div><div><p class="text-sm text-muted-foreground">Tài nguyên</p><p>{{ formatPermissionResource(permission.resource) }} <span class="font-mono text-xs text-muted-foreground">{{ permission.resource }}</span></p></div><div><p class="text-sm text-muted-foreground">Hành động</p><p>{{ formatPermissionAction(permission.action) }} <span class="font-mono text-xs text-muted-foreground">{{ permission.action }}</span></p></div><div class="sm:col-span-2 lg:col-span-3"><p class="text-sm text-muted-foreground">Mô tả</p><p class="whitespace-pre-wrap break-words">{{ permission.description || '—' }}</p></div><div><p class="text-sm text-muted-foreground">Ngày tạo</p><p>{{ formatPermissionDate(permission.createdAt) }}</p></div><div><p class="text-sm text-muted-foreground">Ngày cập nhật</p><p>{{ formatPermissionDate(permission.updatedAt) }}</p></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Mức độ sử dụng ({{ totalUsage }})</CardTitle></CardHeader><CardContent class="grid gap-3 sm:grid-cols-3"><div class="rounded-lg border p-4"><p class="text-sm text-muted-foreground">Mapping vai trò</p><p class="text-2xl font-semibold">{{ permission._count.rolePermissions }}</p></div><div class="rounded-lg border p-4"><p class="text-sm text-muted-foreground">Mapping người dùng</p><p class="text-2xl font-semibold">{{ permission._count.userPermissions }}</p></div><div class="rounded-lg border p-4"><p class="text-sm text-muted-foreground">Mapping người dùng/chi nhánh</p><p class="text-2xl font-semibold">{{ permission._count.userBranchPermissions }}</p></div><p v-if="totalUsage > 0" class="text-sm text-muted-foreground sm:col-span-3">Quyền đang được sử dụng và không thể xóa.</p></CardContent></Card>
    </template>
  </section>
  <PermissionFormDialog v-if="permission" v-model:open="editOpen" mode="update" :permission="permission" />
  <PermissionDeleteDialog v-if="permission" v-model:open="deleteOpen" :permission="permission" @deleted="router.push({ name: 'super-admin-permissions' })" />
</template>
