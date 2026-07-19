<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { Eye, Plus, RefreshCcw, UserPlus, UsersRound } from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import type { RolesListParams, StaffListParams } from "@/api/generated/models";
import type {
  DataTableAction,
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { useBranchStore } from "@/stores/branch.store";
import { useAuthStore } from "@/stores/auth.store";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import DataTableActions from "@/components/admin/table/DataTableActions.vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listStaff, listStaffRoleCatalog } from "../api/staff-api";
import { staffKeys } from "../api/staff-query-keys";
import { toStaffListParams } from "../adapters/staff-list-query.adapter";
import { createStaffColumns } from "../components/staff-columns";
import StaffCreateDialog from "../components/StaffCreateDialog.vue";
import StaffAssignExistingDialog from "../components/StaffAssignExistingDialog.vue";

const route = useRoute();
const router = useRouter();
const branchStore = useBranchStore();
const authStore = useAuthStore();
const { can } = useAdminPermissions();
const page = ref(1);
const limit = ref(10);
const search = ref("");
const params = ref<StaffListParams>({
  page: 1,
  limit: 10,
  sortBy: "assignedAt",
  sortOrder: "desc",
});
const createOpen = ref(false);
const assignOpen = ref(false);
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const columns = createStaffColumns();
const roleParams: RolesListParams = {
  page: 1,
  limit: 100,
  type: "BRANCH",
  guardName: "web",
  isActive: true,
  sortBy: "name",
  sortOrder: "asc",
};
const rolesQuery = useQuery({
  queryKey: computed(() => staffKeys.roleCatalog(branchId.value, roleParams)),
  queryFn: ({ signal }) => listStaffRoleCatalog(roleParams, signal),
  enabled: computed(
    () =>
      Boolean(branchId.value) && can(ADMIN_PERMISSIONS.ROLES_READ),
  ),
  staleTime: 60_000,
});
const query = useQuery({
  queryKey: computed(() => staffKeys.list(branchId.value, params.value)),
  queryFn: ({ signal }) => listStaff(params.value, signal),
  enabled: computed(() => Boolean(branchId.value)),
  placeholderData: (previous) => previous,
});
const rows = computed(() => query.data.value?.data ?? []);
const meta = computed(() => query.data.value?.meta);
const filters = computed<DataTableFilterableColumn[]>(() => [
  {
    id: "userIsActive",
    title: "Trạng thái tài khoản",
    operator: "in",
    options: [
      { label: "Đang hoạt động", value: "true", variant: "success" },
      { label: "Đã khóa", value: "false", variant: "destructive" },
    ],
  },
  {
    id: "assignmentIsActive",
    title: "Trạng thái phân công",
    operator: "in",
    options: [
      { label: "Đang hoạt động", value: "true", variant: "success" },
      { label: "Ngừng hoạt động", value: "false", variant: "warning" },
    ],
  },
  {
    id: "roleId",
    title: "Vai trò",
    operator: "in",
    options: (rolesQuery.data.value?.data ?? [])
      .filter(
        (role) =>
          !["BRANCH_ADMIN", "SUPER_ADMIN", "CUSTOMER"].includes(role.code),
      )
      .map((role) => ({ label: role.name, value: role.id })),
  },
  {
    id: "isPrimary",
    title: "Chi nhánh chính",
    operator: "in",
    options: [
      { label: "Có", value: "true" },
      { label: "Không", value: "false" },
    ],
  },
]);

function handleQueryChange(value: DataTableQuery): void {
  params.value = toStaffListParams(value);
  page.value = params.value.page ?? 1;
  limit.value = params.value.limit ?? 10;
  search.value = params.value.search ?? "";
}

function rowActions(staff: (typeof rows.value)[number]): DataTableAction[] {
  return [
    {
      key: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: async () => {
        await router.push({
          name: String(route.name).startsWith("branch-admin")
            ? "branch-admin-staff-detail"
            : "super-admin-staff-detail",
          params: { id: staff.id },
        });
      },
    },
  ];
}
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý nhân sự"
      :group-to="{
        name: String(route.name).startsWith('branch-admin')
          ? 'branch-admin-staff'
          : 'super-admin-branch-admins',
      }"
      section-label="Nhân viên chi nhánh"
    />
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Nhân viên chi nhánh
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý nhân viên tại {{ branchStore.selectedBranch?.name }}.
        </p>
        <span
          class="mt-2 inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium"
          >{{ branchStore.selectedBranch?.name }}</span
        >
      </div>
      <PermissionGate
        :all-of="[ADMIN_PERMISSIONS.STAFF_CREATE]"
      >
        <DropdownMenu v-if="authStore.user?.isSuperAdmin"
          ><DropdownMenuTrigger as-child
            ><Button type="button"
              ><Plus class="mr-2 size-4" />Thêm nhân viên</Button
            ></DropdownMenuTrigger
          ><DropdownMenuContent align="end" class="w-64"
            ><DropdownMenuItem @click="createOpen = true"
              ><UserPlus class="mr-2 size-4" />Tạo tài khoản nhân viên
              mới</DropdownMenuItem
            ><DropdownMenuItem @click="assignOpen = true"
              ><UsersRound class="mr-2 size-4" />Thêm nhân sự nội bộ hiện
              có</DropdownMenuItem
            ></DropdownMenuContent
          ></DropdownMenu
        >
        <Button v-else type="button" @click="createOpen = true"
          ><UserPlus class="mr-2 size-4" />Thêm nhân viên</Button
        >
      </PermissionGate>
    </div>
    <DataTable
      :columns="columns"
      :data="rows"
      :page-count="meta?.lastPage ?? 0"
      :row-count="meta?.total ?? 0"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :page-size-options="[10, 20, 50, 100]"
      :global-search="{
        columnIds: ['fullName', 'email', 'phone'],
        placeholder: 'Tìm theo họ tên, email hoặc số điện thoại...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :config="{
        tableId: 'staff-management',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        searchDebounce: 400,
        queryDebounce: 0,
        emitInitialQuery: true,
        enableColumnVisibility: true,
        stickyActionColumn: true,
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: [
            'userIsActive',
            'assignmentIsActive',
            'roleId',
            'isPrimary',
          ],
          arrayFilterIds: [
            'userIsActive',
            'assignmentIsActive',
            'roleId',
            'isPrimary',
          ],
          stringFilterIds: [
            'userIsActive',
            'assignmentIsActive',
            'roleId',
            'isPrimary',
          ],
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
          @click="query.refetch()"
          ><RefreshCcw class="mr-2 size-4" />Tải lại</Button
        ></template
      >
      <template #row-actions="{ rowData }"
        ><DataTableActions
          :label="rowData.fullName || rowData.email"
          :actions="rowActions(rowData)"
      /></template>
      <template #empty
        ><div
          class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
        >
          <UsersRound class="size-9" />
          <p class="font-medium text-foreground">
            {{
              search || Object.keys(params).length > 4
                ? "Không tìm thấy nhân viên phù hợp"
                : "Chi nhánh chưa có nhân viên"
            }}
          </p>
          <p class="text-sm">
            {{
              search
                ? "Thử thay đổi từ khóa hoặc bộ lọc."
                : "Thêm nhân viên để bắt đầu quản lý."
            }}
          </p>
        </div></template
      >
    </DataTable>
  </section>
  <StaffCreateDialog v-if="createOpen" v-model:open="createOpen" />
  <StaffAssignExistingDialog
    v-if="authStore.user?.isSuperAdmin && assignOpen"
    v-model:open="assignOpen"
  />
</template>
