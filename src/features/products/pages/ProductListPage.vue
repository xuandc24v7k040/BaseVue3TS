<script setup lang="ts">
import { computed, ref } from 'vue'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { PackageOpen, Plus, RefreshCcw } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import type { ProductListItemResponseDto, ProductsListParams } from '@/api/generated/models'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import DataTable from '@/components/admin/table/DataTable.vue'
import type { DataTableDateColumn, DataTableFilterableColumn, DataTableQuery } from '@/components/admin/table/interface'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Button } from '@/components/ui/button'
import { useAdminPermissions } from '@/composables/use-admin-permissions'
import { listCategoryTree } from '@/features/categories/api/category-api'
import { listSuppliers } from '@/features/suppliers/api/supplier-api'
import { listPublishers } from '@/features/publishers/api/publisher-api'
import { listAuthors } from '@/features/authors/api/author-api'
import MasterDataActionsMenu from '@/features/product-master-data/components/MasterDataActionsMenu.vue'
import MasterDataDeleteDialog from '@/features/product-master-data/components/MasterDataDeleteDialog.vue'
import { toProductListParams } from '../adapters/product-list-query.adapter'
import { productsDelete, productsList } from '../api/product-api'
import { productKeys } from '../api/product-query-keys'
import { createProductColumns } from '../components/product-columns'
import { productErrorMessage } from '../utils/product-errors'

