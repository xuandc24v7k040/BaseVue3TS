<script setup lang="ts">
import axios from 'axios'
import { computed, ref } from 'vue'
import { LockKeyhole, Pencil, RefreshCcw, RotateCcw } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getUser } from '../api/user-api'
import { userKeys } from '../api/user-query-keys'
import UserFormDialog from '../components/UserFormDialog.vue'
import UserStateDialog from '../components/UserStateDialog.vue'
import UserStatusBadge from '../components/UserStatusBadge.vue'
import { formatUserBirthday, formatUserDateTime, userGenderLabel, userProviderLabel, userTypeLabel } from '../utils/user-labels'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id ?? ''))
const query = useQuery({ queryKey: computed(() => userKeys.detail(id.value)), queryFn: ({ signal }) => getUser(id.value, signal), enabled: computed(() => Boolean(id.value)) })
const user = computed(() => query.data.value?.data)
const status = computed(() => axios.isAxiosError(query.error.value) ? query.error.value.response?.status : undefined)
const editOpen = ref(false)
const stateOpen = ref(false)
const stateMode = ref<'disable' | 'activate'>('disable')
function openState(mode: 'disable' | 'activate'): void { stateMode.value = mode; stateOpen.value = true }
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb group-label="Tổ chức & phân quyền" :group-to="{ name: 'super-admin-branches' }" section-label="Người dùng hệ thống" :section-to="{ name: 'super-admin-users' }" :current-label="user?.fullName || user?.email" :loading="query.isPending.value" />
    <div v-if="query.isPending.value" class="space-y-4"><Skeleton class="h-10 w-72 max-w-full" /><Skeleton class="h-44 w-full" /><Skeleton class="h-44 w-full" /></div>
    <div v-else-if="query.isError.value" class="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"><h1 class="text-xl font-semibold">{{ status === 404 ? 'Không tìm thấy người dùng' : status === 403 ? 'Bạn không có quyền xem người dùng này' : 'Không thể tải thông tin người dùng' }}</h1><p class="mt-2 text-sm text-muted-foreground">Vui lòng thử lại hoặc quay về danh sách.</p><div class="mt-4 flex justify-center gap-2"><Button v-if="status !== 404 && status !== 403" variant="outline" @click="query.refetch()"><RefreshCcw class="mr-2 h-4 w-4" />Thử lại</Button><Button @click="router.push({ name: 'super-admin-users' })">Về danh sách</Button></div></div>
    <template v-else-if="user">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h1 class="break-words text-2xl font-semibold sm:text-3xl">{{ user.fullName || user.email }}</h1><UserStatusBadge :active="user.isActive" /></div><p class="mt-1 break-all text-sm text-muted-foreground">{{ user.email }}</p><div class="mt-3 flex flex-wrap gap-2"><Badge variant="outline">{{ userTypeLabel(user.type) }}</Badge><Badge variant="secondary">{{ userProviderLabel(user.provider) }}</Badge></div></div><div class="flex flex-wrap gap-2"><PermissionGate :all-of="[ADMIN_PERMISSIONS.USERS_UPDATE]"><Button disabled variant="outline" @click="editOpen = true"><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa hồ sơ</Button></PermissionGate><PermissionGate v-if="user.isActive" :all-of="[ADMIN_PERMISSIONS.USERS_DELETE]"><Button variant="destructive" @click="openState('disable')"><LockKeyhole class="mr-2 h-4 w-4" />Khóa tài khoản</Button></PermissionGate><PermissionGate v-else :all-of="[ADMIN_PERMISSIONS.USERS_UPDATE]"><Button @click="openState('activate')"><RotateCcw class="mr-2 h-4 w-4" />Kích hoạt tài khoản</Button></PermissionGate></div></div>
      <div class="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Thông tin hồ sơ</CardTitle></CardHeader><CardContent class="grid gap-5 sm:grid-cols-2"><div><p class="text-sm text-muted-foreground">Họ và tên</p><p class="break-words font-medium">{{ user.fullName || '—' }}</p></div><div><p class="text-sm text-muted-foreground">Email</p><p class="break-all font-medium">{{ user.email }}</p></div><div><p class="text-sm text-muted-foreground">Số điện thoại</p><p>{{ user.phone || '—' }}</p></div><div><p class="text-sm text-muted-foreground">Giới tính</p><p>{{ userGenderLabel(user.gender) }}</p></div><div><p class="text-sm text-muted-foreground">Ngày sinh</p><p>{{ formatUserBirthday(user.birthday) }}</p></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Thông tin tài khoản</CardTitle></CardHeader><CardContent class="grid gap-5 sm:grid-cols-2"><div><p class="text-sm text-muted-foreground">Loại tài khoản</p><p>{{ userTypeLabel(user.type) }}</p></div><div><p class="text-sm text-muted-foreground">Nhà cung cấp</p><p>{{ userProviderLabel(user.provider) }}</p></div><div><p class="text-sm text-muted-foreground">Trạng thái</p><UserStatusBadge :active="user.isActive" /></div><div><p class="text-sm text-muted-foreground">Đăng nhập gần nhất</p><p class="whitespace-nowrap">{{ formatUserDateTime(user.lastLoginAt) }}</p></div><div><p class="text-sm text-muted-foreground">Ngày tạo</p><p class="whitespace-nowrap">{{ formatUserDateTime(user.createdAt) }}</p></div><div><p class="text-sm text-muted-foreground">Cập nhật</p><p class="whitespace-nowrap">{{ formatUserDateTime(user.updatedAt) }}</p></div></CardContent></Card>
      </div>
    </template>
  </section>
  <UserFormDialog v-if="user" v-model:open="editOpen" mode="update" :user="user" />
  <UserStateDialog v-if="user" v-model:open="stateOpen" :mode="stateMode" :user="user" />
</template>
