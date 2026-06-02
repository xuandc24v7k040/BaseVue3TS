<script setup lang="ts">
import { computed, h, ref } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import {
  CheckCircle2,
  Clock,
  Eye,
  Pencil,
  Plus,
  RefreshCcw,
  Shield,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-vue-next";

import DataTable from "@/components/admin/table/DataTable.vue";
import DataTableActions from "@/components/admin/table/DataTableActions.vue";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createDataTableApiQueryAdapter } from "@/components/admin/table/adapters";
import {
  defineDataTableColumns,
  type ColumnHeaderMode,
  type DataTableAction,
  type DataTableFilterQuery,
  type DataTableQuery,
} from "@/components/admin/table/interface";

type UserStatus = "active" | "inactive" | "invited" | "removed";
type UserRole = "admin" | "manager" | "staff" | "customer";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  orders: number;
  totalSpent: number;
  createdAt: string;
  note: string;
  children?: UserRow[];
}

const usersSeed: UserRow[] = [
  {
    id: "u_001",
    name: "Nguyễn Văn An",
    email: "an@example.com",
    phone: "0901000001",
    role: "admin",
    status: "active",
    orders: 12,
    totalSpent: 4500000,
    createdAt: "2026-05-01",
    note: "Tài khoản quản trị chính",
    children: [
      {
        id: "u_001_log_1",
        name: "Lịch sử: đăng nhập",
        email: "an@example.com",
        phone: "-",
        role: "admin",
        status: "active",
        orders: 0,
        totalSpent: 0,
        createdAt: "2026-05-02",
        note: "Đăng nhập từ Chrome",
      },
    ],
  },
  {
    id: "u_002",
    name: "Trần Minh Bình",
    email: "binh@example.com",
    phone: "0901000002",
    role: "manager",
    status: "inactive",
    orders: 8,
    totalSpent: 2800000,
    createdAt: "2026-05-04",
    note: "Tạm khóa do chưa xác minh",
  },
  {
    id: "u_003",
    name: "Lê Hoàng Nam",
    email: "nam@example.com",
    phone: "0901000003",
    role: "staff",
    status: "invited",
    orders: 0,
    totalSpent: 0,
    createdAt: "2026-05-08",
    note: "Đã gửi lời mời",
  },
  {
    id: "u_004",
    name: "Phạm Gia Hân",
    email: "han@example.com",
    phone: "0901000004",
    role: "customer",
    status: "active",
    orders: 22,
    totalSpent: 9200000,
    createdAt: "2026-05-12",
    note: "Khách hàng thân thiết",
  },
  {
    id: "u_005",
    name: "Võ Thanh Tùng",
    email: "tung@example.com",
    phone: "0901000005",
    role: "customer",
    status: "removed",
    orders: 3,
    totalSpent: 700000,
    createdAt: "2026-05-18",
    note: "Đã xóa mềm",
  },
];

const roleOptions = [
  { label: "Admin", value: "admin", icon: Shield },
  { label: "Manager", value: "manager", icon: Users },
  { label: "Staff", value: "staff", icon: User },
  { label: "Customer", value: "customer", icon: User },
];

const statusOptions = [
  {
    label: "Hoạt động",
    value: "active",
    icon: CheckCircle2,
    variant: "active" as const,
  },
  {
    label: "Tạm khóa",
    value: "inactive",
    icon: XCircle,
    variant: "inactive" as const,
  },
  {
    label: "Đã mời",
    value: "invited",
    icon: Clock,
    variant: "invited" as const,
  },
  {
    label: "Đã xóa",
    value: "removed",
    icon: Trash2,
    variant: "removed" as const,
  },
];

const data = ref<UserRow[]>([]);
const selectedRowIds = ref<string[]>([]);
const rowCount = ref(0);
const pageCount = ref(1);
const isLoading = ref(false);
const error = ref<string | null>(null);
const lastQuery = ref<DataTableQuery>({
  page: 1,
  pageSize: 5,
});

const toApiParams = createDataTableApiQueryAdapter({
  pageSizeKey: "limit",
  multiSort: true,
});

