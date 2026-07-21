<script setup lang="ts">
import { computed, ref } from 'vue'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Plus, RefreshCcw, Truck } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import type {
  SupplierResponseDto,
  SuppliersListParams,
  SuppliersListSortBy,
  SuppliersListSortOrder,
} from '@/api/generated/models'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import DataTable from '@/components/admin/table/DataTable.vue'
import type {
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableQuery,
} from '@/components/admin/table/interface'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Button } from '@/components/ui/button'
import { useAdminPermissions } from '@/composables/use-admin-permissions'
import MasterDataActionsMenu from '@/features/product-master-data/components/MasterDataActionsMenu.vue'
import MasterDataDeleteDialog from '@/features/product-master-data/components/MasterDataDeleteDialog.vue'
import { masterDataErrorMessage } from '@/features/product-master-data/utils/master-data-errors'
import { toSupplierListParams } from '../adapters/supplier-list-query.adapter'
import { deleteSupplier, listSuppliers } from '../api/supplier-api'
import { supplierKeys } from '../api/supplier-query-keys'
import { createSupplierColumns } from '../components/supplier-columns'
import SupplierFormDialog from '../components/SupplierFormDialog.vue'
const router = useRouter(),
  client = useQueryClient(),
  { can } = useAdminPermissions(),
  columns = createSupplierColumns()
const page = ref(1),
  limit = ref(10),
  search = ref(''),
  usageStatus = ref<SuppliersListParams['usageStatus']>(),
  hasPhone = ref<boolean>(),
  hasEmail = ref<boolean>(),
  createdFrom = ref<string>(),
  createdTo = ref<string>(),
  sortBy = ref<SuppliersListSortBy>('createdAt'),
  sortOrder = ref<SuppliersListSortOrder>('desc')
const formOpen = ref(false),
  editing = ref<SupplierResponseDto | null>(null),
  deleteOpen = ref(false),
  deleting = ref<SupplierResponseDto | null>(null),
  deletePending = ref(false)
const params = computed<SuppliersListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(usageStatus.value ? { usageStatus: usageStatus.value } : {}),
  ...(hasPhone.value === undefined ? {} : { hasPhone: hasPhone.value }),
  ...(hasEmail.value === undefined ? {} : { hasEmail: hasEmail.value }),
  ...(createdFrom.value ? { createdFrom: createdFrom.value } : {}),
  ...(createdTo.value ? { createdTo: createdTo.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}))
const query = useQuery({
  queryKey: computed(() => supplierKeys.list(params.value)),
  queryFn: ({ signal }) => listSuppliers(params.value, undefined, signal),
  placeholderData: keepPreviousData,
})
const rows = computed(() => query.data.value?.data ?? []),
  meta = computed(() => query.data.value?.meta),
  hasFilters = computed(() =>
    Boolean(
      search.value ||
      usageStatus.value ||
      hasPhone.value !== undefined ||
      hasEmail.value !== undefined ||
      createdFrom.value ||
      createdTo.value,
    ),
  )
