<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { MoreHorizontal, Plus, RefreshCcw } from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import type {
  StockReceiptListItemResponseDto,
  StockReceiptsListParams,
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
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranchStore } from "@/stores/branch.store";
import { inventoryKeys } from "../api/inventory-query-keys";
import { listStockReceipts } from "../api/inventory-api";
import { createReceiptColumns, isReceiptSortBy } from "../components/inventory-columns";

const route = useRoute();
const router = useRouter();
const branchStore = useBranchStore();
const { can, canAny } = useAdminPermissions();
const page = ref(1);
const limit = ref(10);
const search = ref("");
const status = ref<StockReceiptsListParams["status"]>();
const createdFrom = ref<string>();
const createdTo = ref<string>();
const sortBy = ref<StockReceiptsListParams["sortBy"]>("createdAt");
const sortOrder = ref<StockReceiptsListParams["sortOrder"]>("desc");
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const routePrefix = computed(() =>
  String(route.name).startsWith("super-admin") ? "super-admin" : "branch-admin",
);
const columns = computed(() => createReceiptColumns(routePrefix.value));
const params = computed<StockReceiptsListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(status.value ? { status: status.value } : {}),
  ...(createdFrom.value ? { createdFrom: createdFrom.value } : {}),
  ...(createdTo.value ? { createdTo: createdTo.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));
const query = useQuery({
  queryKey: computed(() =>
    inventoryKeys.receipts(branchId.value, params.value),
  ),
  queryFn: ({ signal }) => listStockReceipts(params.value, signal),
  enabled: computed(() => Boolean(branchId.value)),
  placeholderData: keepPreviousData,
});
const filters: DataTableFilterableColumn[] = [
  {
    id: "status",
    title: "Trạng thái",
    operator: "in",
    multiple: false,
    options: [
      { label: "Bản nháp", value: "DRAFT" },
      { label: "Đã xác nhận", value: "CONFIRMED" },
      { label: "Đã hủy", value: "CANCELLED" },
    ],
  },
];
const dates: DataTableDateColumn[] = [
  {
    id: "createdAt",
    title: "Ngày tạo",
    placeholder: "Khoảng ngày tạo",
    mode: "range",
    enablePresets: true,
    dateFormatPattern: "DD/MM/YYYY",
  },
];

function handleQuery(value: DataTableQuery) {
  page.value = value.page;
  limit.value = value.pageSize;
  search.value = value.search?.value ?? "";
  const nextStatus = value.filters?.find(({ id }) => id === "status")?.value;
  status.value = typeof nextStatus === "string" && ["DRAFT", "CONFIRMED", "CANCELLED"].includes(nextStatus)
    ? nextStatus as StockReceiptsListParams["status"]
    : undefined;
  const date = value.filters?.find(({ id }) => id === "createdAt")?.value as
    { start?: string; end?: string } | undefined;
  createdFrom.value = date?.start;
  createdTo.value = date?.end;
  const sorting = value.sort?.[0];
  sortBy.value = sorting && isReceiptSortBy(sorting.id) ? sorting.id : "createdAt";
  sortOrder.value = sorting?.desc === false ? "asc" : "desc";
}

function openDetail(
  row: StockReceiptListItemResponseDto,
  action?: "confirm" | "cancel",
) {
  void router.push({
    name: `${routePrefix.value}-stock-receipt-detail`,
    params: { id: row.id },
    ...(action ? { query: { action } } : {}),
  });
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Kho & tồn"
      :group-to="{ name: `${routePrefix}-stock-receipts` }"
      section-label="Phiếu nhập kho"
    />
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Phiếu nhập kho
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý nhập kho tại {{ branchStore.scopeLabel }}.
        </p>
      </div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.STOCK_RECEIPTS_CREATE]"
        ><Button
          @click="router.push({ name: `${routePrefix}-stock-receipt-create` })"
          ><Plus class="mr-2 size-4" />Tạo phiếu nhập</Button
        ></PermissionGate
      >
    </div>
    <DataTable
      :columns="columns"
      :data="query.data.value?.data ?? []"
      :page-count="query.data.value?.meta.lastPage"
      :row-count="query.data.value?.meta.total"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :global-search="{ columnIds: ['code'], placeholder: 'Tìm mã phiếu...' }"
      :filterable-columns="filters"
      :date-columns="dates"
      :config="{
        tableId: 'stock-receipts',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        emitInitialQuery: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        enableColumnVisibility: true,
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['status', 'createdAt'],
          stringFilterIds: ['status'],
          replace: true,
        },
      }"
      @update:query="handleQuery"
      @row-click="openDetail"
      @retry="query.refetch()"
      >
      <template #error>
        <div class="space-y-1 text-center">
          <p class="font-medium">Không thể tải danh sách phiếu nhập.</p>
          <p class="text-sm text-muted-foreground">Bộ lọc hoặc sắp xếp có thể không hợp lệ. Vui lòng đặt lại lựa chọn và thử lại.</p>
        </div>
      </template>
      <template #toolbar-right>
        <Button size="sm" variant="outline" @click="query.refetch()">
          <RefreshCcw class="mr-2 size-4" />Tải lại
        </Button>
      </template>
      <template #row-actions="{ rowData }">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="icon-sm" variant="ghost" title="Thao tác phiếu nhập" aria-label="Mở menu thao tác phiếu nhập" @click.stop>
              <MoreHorizontal class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" @click.stop>
            <DropdownMenuItem @select="openDetail(rowData)">Xem chi tiết</DropdownMenuItem>
            <template v-if="rowData.status === 'DRAFT' && canAny([
              ADMIN_PERMISSIONS.STOCK_RECEIPTS_UPDATE,
              ADMIN_PERMISSIONS.STOCK_RECEIPTS_CONFIRM,
              ADMIN_PERMISSIONS.STOCK_RECEIPTS_CANCEL,
            ])">
              <DropdownMenuSeparator />
              <DropdownMenuItem
                v-if="can(ADMIN_PERMISSIONS.STOCK_RECEIPTS_UPDATE)"
                @select="router.push({ name: `${routePrefix}-stock-receipt-edit`, params: { id: rowData.id } })"
              >Chỉnh sửa</DropdownMenuItem>
              <DropdownMenuItem
                v-if="can(ADMIN_PERMISSIONS.STOCK_RECEIPTS_CONFIRM)"
                @select="openDetail(rowData, 'confirm')"
              >Xác nhận nhập kho</DropdownMenuItem>
              <DropdownMenuItem
                v-if="can(ADMIN_PERMISSIONS.STOCK_RECEIPTS_CANCEL)"
                class="text-destructive focus:text-destructive"
                @select="openDetail(rowData, 'cancel')"
              >Hủy phiếu</DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
      </DataTable>
  </section>
</template>
