<script setup lang="ts">
import { computed, ref } from 'vue'
import { Eye, Pencil, Plus, Power, RefreshCcw, Store } from '@lucide/vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import DataTable from '@/components/admin/table/DataTable.vue'
import DataTableActions from '@/components/admin/table/DataTableActions.vue'
import type { DataTableAction, DataTableQuery } from '@/components/admin/table/interface'
import type { DataTableDateColumn, DataTableFilterableColumn } from '@/components/admin/table/interface'
import type { BranchesListParams, BranchesListSortBy, BranchesListSortOrder } from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import { useAdminPermissions } from '@/composables/use-admin-permissions'
import { listBranches } from '../api/branch-api'
import { branchKeys } from '../api/branch-query-keys'
import type { Branch, BranchFormMode } from '../types'
import BranchDeactivateDialog from '../components/BranchDeactivateDialog.vue'
import BranchFormDialog from '../components/BranchFormDialog.vue'
import { createBranchColumns } from '../components/branch-columns'
import { toBranchListParams } from '../adapters/branch-list-query.adapter'

const router = useRouter()
const { can } = useAdminPermissions()
const columns = createBranchColumns()
const page = ref(1)
const limit = ref(10)
const search = ref('')
const isActive = ref<boolean | undefined>()
const createdFrom = ref<string | undefined>()
const createdTo = ref<string | undefined>()
const sortBy = ref<BranchesListSortBy>('code')
const sortOrder = ref<BranchesListSortOrder>('desc')
const formOpen = ref(false)
const formMode = ref<BranchFormMode>('create')
const editingBranch = ref<Branch | null>(null)
const deactivateOpen = ref(false)
const deactivatingBranch = ref<Branch | null>(null)

const params = computed<BranchesListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(isActive.value === undefined ? {} : { isActive: isActive.value }),
  ...(createdFrom.value ? { createdFrom: createdFrom.value } : {}),
  ...(createdTo.value ? { createdTo: createdTo.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}))

const statusFilters: DataTableFilterableColumn[] = [
  {
    id: 'isActive',
    title: 'Trạng thái',
    operator: 'in',
    options: [
      { label: 'Đang hoạt động', value: 'true', variant: 'success' },
      { label: 'Ngừng hoạt động', value: 'false', variant: 'destructive' },
    ],
  },
]

const dateColumns: DataTableDateColumn[] = [
  {
    id: 'createdAt',
    title: 'Ngày tạo',
    placeholder: 'Khoảng ngày tạo',
    mode: 'range',
    enablePresets: true,
    disableFutureDates: true,
    dateFormatPattern: 'DD/MM/YYYY',
  },
]

const branchQuery = useQuery({
  queryKey: computed(() => branchKeys.list(null, params.value)),
  queryFn: ({ signal }) => listBranches(params.value, null, signal),
  placeholderData: keepPreviousData,
})

const rows = computed(() => branchQuery.data.value?.data ?? [])
const meta = computed(() => branchQuery.data.value?.meta)
const pageCount = computed(() => meta.value?.lastPage)
const rowCount = computed(() => meta.value?.total)

function handleQueryChange(query: DataTableQuery): void {
  const next = toBranchListParams(query)
  page.value = next.page ?? 1
  limit.value = next.limit ?? 10
  search.value = next.search ?? ''
  isActive.value = next.isActive
  createdFrom.value = next.createdFrom
  createdTo.value = next.createdTo
  sortBy.value = next.sortBy ?? 'code'
  sortOrder.value = next.sortOrder ?? 'desc'
}

function openCreate(): void {
  formMode.value = 'create'
  editingBranch.value = null
  formOpen.value = true
}

function openEdit(branch: Branch): void {
  formMode.value = 'update'
  editingBranch.value = branch
  formOpen.value = true
}

function openDeactivate(branch: Branch): void {
  deactivatingBranch.value = branch
  deactivateOpen.value = true
}

function rowActions(branch: Branch): DataTableAction[] {
  const actions: DataTableAction[] = [
    {
      key: 'view',
      label: 'Xem chi tiết',
      icon: Eye,
      onClick: async () => {
        await router.push({
          name: 'super-admin-branch-detail',
          params: { id: branch.id },
        })
      },
    },
  ]
  if (can(ADMIN_PERMISSIONS.BRANCHES_UPDATE)) {
    actions.push({
      key: 'edit',
      label: 'Chỉnh sửa',
      icon: Pencil,
      onClick: () => openEdit(branch),
    })
  }
  if (branch.isActive && can(ADMIN_PERMISSIONS.BRANCHES_DELETE)) {
    actions.push({
      key: 'deactivate',
      label: 'Ngừng hoạt động',
      icon: Power,
      variant: 'destructive',
      separator: true,
      onClick: () => openDeactivate(branch),
    })
  }
  return actions
}
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb group-label="Tổ chức & phân quyền" :group-to="{ name: 'super-admin-branches' }" section-label="Chi nhánh" />
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Chi nhánh</h1>
        <p class="mt-1 text-sm text-muted-foreground">Quản lý thông tin, địa chỉ và trạng thái hoạt động của các chi nhánh.</p>
      </div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.BRANCHES_CREATE]">
        <Button type="button" @click="openCreate"><Plus class="mr-2 h-4 w-4" />Thêm chi nhánh</Button>
      </PermissionGate>
    </div>

    <DataTable
      :columns="columns"
      :data="rows"
      :page-count="pageCount"
      :row-count="rowCount"
      :is-loading="branchQuery.isFetching.value"
      :error="branchQuery.error.value"
      :page-size-options="[10, 20, 50, 100]"
      :global-search="{
        columnIds: ['code', 'name'],
        placeholder: 'Tìm theo mã hoặc tên chi nhánh...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="statusFilters"
      :date-columns="dateColumns"
      :config="{
        tableId: 'branch-management',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        searchDebounce: 400,
        queryDebounce: 0,
        emitInitialQuery: true,
        initialSorting: [{ id: 'code', desc: true }],
        initialColumnVisibility: {
          code: false,
        },
        enableColumnVisibility: true,
        stickyActionColumn: true,
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['isActive', 'createdAt'],
          arrayFilterIds: ['isActive'],
          stringFilterIds: ['isActive'],
          replace: true,
        },
      }"
      @update:query="handleQueryChange"
      @retry="branchQuery.refetch()"
    >
      <template #toolbar-right>
        <Button type="button" size="sm" variant="outline" @click="branchQuery.refetch()"> <RefreshCcw class="mr-2 h-4 w-4" />Tải lại </Button>
      </template>
      <template #row-actions="{ rowData }">
        <DataTableActions :label="rowData.name" :actions="rowActions(rowData)" />
      </template>
      <template #empty>
        <div class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Store class="h-9 w-9" />
          <p class="font-medium text-foreground">
            {{ search || isActive !== undefined || createdFrom || createdTo ? 'Không tìm thấy chi nhánh phù hợp' : 'Chưa có chi nhánh' }}
          </p>
          <p class="text-sm">
            {{ search || isActive !== undefined || createdFrom || createdTo ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Tạo chi nhánh đầu tiên để bắt đầu.' }}
          </p>
        </div>
      </template>
    </DataTable>
  </section>

  <BranchFormDialog v-model:open="formOpen" :mode="formMode" :branch="editingBranch" />
  <BranchDeactivateDialog v-model:open="deactivateOpen" :branch="deactivatingBranch" />
</template>