const selectedRowsInCurrentPage = computed(() =>
  data.value.filter((row) => selectedRowIds.value.includes(row.id)),
);

function renderColumnHeader(
  column: Column<UserRow, unknown>,
  title: string,
  mode?: ColumnHeaderMode,
) {
  return h(DataTableColumnHeader<UserRow>, {
    column,
    title,
    ...(mode ? { mode } : {}),
  });
}

const columns = defineDataTableColumns<UserRow>([
  {
    accessorKey: "name",
    header: ({ column }) => renderColumnHeader(column, "Người dùng"),
    cell: ({ row }) =>
      h("div", { class: "space-y-1" }, [
        h("div", { class: "font-medium" }, row.original.name),
        h(
          "div",
          { class: "text-xs text-muted-foreground" },
          row.original.email,
        ),
      ]),
    meta: { title: "Người dùng" },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => renderColumnHeader(column, "SĐT"),
    meta: { title: "SĐT" },
  },
  {
    accessorKey: "role",
    header: ({ column }) =>
      renderColumnHeader(column, "Vai trò", {
        type: "filter",
        options: roleOptions,
      }),
    cell: ({ row }) => {
      const option = roleOptions.find(
        (item) => item.value === row.original.role,
      );
      return h(Badge, { variant: "outline", class: "gap-1" }, () => [
        option?.icon ? h(option.icon, { class: "h-3 w-3" }) : null,
        option?.label ?? row.original.role,
      ]);
    },
    meta: { title: "Vai trò", options: roleOptions },
  },
  {
    accessorKey: "status",
    header: ({ column }) =>
      renderColumnHeader(column, "Trạng thái", {
        type: "filter",
        options: statusOptions,
      }),
    cell: ({ row }) => {
      const option = statusOptions.find(
        (item) => item.value === row.original.status,
      );
      return h(
        Badge,
        { variant: option?.variant ?? "outline", class: "gap-1" },
        () => [
          option?.icon ? h(option.icon, { class: "h-3 w-3" }) : null,
          option?.label ?? row.original.status,
        ],
      );
    },
    meta: { title: "Trạng thái", options: statusOptions },
  },
  {
    accessorKey: "orders",
    header: ({ column }) => renderColumnHeader(column, "Đơn hàng"),
    cell: ({ row }) =>
      h("div", { class: "text-right tabular-nums" }, row.original.orders),
    meta: { title: "Đơn hàng" },
  },
  {
    accessorKey: "totalSpent",
    header: ({ column }) => renderColumnHeader(column, "Chi tiêu"),
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right tabular-nums" },
        new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(row.original.totalSpent),
      ),
    meta: { title: "Chi tiêu" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => renderColumnHeader(column, "Ngày tạo"),
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("vi-VN"),
    meta: { title: "Ngày tạo" },
  },
  {
    accessorKey: "note",
    header: ({ column }) =>
      renderColumnHeader(column, "Ghi chú", { type: "none" }),
    cell: ({ row }) =>
      h(
        "div",
        { class: "max-w-64 truncate text-muted-foreground" },
        row.original.note,
      ),
    meta: { title: "Ghi chú" },
  },
] satisfies ColumnDef<UserRow, unknown>[]);

function handleQueryChange(query: DataTableQuery) {
  lastQuery.value = query;
  fetchUsers(query);
}

function retry() {
  fetchUsers(lastQuery.value);
}

async function fetchUsers(query: DataTableQuery) {
  isLoading.value = true;
  error.value = null;

  try {
    await sleep(250);
    console.log("Params gửi lên API:", toApiParams(query));

    let rows = [...usersSeed];

    if (query.search?.value) {
      const keyword = query.search.value.toLowerCase();
      rows = rows.filter((user) =>
        query.search?.columnIds.some((columnId) =>
          String(user[columnId as keyof UserRow] ?? "")
            .toLowerCase()
            .includes(keyword),
        ),
      );
    }

    if (query.filters?.length) {
      rows = rows.filter((user) =>
        query.filters!.every((filter) => matchFilter(user, filter)),
      );
    }

    if (query.sort?.length) {
      rows.sort((a, b) => compareRows(a, b, query.sort!));
    }

    rowCount.value = rows.length;
    pageCount.value = Math.max(1, Math.ceil(rows.length / query.pageSize));

    const start = (query.page - 1) * query.pageSize;
    data.value = rows.slice(start, start + query.pageSize);
  } catch {
    error.value = "Không thể tải danh sách người dùng.";
  } finally {
    isLoading.value = false;
  }
}

