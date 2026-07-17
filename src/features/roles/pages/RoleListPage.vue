<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus, RefreshCcw, ShieldCheck } from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import type {
  RolesListParams,
  RolesListSortBy,
  RolesListSortOrder,
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
import { toRoleListParams } from "../adapters/role-list-query.adapter";
import { listRoles } from "../api/role-api";
import { roleKeys } from "../api/role-query-keys";
import RoleDeactivateDialog from "../components/RoleDeactivateDialog.vue";
import RoleActionsMenu from "../components/RoleActionsMenu.vue";
import RoleFormDialog from "../components/RoleFormDialog.vue";
import { createRoleColumns } from "../components/role-columns";
import type { Role, RoleFormMode } from "../types";

const router = useRouter();
const { can } = useAdminPermissions();
const columns = createRoleColumns();
const page = ref(1);
const limit = ref(10);
const search = ref("");
const type = ref<RolesListParams["type"]>();
const isActive = ref<boolean>();
const isSystem = ref<boolean>();
const createdFrom = ref<string>();
const createdTo = ref<string>();
const sortBy = ref<RolesListSortBy>("createdAt");
const sortOrder = ref<RolesListSortOrder>("desc");
const formOpen = ref(false);
const formMode = ref<RoleFormMode>("create");
const editingRole = ref<Role | null>(null);
const deactivateOpen = ref(false);
const deactivatingRole = ref<Role | null>(null);

const params = computed<RolesListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(type.value ? { type: type.value } : {}),
  ...(isActive.value === undefined ? {} : { isActive: isActive.value }),
  ...(isSystem.value === undefined ? {} : { isSystem: isSystem.value }),
  ...(createdFrom.value ? { createdFrom: createdFrom.value } : {}),
  ...(createdTo.value ? { createdTo: createdTo.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));

const filters: DataTableFilterableColumn[] = [
  {
    id: "type",
    title: "Loại vai trò",
    operator: "in",
    options: [
      { label: "Hệ thống", value: "SYSTEM" },
      { label: "Chi nhánh", value: "BRANCH" },
      { label: "Khách hàng", value: "CUSTOMER" },
    ],
  },
  {
    id: "isActive",
    title: "Trạng thái",
    operator: "in",
    options: [
      { label: "Đang hoạt động", value: "true", variant: "success" },
      { label: "Ngừng hoạt động", value: "false", variant: "destructive" },
    ],
  },
  {
    id: "isSystem",
    title: "Phân loại",
    operator: "in",
    options: [
      { label: "Vai trò hệ thống", value: "true" },
      { label: "Vai trò tùy chỉnh", value: "false" },
    ],
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
  queryKey: computed(() => roleKeys.list(params.value)),
  queryFn: ({ signal }) => listRoles(params.value, signal),
});
const rows = computed(() => query.data.value?.data ?? []);
const meta = computed(() => query.data.value?.meta);
const hasFilters = computed(() =>
  Boolean(
    search.value ||
    type.value ||
    isActive.value !== undefined ||
    isSystem.value !== undefined ||
    createdFrom.value ||
    createdTo.value,
  ),
);

function handleQueryChange(value: DataTableQuery): void {
  const next = toRoleListParams(value);
  page.value = next.page ?? 1;
  limit.value = next.limit ?? 10;
  search.value = next.search ?? "";
  type.value = next.type;
  isActive.value = next.isActive;
  isSystem.value = next.isSystem;
  createdFrom.value = next.createdFrom;
  createdTo.value = next.createdTo;
  sortBy.value = next.sortBy ?? "createdAt";
  sortOrder.value = next.sortOrder ?? "desc";
}
function openCreate(): void {
  formMode.value = "create";
  editingRole.value = null;
  formOpen.value = true;
}
function openEdit(role: Role): void {
  formMode.value = "update";
  editingRole.value = role;
  formOpen.value = true;
}
function openDeactivate(role: Role): void {
  deactivatingRole.value = role;
  deactivateOpen.value = true;
}
</script>

<template>
  <section class="space-y-6">
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Vai trò
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý danh mục vai trò và phạm vi áp dụng trong hệ thống.
        </p>
      </div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.ROLES_CREATE]"
        ><Button type="button" @click="openCreate"
          ><Plus class="mr-2 h-4 w-4" />Thêm vai trò</Button
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
        columnIds: ['code', 'name', 'description'],
        placeholder: 'Tìm theo mã hoặc tên vai trò...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :date-columns="dateColumns"
      :config="{
        tableId: 'role-management',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        searchDebounce: 400,
        queryDebounce: 0,
        emitInitialQuery: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        initialColumnVisibility: {
          description: false,
          guardName: false,
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
          filterIds: ['type', 'isActive', 'isSystem', 'createdAt'],
          arrayFilterIds: ['type', 'isActive', 'isSystem'],
          stringFilterIds: ['type', 'isActive', 'isSystem'],
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
          aria-label="Tải lại danh sách vai trò"
          @click="query.refetch()"
          ><RefreshCcw class="mr-2 h-4 w-4" />Tải lại</Button
        ></template
      >
      <template #row-actions="{ rowData }">
        <RoleActionsMenu
          :role="rowData"
          :can-update="can(ADMIN_PERMISSIONS.ROLES_UPDATE)"
          :can-delete="can(ADMIN_PERMISSIONS.ROLES_DELETE)"
          @view="
            router.push({
              name: 'super-admin-role-detail',
              params: { id: rowData.id },
            })
          "
          @edit="openEdit(rowData)"
          @deactivate="openDeactivate(rowData)"
        />
      </template>
      <template #empty
        ><div
          class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
        >
          <ShieldCheck class="h-9 w-9" />
          <p class="font-medium text-foreground">
            {{
              hasFilters ? "Không tìm thấy vai trò phù hợp" : "Chưa có vai trò"
            }}
          </p>
          <p class="text-sm">
            {{
              hasFilters
                ? "Thử thay đổi từ khóa hoặc bộ lọc."
                : "Tạo vai trò tùy chỉnh đầu tiên để bắt đầu."
            }}
          </p>
        </div></template
      >
    </DataTable>
  </section>
  <RoleFormDialog
    v-model:open="formOpen"
    :mode="formMode"
    :role="editingRole"
  />
  <RoleDeactivateDialog
    v-model:open="deactivateOpen"
    :role="deactivatingRole"
  />
</template>
