<script setup lang="ts">
import axios from 'axios'
import { computed, ref } from 'vue'
import { ArrowLeft, LockKeyhole, Pencil, Power, RefreshCcw, ShieldCheck } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPermissionLabel } from '@/features/permissions/utils/permission-labels'
import { getRole } from '../api/role-api'
import { roleKeys } from '../api/role-query-keys'
import { groupPermissions } from '../adapters/role-permission.adapter'
import RoleDeactivateDialog from '../components/RoleDeactivateDialog.vue'
import RoleFormDialog from '../components/RoleFormDialog.vue'
import RoleStatusBadge from '../components/RoleStatusBadge.vue'
import { formatRoleDate, roleTypeLabel } from '../components/role-columns'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id ?? ''))
const query = useQuery({ queryKey: computed(() => roleKeys.detail(id.value)), queryFn: ({ signal }) => getRole(id.value, signal), enabled: computed(() => Boolean(id.value)) })
const role = computed(() => query.data.value?.data)
const status = computed(() => axios.isAxiosError(query.error.value) ? query.error.value.response?.status : undefined)
const editOpen = ref(false)
const editPermissionsFirst = ref(false)
const deactivateOpen = ref(false)
const permissionGroups = computed(() => groupPermissions(
  role.value?.rolePermissions.map(({ permission }) => permission) ?? [],
))

function openMetadataEditor(): void {
  editPermissionsFirst.value = false
  editOpen.value = true
}

function openPermissionEditor(): void {
  editPermissionsFirst.value = true
  editOpen.value = true
}
</script>

<template>
  <section class="space-y-6">
    <Button type="button" variant="ghost" class="-ml-3" @click="router.push({ name: 'super-admin-roles' })"><ArrowLeft class="mr-2 h-4 w-4" />Quay lại danh sách</Button>
    <div v-if="query.isPending.value" class="space-y-4"><Skeleton class="h-10 w-64" /><Skeleton class="h-48 w-full" /><Skeleton class="h-36 w-full" /></div>
    <div v-else-if="query.isError.value" class="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <h1 class="text-xl font-semibold">{{ status === 404 ? 'Không tìm thấy vai trò' : status === 403 ? 'Bạn không có quyền xem vai trò này' : 'Không thể tải thông tin vai trò' }}</h1>
      <p class="mt-2 text-sm text-muted-foreground">{{ status === 404 ? 'Vai trò có thể không tồn tại hoặc đã thay đổi.' : 'Vui lòng thử lại hoặc quay về danh sách.' }}</p>
      <div class="mt-4 flex justify-center gap-2"><Button v-if="status !== 404 && status !== 403" type="button" variant="outline" @click="query.refetch()"><RefreshCcw class="mr-2 h-4 w-4" />Thử lại</Button><Button type="button" @click="router.push({ name: 'super-admin-roles' })">Về danh sách</Button></div>
    </div>
    <template v-else-if="role">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h1 class="break-words text-2xl font-semibold sm:text-3xl">{{ role.name }}</h1><RoleStatusBadge :active="role.isActive" /><Badge variant="outline">{{ role.isSystem ? 'Hệ thống' : 'Tùy chỉnh' }}</Badge></div><p class="mt-1 break-all font-mono text-sm text-muted-foreground">{{ role.code }}</p></div>
        <div v-if="!role.isSystem" class="flex flex-wrap gap-2"><PermissionGate :all-of="[ADMIN_PERMISSIONS.ROLES_UPDATE]"><Button type="button" variant="outline" @click="openMetadataEditor"><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</Button></PermissionGate><PermissionGate :all-of="[ADMIN_PERMISSIONS.ROLES_ASSIGN_PERMISSION]"><Button type="button" variant="outline" @click="openPermissionEditor"><ShieldCheck class="mr-2 h-4 w-4" />Chỉnh sửa quyền hạn</Button></PermissionGate><PermissionGate v-if="role.isActive" :all-of="[ADMIN_PERMISSIONS.ROLES_DELETE]"><Button type="button" variant="destructive" @click="deactivateOpen = true"><Power class="mr-2 h-4 w-4" />Ngừng hoạt động</Button></PermissionGate></div>
      </div>
      <div v-if="role.isSystem" class="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">Nội dung chỉ đọc. Vai trò hệ thống được bảo vệ và chỉ có thể xem.</div>
      <Card><CardHeader><CardTitle>Thông tin vai trò</CardTitle></CardHeader><CardContent class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div><p class="text-sm text-muted-foreground">Mã</p><p class="break-all font-mono font-medium">{{ role.code }}</p></div><div><p class="text-sm text-muted-foreground">Tên</p><p class="font-medium">{{ role.name }}</p></div><div><p class="text-sm text-muted-foreground">Loại</p><p>{{ roleTypeLabel(role.type) }}</p></div><div><p class="text-sm text-muted-foreground">Guard</p><p>{{ role.guardName }}</p></div><div><p class="text-sm text-muted-foreground">Cấp độ</p><p>{{ role.level }}</p></div><div><p class="text-sm text-muted-foreground">Phân loại</p><p>{{ role.isSystem ? 'Vai trò hệ thống' : 'Vai trò tùy chỉnh' }}</p></div><div class="sm:col-span-2 lg:col-span-3"><p class="text-sm text-muted-foreground">Mô tả</p><p class="whitespace-pre-wrap break-words">{{ role.description || '—' }}</p></div><div><p class="text-sm text-muted-foreground">Ngày tạo</p><p>{{ formatRoleDate(role.createdAt) }}</p></div><div><p class="text-sm text-muted-foreground">Ngày cập nhật</p><p>{{ formatRoleDate(role.updatedAt) }}</p></div>
      </CardContent></Card>
      <Card>
        <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle class="flex items-center gap-2"><ShieldCheck class="h-5 w-5" />Quyền hạn ({{ role.rolePermissions.length }})</CardTitle>
          <TooltipProvider v-if="role.isSystem" :delay-duration="200">
            <Tooltip><TooltipTrigger as-child><span tabindex="0"><Button type="button" variant="outline" size="sm" disabled><LockKeyhole class="mr-2 h-4 w-4" />Chỉ đọc</Button></span></TooltipTrigger><TooltipContent class="max-w-72">Vai trò hệ thống được bảo vệ và không thể chỉnh sửa quyền hạn.</TooltipContent></Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          <p v-if="!role.rolePermissions.length" class="text-sm text-muted-foreground">Vai trò chưa được gán quyền hạn.</p>
          <div v-else class="columns-1 gap-4 md:columns-2">
            <section v-for="group in permissionGroups" :key="group.resource" class="mb-4 inline-block w-full break-inside-avoid rounded-lg border p-4 align-top">
              <h3 class="font-medium">{{ group.label }}</h3>
              <ul class="mt-3 space-y-3">
                <li v-for="permission in group.permissions" :key="permission.id" class="min-w-0">
                  <p class="break-words text-sm font-medium">{{ formatPermissionLabel(permission) }}</p>
                  <p class="break-all font-mono text-xs text-muted-foreground">{{ permission.code }}</p>
                </li>
              </ul>
            </section>
          </div>
        </CardContent>
      </Card>
    </template>
  </section>
  <RoleFormDialog v-if="role" v-model:open="editOpen" mode="update" :role="role" :open-permission-editor="editPermissionsFirst" @saved="query.refetch()" />
  <RoleDeactivateDialog v-if="role" v-model:open="deactivateOpen" :role="role" />
</template>