function compareRows(
  firstRow: UserRow,
  secondRow: UserRow,
  sorting: NonNullable<DataTableQuery["sort"]>,
) {
  for (const sort of sorting) {
    const first = firstRow[sort.id as keyof UserRow] ?? "";
    const second = secondRow[sort.id as keyof UserRow] ?? "";

    if (first === second) continue;

    const result = first > second ? 1 : -1;
    return sort.desc ? -result : result;
  }

  return 0;
}

function matchFilter(user: UserRow, filter: DataTableFilterQuery) {
  const value = user[filter.id as keyof UserRow];

  if (filter.operator === "in" && Array.isArray(filter.value)) {
    return filter.value.includes(String(value));
  }

  if (filter.operator === "contains") {
    return String(value ?? "")
      .toLowerCase()
      .includes(String(filter.value).toLowerCase());
  }

  if (
    filter.operator === "between" &&
    typeof filter.value === "object" &&
    filter.value !== null &&
    !Array.isArray(filter.value)
  ) {
    const currentTime = new Date(String(value)).getTime();
    const startTime = filter.value.start
      ? new Date(filter.value.start).getTime()
      : Number.NEGATIVE_INFINITY;
    const endTime = filter.value.end
      ? new Date(filter.value.end).getTime()
      : Number.POSITIVE_INFINITY;

    return currentTime >= startTime && currentTime <= endTime;
  }

  return value === filter.value;
}

function getRowActions(row: UserRow): DataTableAction[] {
  return [
    {
      key: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: () => console.log("View:", row),
    },
    {
      key: "edit",
      label: "Chỉnh sửa",
      icon: Pencil,
      onClick: () => console.log("Edit:", row),
    },
    {
      key: "delete",
      label: "Xóa",
      icon: Trash2,
      variant: "destructive",
      separator: true,
      disabled: row.status === "removed",
      onClick: () => console.log("Delete:", row),
    },
  ];
}

function handleBulkActivate(rows: UserRow[], ids: string[]) {
  console.log("Bulk activate:", { rows, ids });
  selectedRowIds.value = [];
}

function handleBulkDelete(rows: UserRow[], ids: string[]) {
  console.log("Bulk delete:", { rows, ids });
  selectedRowIds.value = [];
}

