<script setup lang="ts">
import { computed, ref } from "vue";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { Plus, RefreshCcw, SlidersHorizontal } from "@lucide/vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import type {
  ProductAttributeResponseDto,
  ProductAttributesListParams,
  ProductAttributesListSortBy,
  ProductAttributesListSortOrder,
} from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import { Button } from "@/components/ui/button";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import MasterDataActionsMenu from "@/features/product-master-data/components/MasterDataActionsMenu.vue";
import MasterDataDeleteDialog from "@/features/product-master-data/components/MasterDataDeleteDialog.vue";
import { masterDataErrorMessage } from "@/features/product-master-data/utils/master-data-errors";
import { PRODUCT_ATTRIBUTE_TYPE_OPTIONS } from "@/features/product-master-data/utils/master-data-labels";
import { toProductAttributeListParams } from "../adapters/product-attribute-list-query.adapter";
import {
  deleteProductAttribute,
  listProductAttributes,
} from "../api/product-attribute-api";
import { productAttributeKeys } from "../api/product-attribute-query-keys";
import ProductAttributeFormDialog from "../components/ProductAttributeFormDialog.vue";
import { createProductAttributeColumns } from "../components/product-attribute-columns";
const router = useRouter(),
  client = useQueryClient(),
  { can } = useAdminPermissions(),
  columns = createProductAttributeColumns();
const page = ref(1),
  limit = ref(10),
  search = ref(""),
  usage = ref<ProductAttributesListParams["usageStatus"]>(),
  type = ref<ProductAttributesListParams["type"]>(),
  from = ref<string>(),
  to = ref<string>(),
  sortBy = ref<ProductAttributesListSortBy>("createdAt"),
  sortOrder = ref<ProductAttributesListSortOrder>("desc"),
  formOpen = ref(false),
  editing = ref<ProductAttributeResponseDto | null>(null),
  deleteOpen = ref(false),
  deleting = ref<ProductAttributeResponseDto | null>(null),
  pending = ref(false);
const params = computed<ProductAttributesListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(usage.value ? { usageStatus: usage.value } : {}),
  ...(type.value ? { type: type.value } : {}),
  ...(from.value ? { createdFrom: from.value } : {}),
  ...(to.value ? { createdTo: to.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));
const query = useQuery({
    queryKey: computed(() => productAttributeKeys.list(params.value)),
    queryFn: ({ signal }) =>
      listProductAttributes(params.value, undefined, signal),
    placeholderData: keepPreviousData,
  }),
  rows = computed(() => query.data.value?.data ?? []),
  meta = computed(() => query.data.value?.meta),
  hasFilters = computed(() =>
    Boolean(
      search.value || usage.value || type.value || from.value || to.value,
    ),
  );
const filters: DataTableFilterableColumn[] = [
    {
      id: "usageCount",
      title: "Trạng thái sử dụng",
      operator: "in",
      options: [
        { label: "Đang được sử dụng", value: "USED" },
        { label: "Chưa được sử dụng", value: "UNUSED" },
      ],
    },
    {
      id: "type",
      title: "Kiểu dữ liệu",
      operator: "in",
      options: PRODUCT_ATTRIBUTE_TYPE_OPTIONS.map((o) => ({
        label: o.label,
        value: o.value,
      })),
    },
  ],
  dates: DataTableDateColumn[] = [
    {
      id: "createdAt",
      title: "Ngày tạo",
      placeholder: "Khoảng ngày tạo",
      mode: "range",
      enablePresets: true,
      disableFutureDates: true,
      dateFormatPattern: "DD/MM/YYYY",
    },
  ];
function onQuery(q: DataTableQuery) {
  const n = toProductAttributeListParams(q);
  page.value = n.page ?? 1;
  limit.value = n.limit ?? 10;
  search.value = n.search ?? "";
  usage.value = n.usageStatus;
  type.value = n.type;
  from.value = n.createdFrom;
  to.value = n.createdTo;
  sortBy.value = n.sortBy ?? "createdAt";
  sortOrder.value = n.sortOrder ?? "desc";
}
function create() {
  editing.value = null;
  formOpen.value = true;
}
function edit(r: ProductAttributeResponseDto) {
  editing.value = r;
  formOpen.value = true;
}
function openDelete(r: ProductAttributeResponseDto) {
  deleting.value = r;
  deleteOpen.value = true;
}
async function remove() {
  if (!deleting.value || pending.value) return;
  pending.value = true;
  try {
    await deleteProductAttribute(deleting.value.id);
    await client.invalidateQueries({ queryKey: productAttributeKeys.all });
    toast.success("Xóa thuộc tính sản phẩm thành công.");
    deleteOpen.value = false;
  } catch (e) {
    toast.error(
      masterDataErrorMessage(e, "Không thể xóa thuộc tính sản phẩm."),
    );
    await query.refetch();
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý sản phẩm"
      :group-to="{ name: 'super-admin-categories' }"
      section-label="Thuộc tính sản phẩm"
    />
    <div class="flex flex-col gap-4 sm:flex-row sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold sm:text-3xl">Thuộc tính sản phẩm</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý các định nghĩa thuộc tính mô tả, không dùng để tạo SKU.
        </p>
      </div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.PRODUCT_ATTRIBUTES_CREATE]"
        ><Button @click="create"
          ><Plus class="mr-2 h-4 w-4" />Thêm thuộc tính</Button
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
      :global-search="{
        columnIds: ['name', 'code'],
        placeholder: 'Tìm theo tên hoặc mã thuộc tính...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :date-columns="dates"
      :config="{
        tableId: 'product-attribute-management',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        searchDebounce: 400,
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
          filterIds: ['usageCount', 'type', 'createdAt'],
          filterParamMap: { usageCount: 'usageStatus' },
          arrayFilterIds: ['usageCount', 'type'],
          stringFilterIds: ['usageCount', 'type'],
          replace: true,
        },
      }"
      @update:query="onQuery"
      @retry="query.refetch()"
      ><template #toolbar-right
        ><Button size="sm" variant="outline" @click="query.refetch()"
          ><RefreshCcw class="mr-2 h-4 w-4" />Tải lại</Button
        ></template
      ><template #row-actions="{ rowData }"
        ><MasterDataActionsMenu
          :can-update="can(ADMIN_PERMISSIONS.PRODUCT_ATTRIBUTES_UPDATE)"
          :can-delete="can(ADMIN_PERMISSIONS.PRODUCT_ATTRIBUTES_DELETE)"
          :delete-disabled="rowData.usageCount > 0"
          @view="
            router.push({
              name: 'super-admin-product-attribute-detail',
              params: { id: rowData.id },
            })
          "
          @edit="edit(rowData)"
          @delete="openDelete(rowData)" /></template
      ><template #empty
        ><div
          class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
        >
          <SlidersHorizontal class="h-9 w-9" />
          <p class="font-medium text-foreground">
            {{
              hasFilters
                ? "Không tìm thấy thuộc tính phù hợp"
                : "Chưa có thuộc tính sản phẩm"
            }}
          </p>
        </div></template
      ></DataTable
    >
  </section>
  <ProductAttributeFormDialog
    v-model:open="formOpen"
    :mode="editing ? 'update' : 'create'"
    :attribute="editing"
  /><MasterDataDeleteDialog
    v-model:open="deleteOpen"
    :name="deleting?.name ?? ''"
    title="Xóa thuộc tính sản phẩm?"
    description="Chỉ có thể xóa khi thuộc tính chưa có giá trị trên sản phẩm. Hành động này không thể hoàn tác."
    :pending="pending"
    @confirm="remove"
  />
</template>