const router = useRouter()
const client = useQueryClient()
const { can } = useAdminPermissions()
const columns = createProductColumns()
const params = ref<ProductsListParams>({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
const deleting = ref<ProductListItemResponseDto | null>(null)
const deleteOpen = ref(false)
const deletePending = ref(false)

const query = useQuery({
  queryKey: computed(() => productKeys.list(params.value)),
  queryFn: ({ signal }) => productsList(params.value, undefined, signal),
  placeholderData: keepPreviousData,
})
const rows = computed(() => query.data.value?.data ?? [])
const meta = computed(() => query.data.value?.meta)
const hasFilters = computed(() => Object.keys(params.value).some((key) => !['page', 'limit', 'sortBy', 'sortOrder'].includes(key)))

const suppliers = useQuery({ queryKey: ['products', 'selectors', 'suppliers'], queryFn: ({ signal }) => listSuppliers({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }, undefined, signal), staleTime: 60_000 })
const publishers = useQuery({ queryKey: ['products', 'selectors', 'publishers'], queryFn: ({ signal }) => listPublishers({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }, undefined, signal), staleTime: 60_000 })
const authors = useQuery({ queryKey: ['products', 'selectors', 'authors'], queryFn: ({ signal }) => listAuthors({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }, undefined, signal), staleTime: 60_000 })
const categories = useQuery({ queryKey: ['products', 'selectors', 'categories'], queryFn: ({ signal }) => listCategoryTree({ isActive: true, sortBy: 'sortOrder', sortOrder: 'asc' }, signal), staleTime: 60_000 })

const flattenCategories = computed(() => {
  const result: Array<{ id: string; name: string }> = []
  const visit = (nodes: NonNullable<typeof categories.data.value>['data'], prefix = '') => nodes.forEach((node) => {
    result.push({ id: node.id, name: `${prefix}${node.name}` })
    visit(node.children, `${prefix}— `)
  })
  visit(categories.data.value?.data ?? [])
  return result
})

const filters = computed<DataTableFilterableColumn[]>(() => [
  { id: 'status', title: 'Trạng thái', operator: 'in', options: [
    { label: 'Bản nháp', value: 'DRAFT' }, { label: 'Hoạt động', value: 'ACTIVE' },
    { label: 'Tạm ngưng', value: 'INACTIVE' }, { label: 'Ngừng kinh doanh', value: 'DISCONTINUED' },
  ] },
  { id: 'categories', title: 'Danh mục', operator: 'in', options: flattenCategories.value.map((item) => ({ label: item.name, value: item.id })) },
  { id: 'supplier', title: 'Nhà cung cấp', operator: 'in', options: (suppliers.data.value?.data ?? []).map((item) => ({ label: item.name, value: item.id })) },
  { id: 'publisher', title: 'Nhà xuất bản', operator: 'in', options: (publishers.data.value?.data ?? []).map((item) => ({ label: item.name, value: item.id })) },
  { id: 'authors', title: 'Tác giả', operator: 'in', options: (authors.data.value?.data ?? []).map((item) => ({ label: item.name, value: item.id })) },
])
const dates: DataTableDateColumn[] = [
  { id: 'createdAt', title: 'Ngày tạo', placeholder: 'Khoảng ngày tạo', mode: 'range', enablePresets: true, disableFutureDates: true, dateFormatPattern: 'DD/MM/YYYY' },
  { id: 'releaseDate', title: 'Ngày phát hành', placeholder: 'Khoảng ngày phát hành', mode: 'range', enablePresets: true, dateFormatPattern: 'DD/MM/YYYY' },
]

function handleQuery(value: DataTableQuery) {
  params.value = toProductListParams(value)
}
function openDelete(row: ProductListItemResponseDto) {
  deleting.value = row
  deleteOpen.value = true
}
async function confirmDelete() {
  if (!deleting.value || deletePending.value) return
  deletePending.value = true
  try {
    await productsDelete(deleting.value.id)
    await client.invalidateQueries({ queryKey: productKeys.lists() })
    toast.success('Xóa sản phẩm thành công.')
    deleteOpen.value = false
  } catch (error) {
    toast.error(productErrorMessage(error, 'Không thể xóa sản phẩm.'))
  } finally {
    deletePending.value = false
  }
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb group-label="Quản lý sản phẩm" :group-to="{ name: 'super-admin-products' }" section-label="Sản phẩm" />
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Sản phẩm</h1><p class="mt-1 text-sm text-muted-foreground">Quản lý thông tin chung, lựa chọn, biến thể và giá VND trên toàn hệ thống.</p></div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.PRODUCTS_CREATE]"><Button @click="router.push({ name: 'super-admin-product-new' })"><Plus class="mr-2 h-4 w-4" />Thêm sản phẩm</Button></PermissionGate>
    </div>
    <DataTable
      :columns="columns" :data="rows" :page-count="meta?.lastPage" :row-count="meta?.total"
      :is-loading="query.isPending.value" :error="query.error.value" :page-size-options="[10, 20, 50, 100]"
      :global-search="{ columnIds: ['name', 'defaultSku'], placeholder: 'Tìm tên, slug, SKU, ISBN hoặc barcode...', title: 'Tìm kiếm' }"
      :filterable-columns="filters" :date-columns="dates"
      :config="{
        tableId: 'product-management', rowIdKey: 'id', pageSize: 10, maxPageSize: 100,
        searchDebounce: 400, queryDebounce: 0, emitInitialQuery: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        initialColumnVisibility: { authors: false, releaseDate: false },
        enableColumnVisibility: true, stickyActionColumn: true,
        routeSync: { mode: 'compact', page: true, pageSize: true, search: true, sorting: true, filters: true,
          filterIds: ['status', 'categories', 'supplier', 'publisher', 'authors', 'createdAt', 'releaseDate'],
          filterParamMap: { categories: 'categoryId', supplier: 'supplierId', publisher: 'publisherId', authors: 'authorId' },
          arrayFilterIds: ['status', 'categories', 'supplier', 'publisher', 'authors'], stringFilterIds: ['status', 'categories', 'supplier', 'publisher', 'authors'], replace: true },
      }"
      @update:query="handleQuery" @retry="query.refetch()"
    >
      <template #toolbar-right><Button size="sm" variant="outline" :disabled="query.isFetching.value" @click="query.refetch()"><RefreshCcw class="mr-2 h-4 w-4" :class="query.isFetching.value ? 'animate-spin' : ''" />Tải lại</Button></template>
      <template #row-actions="{ rowData }"><MasterDataActionsMenu
        :can-update="can(ADMIN_PERMISSIONS.PRODUCTS_UPDATE)" :can-delete="can(ADMIN_PERMISSIONS.PRODUCTS_DELETE)"
        :delete-disabled="rowData.status !== 'DRAFT'"
        @view="router.push({ name: 'super-admin-product-detail', params: { id: rowData.id } })"
        @edit="router.push({ name: 'super-admin-product-edit', params: { id: rowData.id } })" @delete="openDelete(rowData)"
      /></template>
      <template #empty><div class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"><PackageOpen class="h-9 w-9" /><p class="font-medium text-foreground">{{ hasFilters ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm' }}</p><p class="text-sm">{{ hasFilters ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Hãy tạo sản phẩm bản nháp đầu tiên.' }}</p></div></template>
    </DataTable>
  </section>
  <MasterDataDeleteDialog v-model:open="deleteOpen" :name="deleting?.name ?? ''" title="Xóa sản phẩm?" description="Chỉ sản phẩm DRAFT không có dữ liệu nghiệp vụ tham chiếu mới có thể xóa." :pending="deletePending" @confirm="confirmDelete" />
</template>
