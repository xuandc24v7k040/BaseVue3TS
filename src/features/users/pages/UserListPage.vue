<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, RefreshCcw, Users } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import type { UsersFindAllParams, UsersFindAllSortBy, UsersFindAllSortOrder } from '@/api/generated/models'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import DataTable from '@/components/admin/table/DataTable.vue'
import type { DataTableFilterableColumn, DataTableQuery } from '@/components/admin/table/interface'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Button } from '@/components/ui/button'
import { useAdminPermissions } from '@/composables/use-admin-permissions'
import { toUserListParams } from '../adapters/user-list-query.adapter'
import { listUsers } from '../api/user-api'
import { userKeys } from '../api/user-query-keys'
import UserActionsMenu from '../components/UserActionsMenu.vue'
import UserFormDialog from '../components/UserFormDialog.vue'
import UserStateDialog from '../components/UserStateDialog.vue'
import { createUserColumns } from '../components/user-columns'
import type { User } from '../types'

const router = useRouter()
const { can } = useAdminPermissions()
const columns = createUserColumns()
const page = ref(1)
const limit = ref(10)
const search = ref('')
const type = ref<UsersFindAllParams['type']>()
const provider = ref<UsersFindAllParams['provider']>()
const isActive = ref<boolean>()
const sortBy = ref<UsersFindAllSortBy>('createdAt')
const sortOrder = ref<UsersFindAllSortOrder>('desc')
const formOpen = ref(false)
const editingUser = ref<User | null>(null)
const stateOpen = ref(false)
const stateMode = ref<'disable' | 'activate'>('disable')
const stateUser = ref<User | null>(null)

const params = computed<UsersFindAllParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(type.value ? { type: type.value } : {}),
  ...(provider.value ? { provider: provider.value } : {}),
  ...(isActive.value === undefined ? {} : { isActive: isActive.value }),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}))

const filters: DataTableFilterableColumn[] = [
  { id: 'type', title: 'Loại tài khoản', operator: 'in', options: [
    { label: 'Hệ thống', value: 'SYSTEM' },
    { label: 'Nội bộ chi nhánh', value: 'BRANCH' },
    { label: 'Khách hàng', value: 'CUSTOMER' },
  ] },
  { id: 'isActive', title: 'Trạng thái', operator: 'in', options: [
    { label: 'Đang hoạt động', value: 'true', variant: 'success' },
    { label: 'Đã khóa', value: 'false', variant: 'destructive' },
  ] },
  { id: 'provider', title: 'Nhà cung cấp đăng nhập', operator: 'in', options: [
    { label: 'Email và mật khẩu', value: 'LOCAL' },
    { label: 'Google', value: 'GOOGLE' },
  ] },
]

const query = useQuery({
  queryKey: computed(() => userKeys.list(params.value)),
  queryFn: ({ signal }) => listUsers(params.value, signal),
})
const rows = computed(() => query.data.value?.data ?? [])
const meta = computed(() => query.data.value?.meta)
const hasFilters = computed(() => Boolean(search.value || type.value || provider.value || isActive.value !== undefined))

function handleQueryChange(value: DataTableQuery): void {
  const next = toUserListParams(value)
  page.value = next.page ?? 1
  limit.value = next.limit ?? 10
  search.value = next.search ?? ''
  type.value = next.type
  provider.value = next.provider
  isActive.value = next.isActive
  sortBy.value = next.sortBy ?? 'createdAt'
  sortOrder.value = next.sortOrder ?? 'desc'
}

function openCreate(): void { editingUser.value = null; formOpen.value = true }
function openEdit(user: User): void { editingUser.value = user; formOpen.value = true }
function openState(user: User, mode: 'disable' | 'activate'): void { stateUser.value = user; stateMode.value = mode; stateOpen.value = true }
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb group-label="Tổ chức & phân quyền" :group-to="{ name: 'super-admin-branches' }" section-label="Người dùng hệ thống" />
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Người dùng hệ thống</h1><p class="mt-1 text-sm text-muted-foreground">Quản lý hồ sơ và trạng thái tài khoản trên toàn hệ thống, gồm tài khoản hệ thống, nội bộ chi nhánh và khách hàng.</p></div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.USERS_CREATE]"><Button type="button" @click="openCreate"><Plus class="mr-2 h-4 w-4" />Thêm người dùng</Button></PermissionGate>
    </div>
    <p class="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">Thao tác tạo mới chỉ tạo hồ sơ <strong class="text-foreground">Khách hàng</strong>; không thiết lập mật khẩu, vai trò hay phân công chi nhánh.</p>
    <DataTable
      :columns="columns"
      :data="rows"
      :page-count="meta?.lastPage"
      :row-count="meta?.total"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :page-size-options="[10, 20, 50, 100]"
      :global-search="{ columnIds: ['fullName', 'email', 'phone'], placeholder: 'Tìm theo tên, email hoặc số điện thoại...', title: 'Tìm kiếm' }"
      :filterable-columns="filters"
      :config="{
        tableId: 'user-management', rowIdKey: 'id', pageSize: 10, maxPageSize: 100,
        searchDebounce: 400, queryDebounce: 0, emitInitialQuery: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        initialColumnVisibility: { provider: false, updatedAt: false },
        enableColumnVisibility: true, stickyActionColumn: true,
        routeSync: { mode: 'compact', page: true, pageSize: true, search: true, sorting: true, filters: true, filterIds: ['type', 'isActive', 'provider'], arrayFilterIds: ['type', 'isActive', 'provider'], stringFilterIds: ['type', 'isActive', 'provider'], replace: true },
      }"
      @update:query="handleQueryChange"
      @retry="query.refetch()"
    >
      <template #toolbar-right><Button type="button" size="sm" variant="outline" aria-label="Tải lại danh sách người dùng" @click="query.refetch()"><RefreshCcw class="mr-2 h-4 w-4" />Tải lại</Button></template>
      <template #row-actions="{ rowData }"><UserActionsMenu :user="rowData" :can-update="can(ADMIN_PERMISSIONS.USERS_UPDATE)" :can-delete="can(ADMIN_PERMISSIONS.USERS_DELETE)" @view="router.push({ name: 'super-admin-user-detail', params: { id: rowData.id } })" @edit="openEdit(rowData)" @disable="openState(rowData, 'disable')" @activate="openState(rowData, 'activate')" /></template>
      <template #empty><div class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"><Users class="h-9 w-9" /><p class="font-medium text-foreground">{{ hasFilters ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có người dùng' }}</p><p class="text-sm">{{ hasFilters ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Danh sách chưa có hồ sơ người dùng.' }}</p></div></template>
    </DataTable>
  </section>
  <UserFormDialog v-model:open="formOpen" :mode="editingUser ? 'update' : 'create'" :user="editingUser" />
  <UserStateDialog v-model:open="stateOpen" :mode="stateMode" :user="stateUser" />
</template>
