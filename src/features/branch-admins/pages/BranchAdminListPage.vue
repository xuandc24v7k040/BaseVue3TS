<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { Eye, Plus, RefreshCcw, UserRoundCog } from "@lucide/vue";
import { useRouter } from "vue-router";
import type {
  BranchAdminsListAssignmentState,
  BranchAdminsListParams,
  BranchAdminsListSortBy,
  BranchAdminsListSortOrder,
  BranchesListParams,
} from "@/api/generated/models";
import type {
  DataTableAction,
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import DataTableActions from "@/components/admin/table/DataTableActions.vue";
import { Button } from "@/components/ui/button";
import { listBranches } from "@/features/branches/api/branch-api";
import { branchKeys } from "@/features/branches/api/branch-query-keys";
import { branchAdminKeys } from "../api/branch-admin-query-keys";
import { listBranchAdmins } from "../api/branch-admin-api";
import type { BranchAdmin } from "../types";
import BranchAdminCreateDialog from "../components/BranchAdminCreateDialog.vue";
import { createBranchAdminColumns } from "../components/branch-admin-columns";
import { toBranchAdminListParams } from "../adapters/branch-admin-list-query.adapter";

const router = useRouter();
const page = ref(1);
const limit = ref(10);
const search = ref("");
const isActive = ref<boolean | undefined>();
const assignmentState = ref<BranchAdminsListAssignmentState | undefined>();
const assignedBranchId = ref<string | undefined>();
const sortBy = ref<BranchAdminsListSortBy>("createdAt");
const sortOrder = ref<BranchAdminsListSortOrder>("desc");
const createOpen = ref(false);
const columns = createBranchAdminColumns();
const params = computed<BranchAdminsListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(isActive.value === undefined ? {} : { isActive: isActive.value }),
  ...(assignmentState.value ? { assignmentState: assignmentState.value } : {}),
  ...(assignedBranchId.value
    ? { assignedBranchId: assignedBranchId.value }
    : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));
const branchOptionParams: BranchesListParams = {
  page: 1,
  limit: 100,
  sortBy: "name",
  sortOrder: "asc",
};
const branchOptionsQuery = useQuery({
  queryKey: branchKeys.list(null, branchOptionParams),
  queryFn: ({ signal }) => listBranches(branchOptionParams, null, signal),
  staleTime: 60_000,
});
const filters = computed<DataTableFilterableColumn[]>(() => [
  {
    id: "isActive",
    title: "Trạng thái tài khoản",
    operator: "in",
    options: [
      { label: "Đang hoạt động", value: "true", variant: "success" },
      { label: "Đã khóa", value: "false", variant: "destructive" },
    ],
  },
  {
    id: "assignmentState",
    title: "Trạng thái phân công",
    operator: "in",
    options: [
      { label: "Chưa phân công", value: "UNASSIGNED", variant: "muted" },
      { label: "Có phân công hoạt động", value: "ACTIVE", variant: "success" },
      {
        label: "Chỉ có phân công ngừng",
        value: "INACTIVE_ONLY",
        variant: "warning",
      },
    ],
  },
  {
    id: "assignedBranchId",
    title: "Chi nhánh",
    operator: "in",
    options: (branchOptionsQuery.data.value?.data ?? []).map((branch) => ({
      label: branch.name,
      value: branch.id,
    })),
  },
]);
const query = useQuery({
  queryKey: computed(() => branchAdminKeys.list(params.value)),
  queryFn: ({ signal }) => listBranchAdmins(params.value, signal),
  placeholderData: (previous) => previous,
});
const rows = computed(() => query.data.value?.data ?? []);
const meta = computed(() => query.data.value?.meta);

function handleQueryChange(value: DataTableQuery): void {
  const next = toBranchAdminListParams(value);
  page.value = next.page ?? 1;
  limit.value = next.limit ?? 10;
  search.value = next.search ?? "";
  isActive.value = next.isActive;
  assignmentState.value = next.assignmentState;
  assignedBranchId.value = next.assignedBranchId;
  sortBy.value = next.sortBy ?? "createdAt";
  sortOrder.value = next.sortOrder ?? "desc";
}

function rowActions(admin: BranchAdmin): DataTableAction[] {
  return [
    {
      key: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: async () => {
        await router.push({
          name: "super-admin-branch-admin-detail",
          params: { id: admin.id },
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
      :group-to="{ name: 'super-admin-branch-admins' }"
      section-label="Quản trị viên chi nhánh"
    />
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Quản trị viên chi nhánh
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý tài khoản và các phân công chi nhánh của Branch Admin.
        </p>
      </div>
      <PermissionGate
        :all-of="[
          ADMIN_PERMISSIONS.BRANCH_ADMIN_ASSIGN,
          ADMIN_PERMISSIONS.BRANCHES_ASSIGN,
        ]"
        ><Button type="button" @click="createOpen = true"
          ><Plus class="mr-2 h-4 w-4" />Thêm quản trị viên</Button
        ></PermissionGate
      >
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
        tableId: 'branch-admin-management',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        searchDebounce: 400,
        queryDebounce: 0,
        emitInitialQuery: true,
        enableColumnVisibility: true,
        initialColumnVisibility: {
          assignmentState: false,
          assignedBranchId: false,
        },
        stickyActionColumn: true,
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['isActive', 'assignmentState', 'assignedBranchId'],
          arrayFilterIds: ['isActive', 'assignmentState', 'assignedBranchId'],
          stringFilterIds: ['isActive', 'assignmentState', 'assignedBranchId'],
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
          ><RefreshCcw class="mr-2 h-4 w-4" />Tải lại</Button
        ></template
      >
      <template #row-actions="{ rowData }"
        ><DataTableActions
          :label="rowData.fullName"
          :actions="rowActions(rowData)"
      /></template>
      <template #empty
        ><div
          class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
        >
          <UserRoundCog class="h-9 w-9" />
          <p class="font-medium text-foreground">
            {{
              search ||
              isActive !== undefined ||
              assignmentState ||
              assignedBranchId
                ? "Không tìm thấy quản trị viên phù hợp"
                : "Chưa có quản trị viên chi nhánh"
            }}
          </p>
          <p class="text-sm">
            {{
              search ||
              isActive !== undefined ||
              assignmentState ||
              assignedBranchId
                ? "Thử thay đổi từ khóa hoặc bộ lọc."
                : "Tạo quản trị viên đầu tiên để bắt đầu."
            }}
          </p>
        </div></template
      >
    </DataTable>
  </section>
  <BranchAdminCreateDialog v-model:open="createOpen" />
</template>
