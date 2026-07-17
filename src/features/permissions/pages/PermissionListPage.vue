<script setup lang="ts">
import { computed, ref } from "vue";
import { KeyRound, Plus, RefreshCcw } from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import type {
  PermissionsListParams,
  PermissionsListSortBy,
  PermissionsListSortOrder,
} from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import { Button } from "@/components/ui/button";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { toPermissionListParams } from "../adapters/permission-list-query.adapter";
import { listPermissions } from "../api/permission-api";
import { permissionKeys } from "../api/permission-query-keys";
import PermissionActionsMenu from "../components/PermissionActionsMenu.vue";
import PermissionDeleteDialog from "../components/PermissionDeleteDialog.vue";
import PermissionFormDialog from "../components/PermissionFormDialog.vue";
import { createPermissionColumns } from "../components/permission-columns";
import type { Permission, PermissionFormMode } from "../types";
import {
  PERMISSION_ACTION_OPTIONS,
  PERMISSION_RESOURCE_OPTIONS,
} from "../utils/permission-labels";

const router = useRouter();
const { can } = useAdminPermissions();
const columns = createPermissionColumns();
const page = ref(1);
const limit = ref(10);
const search = ref("");
const resource = ref<string>();
const action = ref<string>();
const createdFrom = ref<string>();
const createdTo = ref<string>();
const sortBy = ref<PermissionsListSortBy>("createdAt");
const sortOrder = ref<PermissionsListSortOrder>("desc");
const formOpen = ref(false);
const formMode = ref<PermissionFormMode>("create");
const editingPermission = ref<Permission | null>(null);
const deleteOpen = ref(false);
const deletingPermission = ref<Permission | null>(null);
const params = computed<PermissionsListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(resource.value ? { resource: resource.value } : {}),
  ...(action.value ? { action: action.value } : {}),
  ...(createdFrom.value ? { createdFrom: createdFrom.value } : {}),
  ...(createdTo.value ? { createdTo: createdTo.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));
const filters: DataTableFilterableColumn[] = [
  {
    id: "resource",
    title: "Tài nguyên",
    operator: "in",
    options: PERMISSION_RESOURCE_OPTIONS,
  },
  {
    id: "action",
    title: "Hành động",
    operator: "in",
    options: PERMISSION_ACTION_OPTIONS,
  },
];
const dateColumns: DataTableDateColumn[] = [
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
const query = useQuery({
  queryKey: computed(() => permissionKeys.list(params.value)),
  queryFn: ({ signal }) => listPermissions(params.value, signal),
});
const rows = computed(() => query.data.value?.data ?? []);
const meta = computed(() => query.data.value?.meta);
const hasFilters = computed(() =>
  Boolean(
    search.value ||
    resource.value ||
    action.value ||
    createdFrom.value ||
    createdTo.value,
  ),
);
function handleQueryChange(value: DataTableQuery): void {
  const next = toPermissionListParams(value);
  page.value = next.page ?? 1;
  limit.value = next.limit ?? 10;
  search.value = next.search ?? "";
  resource.value = next.resource;
  action.value = next.action;
  createdFrom.value = next.createdFrom;
  createdTo.value = next.createdTo;
  sortBy.value = next.sortBy ?? "createdAt";
  sortOrder.value = next.sortOrder ?? "desc";
}
function openCreate(): void {
  formMode.value = "create";
  editingPermission.value = null;
  formOpen.value = true;
}
function openEdit(permission: Permission): void {
  formMode.value = "update";
  editingPermission.value = permission;
  formOpen.value = true;
}
function openDelete(permission: Permission): void {
  deletingPermission.value = permission;
  deleteOpen.value = true;
}
</script>

<template>
  <section class="space-y-6">
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Quyền</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý danh mục quyền toàn hệ thống và theo dõi mức độ sử dụng.
        </p>
      </div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.PERMISSIONS_CREATE]"
        ><Button type="button" @click="openCreate"
          ><Plus class="mr-2 h-4 w-4" />Thêm quyền</Button
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
        columnIds: ['code', 'name', 'resource', 'action'],
        placeholder: 'Tìm theo mã, tên, tài nguyên hoặc hành động...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :date-columns="dateColumns"
      :config="{
        tableId: 'permission-management',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        searchDebounce: 400,
        queryDebounce: 0,
        emitInitialQuery: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        initialColumnVisibility: {
          name: false,
          guardName: false,
          description: false,
          updatedAt: false,
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
          filterIds: ['resource', 'action', 'createdAt'],
          arrayFilterIds: ['resource', 'action'],
          stringFilterIds: ['resource', 'action'],
          replace: true,
        },
      }"
      @update:query="handleQueryChange"
      @retry="query.refetch()"
    >
      <template #toolbar-right
        ><Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Tải lại danh sách quyền"
          @click="query.refetch()"
          ><RefreshCcw class="mr-2 h-4 w-4" />Tải lại</Button
        ></template
      >
      <template #row-actions="{ rowData }"
        ><PermissionActionsMenu
          :permission="rowData"
          :can-update="can(ADMIN_PERMISSIONS.PERMISSIONS_UPDATE)"
          :can-delete="can(ADMIN_PERMISSIONS.PERMISSIONS_DELETE)"
          @view="
            router.push({
              name: 'super-admin-permission-detail',
              params: { id: rowData.id },
            })
          "
          @edit="openEdit(rowData)"
          @delete="openDelete(rowData)"
      /></template>
      <template #empty
        ><div
          class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
        >
          <KeyRound class="h-9 w-9" />
          <p class="font-medium text-foreground">
            {{ hasFilters ? "Không tìm thấy quyền phù hợp" : "Chưa có quyền" }}
          </p>
          <p class="text-sm">
            {{
              hasFilters
                ? "Thử thay đổi từ khóa hoặc bộ lọc."
                : "Tạo quyền tùy chỉnh đầu tiên để bắt đầu."
            }}
          </p>
        </div></template
      >
    </DataTable>
  </section>
  <PermissionFormDialog
    v-model:open="formOpen"
    :mode="formMode"
    :permission="editingPermission"
  />
  <PermissionDeleteDialog
    v-model:open="deleteOpen"
    :permission="deletingPermission"
  />
</template>