const filters: DataTableFilterableColumn[] = [
  {
    id: 'usageCount',
    title: 'Trạng thái sử dụng',
    operator: 'in',
    options: [
      { label: 'Đang được sử dụng', value: 'USED' },
      { label: 'Chưa được sử dụng', value: 'UNUSED' },
    ],
  },
  {
    id: 'phone',
    title: 'Số điện thoại',
    operator: 'in',
    options: [
      { label: 'Có số điện thoại', value: 'true' },
      { label: 'Chưa có số điện thoại', value: 'false' },
    ],
  },
  {
    id: 'email',
    title: 'Email',
    operator: 'in',
    options: [
      { label: 'Có email', value: 'true' },
      { label: 'Chưa có email', value: 'false' },
    ],
  },
]
const dates: DataTableDateColumn[] = [
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
function handleQuery(q: DataTableQuery) {
  const n = toSupplierListParams(q)
  page.value = n.page ?? 1
  limit.value = n.limit ?? 10
  search.value = n.search ?? ''
  usageStatus.value = n.usageStatus
  hasPhone.value = n.hasPhone
  hasEmail.value = n.hasEmail
  createdFrom.value = n.createdFrom
  createdTo.value = n.createdTo
  sortBy.value = n.sortBy ?? 'createdAt'
  sortOrder.value = n.sortOrder ?? 'desc'
}
function openCreate() {
  editing.value = null
  formOpen.value = true
}
function openEdit(row: SupplierResponseDto) {
  editing.value = row
  formOpen.value = true
}
function openDelete(row: SupplierResponseDto) {
  deleting.value = row
  deleteOpen.value = true
}
async function confirmDelete() {
  if (!deleting.value || deletePending.value) return
  deletePending.value = true
  try {
    await deleteSupplier(deleting.value.id)
    await client.invalidateQueries({ queryKey: supplierKeys.all })
    toast.success('Xóa nhà cung cấp thành công.')
    deleteOpen.value = false
  } catch (e) {
    toast.error(masterDataErrorMessage(e, 'Không thể xóa nhà cung cấp.'))
    await query.refetch()
  } finally {
    deletePending.value = false
  }
}
</script>
<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý sản phẩm"
      :group-to="{ name: 'super-admin-categories' }"
      section-label="Nhà cung cấp"
    />
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Nhà cung cấp
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý thông tin nhà cung cấp sản phẩm trên toàn hệ thống.
        </p>
      </div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.SUPPLIERS_CREATE]"
        ><Button @click="openCreate"
          ><Plus class="mr-2 h-4 w-4" />Thêm nhà cung cấp</Button
        ></PermissionGate
      >
    </div>
    <DataTable
      :columns="columns"
      :data="rows"
      :page-count="meta?.lastPage"
      :row-count="meta?.total"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :page-size-options="[10, 20, 50, 100]"
      :global-search="{
        columnIds: ['name', 'phone', 'email', 'address'],
        placeholder: 'Tìm tên, điện thoại, email hoặc địa chỉ...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :date-columns="dates"
      :config="{
        tableId: 'supplier-management',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        searchDebounce: 400,
        queryDebounce: 0,
        emitInitialQuery: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        initialColumnVisibility: { updatedAt: false },
        enableColumnVisibility: true,
        stickyActionColumn: true,
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['usageCount', 'phone', 'email', 'createdAt'],
          filterParamMap: {
            usageCount: 'usageStatus',
            phone: 'hasPhone',
            email: 'hasEmail',
          },
          arrayFilterIds: ['usageCount', 'phone', 'email'],
          stringFilterIds: ['usageCount', 'phone', 'email'],
          replace: true,
        },
      }"
      @update:query="handleQuery"
      @retry="query.refetch()"
      ><template #toolbar-right
        ><Button size="sm" variant="outline" @click="query.refetch()"
          ><RefreshCcw class="mr-2 h-4 w-4" />Tải lại</Button
        ></template
      ><template #row-actions="{ rowData }"
        ><MasterDataActionsMenu
          :can-update="can(ADMIN_PERMISSIONS.SUPPLIERS_UPDATE)"
          :can-delete="can(ADMIN_PERMISSIONS.SUPPLIERS_DELETE)"
          :delete-disabled="rowData.usageCount > 0"
          @view="
            router.push({
              name: 'super-admin-supplier-detail',
              params: { id: rowData.id },
            })
          "
          @edit="openEdit(rowData)"
          @delete="openDelete(rowData)" /></template
      ><template #empty
        ><div
          class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
        >
          <Truck class="h-9 w-9" />
          <p class="font-medium text-foreground">
            {{
              hasFilters
                ? 'Không tìm thấy nhà cung cấp phù hợp'
                : 'Chưa có nhà cung cấp'
            }}
          </p>
          <p class="text-sm">
            {{
              hasFilters
                ? 'Thử thay đổi từ khóa hoặc bộ lọc.'
                : 'Hãy tạo nhà cung cấp đầu tiên.'
            }}
          </p>
        </div></template
      ></DataTable
    >
  </section>
  <SupplierFormDialog
    v-model:open="formOpen"
    :mode="editing ? 'update' : 'create'"
    :supplier="editing"
  /><MasterDataDeleteDialog
    v-model:open="deleteOpen"
    :name="deleting?.name ?? ''"
    title="Xóa nhà cung cấp?"
    description="Chỉ có thể xóa khi nhà cung cấp chưa được sản phẩm nào sử dụng. Hành động này không thể hoàn tác."
    :pending="deletePending"
    @confirm="confirmDelete"
  />
</template>
