<script setup lang="ts">
import { computed, ref } from "vue";
import { FolderTree, Plus, RefreshCcw } from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import type { CategoriesTreeParams } from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import { Button } from "@/components/ui/button";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { toCategoryTreeParams } from "../adapters/category-list-query.adapter";
import { listCategoryTree } from "../api/category-api";
import { categoryKeys } from "../api/category-query-keys";
import CategoryActionsMenu from "../components/CategoryActionsMenu.vue";
import CategoryDeleteDialog from "../components/CategoryDeleteDialog.vue";
import CategoryFormDialog from "../components/CategoryFormDialog.vue";
import { createCategoryColumns } from "../components/category-columns";
import type { CategoryTreeNode } from "../types";

const router = useRouter();
const { can } = useAdminPermissions();
const columns = createCategoryColumns();
const params = ref<CategoriesTreeParams>({
  sortBy: "sortOrder",
  sortOrder: "asc",
});
const formOpen = ref(false);
const editing = ref<CategoryTreeNode | null>(null);
const creatingUnder = ref<CategoryTreeNode | null>(null);
const deleteOpen = ref(false);
const deleting = ref<CategoryTreeNode | null>(null);

const query = useQuery({
  queryKey: computed(() => categoryKeys.tree(params.value)),
  queryFn: ({ signal }) => listCategoryTree(params.value, signal),
});
const rows = computed(() => query.data.value?.data ?? []);
const totalCategoryCount = computed(() => {
  const pending = [...rows.value];
  let total = 0;

  while (pending.length > 0) {
    const category = pending.pop();
    if (!category) continue;
    total += 1;
    pending.push(...category.children);
  }

  return total;
});
const hasFilters = computed(() =>
  Boolean(
    params.value.search ||
    params.value.type ||
    params.value.level ||
    params.value.isActive !== undefined,
  ),
);

const filters: DataTableFilterableColumn[] = [
  {
    id: "type",
    title: "Loại",
    operator: "in",
    options: [
      { label: "Thông thường", value: "NORMAL" },
      { label: "Hệ thống", value: "SYSTEM" },
      { label: "Bộ sưu tập", value: "COLLECTION" },
      { label: "Thương hiệu", value: "BRAND" },
      { label: "Trang đích", value: "LANDING" },
    ],
  },
  {
    id: "level",
    title: "Cấp",
    operator: "in",
    options: [
      { label: "Danh mục gốc", value: "1" },
      { label: "Danh mục con", value: "2" },
    ],
  },
  {
    id: "isActive",
    title: "Trạng thái",
    operator: "in",
    options: [
      { label: "Đang hoạt động", value: "true", variant: "success" },
      { label: "Tạm ẩn", value: "false", variant: "secondary" },
    ],
  },
];

function handleQuery(value: DataTableQuery): void {
  params.value = toCategoryTreeParams(value);
}
function openCreate(): void {
  editing.value = null;
  creatingUnder.value = null;
  formOpen.value = true;
}
function openEdit(category: CategoryTreeNode): void {
  creatingUnder.value = null;
  editing.value = category;
  formOpen.value = true;
}
function openCreateChild(category: CategoryTreeNode): void {
  editing.value = null;
  creatingUnder.value = category;
  formOpen.value = true;
}
function openDelete(category: CategoryTreeNode): void {
  deleting.value = category;
  deleteOpen.value = true;
}
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Sản phẩm & danh mục"
      :group-to="{ name: 'super-admin-products' }"
      section-label="Danh mục"
    />
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Danh mục
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý cây danh mục hai cấp dùng chung cho catalog Bookora.
        </p>
      </div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.CATEGORIES_CREATE]"
        ><Button @click="openCreate"
          ><Plus class="mr-2 h-4 w-4" />Thêm danh mục</Button
        ></PermissionGate
      >
    </div>
    <DataTable
      :columns="columns"
      :data="rows"
      :row-count="totalCategoryCount"
      :enable-pagination="false"
      :show-row-count="true"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :global-search="{
        columnIds: ['name'],
        placeholder: 'Tìm theo tên danh mục...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :config="{
        tableId: 'category-management',
        rowIdKey: 'id',
        pageSize: 100,
        maxPageSize: 100,
        enableExpanding: true,
        expansionMode: 'tree',
        getSubRows: (row) => row.children,
        autoExpandOnFilterIds: ['type', 'level', 'isActive'],
        initialSorting: [{ id: 'sortOrder', desc: false }],
        stickyActionColumn: true,
        routeSync: {
          mode: 'compact',
          page: false,
          pageSize: false,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['type', 'level', 'isActive'],
          arrayFilterIds: ['type', 'level', 'isActive'],
          stringFilterIds: ['type', 'level', 'isActive'],
          replace: true,
        },
        emitInitialQuery: true,
      }"
      @update:query="handleQuery"
      @retry="query.refetch()"
    >
      <template #toolbar-right
        ><Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Tải lại danh mục"
          @click="query.refetch()"
          ><RefreshCcw class="mr-2 h-4 w-4" />Tải lại</Button
        ></template
      >
      <template #row-actions="{ rowData }"
        ><CategoryActionsMenu
          :category="rowData"
          :can-create="can(ADMIN_PERMISSIONS.CATEGORIES_CREATE)"
          :can-update="can(ADMIN_PERMISSIONS.CATEGORIES_UPDATE)"
          :can-delete="can(ADMIN_PERMISSIONS.CATEGORIES_DELETE)"
          @view="
            router.push({
              name: 'super-admin-category-detail',
              params: { id: rowData.id },
            })
          "
          @edit="openEdit(rowData)"
          @add-child="openCreateChild(rowData)"
          @delete="openDelete(rowData)"
      /></template>
      <template #empty
        ><div
          class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
        >
          <FolderTree class="h-9 w-9" />
          <p class="font-medium text-foreground">
            {{
              hasFilters
                ? "Không tìm thấy danh mục phù hợp"
                : "Chưa có danh mục"
            }}
          </p>
          <p class="text-sm">
            {{
              hasFilters
                ? "Thử thay đổi từ khóa hoặc bộ lọc."
                : "Hãy tạo danh mục đầu tiên cho catalog."
            }}
          </p>
        </div></template
      >
      <template #row-count="{ rowCount }">{{ rowCount }} danh mục</template>
    </DataTable>
  </section>
  <CategoryFormDialog
    v-model:open="formOpen"
    :mode="editing ? 'update' : 'create'"
    :category="editing"
    :initial-parent="creatingUnder"
  />
  <CategoryDeleteDialog v-model:open="deleteOpen" :category="deleting" />
</template>