function handleRowClick(row: UserRow) {
  console.log("Row click:", row);
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
</script>

<template>
  <div class="space-y-4 p-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Users Table</h1>
        <p class="text-sm text-muted-foreground">
          Example dùng đủ selection, actions, expanding, filters, route sync và
          persistence.
        </p>
      </div>

      <Button class="gap-2">
        <Plus class="h-4 w-4" />
        Thêm người dùng
      </Button>
    </div>

    <DataTable
      v-model:selected-row-ids="selectedRowIds"
      :columns="columns"
      :data="data"
      :page-count="pageCount"
      :row-count="rowCount"
      :is-loading="isLoading"
      :error="error"
      :enable-selection="true"
      :page-size-options="[5, 10, 20, 50, 100]"
      :global-search="{
        columnIds: ['name', 'email', 'phone'],
        placeholder: 'Tìm tên, email hoặc số điện thoại...',
        title: 'Tìm kiếm',
      }"
      :searchable-columns="[
        {
          id: 'email',
          title: 'Email',
          placeholder: 'Lọc riêng theo email...',
          operator: 'contains',
        },
      ]"
      :filterable-columns="[
        {
          id: 'role',
          title: 'Vai trò',
          options: roleOptions,
          operator: 'in',
        },
        {
          id: 'status',
          title: 'Trạng thái',
          options: statusOptions,
          operator: 'in',
        },
      ]"
      :date-columns="[
        {
          id: 'createdAt',
          title: 'Ngày tạo',
          placeholder: 'Lọc theo ngày tạo',
          operator: 'between',
        },
      ]"
      :config="{
        tableId: 'users-table-full-example',
        rowIdKey: 'id',
        pageSize: 5,
        initialPageIndex: 0,
        queryDebounce: 0,
        searchDebounce: 300,
        emitInitialQuery: true,
        enableRowSelection: true,
        enableMultiRowSelection: true,
        enableExpanding: true,
        enableColumnVisibility: true,
        expandOnRowClick: false,
        autoExpandAll: false,
        maxPageSize: 100,
        getSubRows: (row) => row.children,
        initialSorting: [
          {
            id: 'createdAt',
            desc: true,
          },
        ],
        initialColumnVisibility: {
          phone: true,
          note: true,
        },
        persistence: {
          key: 'users-table-full-example',
          version: 2,
          columns: true,
          pageSize: true,
          sorting: true,
        },
        routeSync: {
          keyPrefix: 'users',
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          replace: true,
        },
      }"
      @update:query="handleQueryChange"
      @row-click="handleRowClick"
      @retry="retry"
    >
      <template #toolbar-left="{ selectedIds }">
        <div
          v-if="selectedIds.length > 0"
          class="rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
        >
          Đã chọn {{ selectedIds.length }} dòng
        </div>
      </template>

      <template #toolbar-right>
        <Button variant="outline" size="sm" class="gap-2" @click="retry">
          <RefreshCcw class="h-4 w-4" />
          Tải lại
        </Button>
      </template>

      <template #bulk-actions="{ selectedCurrentPageRows, selectedIds }">
        <Button
          size="sm"
          variant="outline"
          class="gap-2"
          @click="handleBulkActivate(selectedCurrentPageRows, selectedIds)"
        >
          <CheckCircle2 class="h-4 w-4" />
          Kích hoạt
        </Button>

        <Button
          size="sm"
          variant="destructive"
          class="gap-2"
          @click="handleBulkDelete(selectedCurrentPageRows, selectedIds)"
        >
          <Trash2 class="h-4 w-4" />
          Xóa đã chọn
        </Button>
      </template>

      <template #before-table="{ query }">
        <pre class="overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{
          query
        }}</pre>
      </template>

      <template #row-actions="{ rowData }">
        <DataTableActions
          :label="rowData.name"
          :actions="getRowActions(rowData)"
        />
      </template>

      <template #expanded-row="{ rowData }">
        <div class="grid gap-3 p-4 text-sm md:grid-cols-3">
          <div>
            <div class="font-medium">Email</div>
            <div class="text-muted-foreground">{{ rowData.email }}</div>
          </div>
          <div>
            <div class="font-medium">Số điện thoại</div>
            <div class="text-muted-foreground">{{ rowData.phone }}</div>
          </div>
          <div>
            <div class="font-medium">Ghi chú</div>
            <div class="text-muted-foreground">{{ rowData.note }}</div>
          </div>
        </div>
      </template>

      <template #empty>
        <div
          class="flex flex-col items-center gap-2 py-10 text-muted-foreground"
        >
          <Users class="h-8 w-8" />
          <p class="text-sm font-medium text-foreground">
            Không tìm thấy người dùng
          </p>
          <p class="text-xs">Thử đổi từ khóa hoặc xóa bộ lọc.</p>
        </div>
      </template>

      <template #error="{ error: currentError, retry: retryFetch }">
        <div class="space-y-3 text-center">
          <p class="font-medium text-destructive">
            {{
              typeof currentError === "string"
                ? currentError
                : currentError.message
            }}
          </p>
          <Button size="sm" @click="retryFetch">Thử lại</Button>
        </div>
      </template>
    </DataTable>

    <div class="rounded-md border p-3 text-sm">
      <div class="font-medium">Selected IDs</div>
      <pre class="mt-2 text-xs">{{ selectedRowIds }}</pre>

      <div class="mt-3 font-medium">Selected rows trong trang hiện tại</div>
      <pre class="mt-2 text-xs">{{ selectedRowsInCurrentPage }}</pre>
    </div>
  </div>
</template>
