<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { RefreshCcw } from "@lucide/vue";
import { useRoute } from "vue-router";
import type { InventoryMovementsListParams } from "@/api/generated/models";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import { Button } from "@/components/ui/button";
import { useBranchStore } from "@/stores/branch.store";
import { listInventoryMovements } from "../api/inventory-api";
import { inventoryKeys } from "../api/inventory-query-keys";
import { INVENTORY_LIST_QUERY_POLICY } from "../api/inventory-query-policy";
import { createMovementColumns } from "../components/inventory-columns";

const route = useRoute();
const branchStore = useBranchStore();
const columns = createMovementColumns();
const page = ref(1);
const limit = ref(20);
const search = ref("");
const type = ref<InventoryMovementsListParams["type"]>();
const dateFrom = ref<string>();
const dateTo = ref<string>();
const sortOrder = ref<InventoryMovementsListParams["sortOrder"]>("desc");
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const params = computed<InventoryMovementsListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(type.value ? { type: type.value } : {}),
  ...(dateFrom.value ? { dateFrom: dateFrom.value } : {}),
  ...(dateTo.value ? { dateTo: dateTo.value } : {}),
  sortOrder: sortOrder.value,
}));
const query = useQuery({
  ...INVENTORY_LIST_QUERY_POLICY,
  queryKey: computed(() =>
    inventoryKeys.movements(branchId.value, params.value),
  ),
  queryFn: ({ signal }) => listInventoryMovements(params.value, signal),
  enabled: computed(() => Boolean(branchId.value)),
  placeholderData: keepPreviousData,
});
const filters: DataTableFilterableColumn[] = [
  {
    id: "type",
    title: "Loại biến động",
    operator: "in",
    multiple: false,
    options: [
      { label: "Điều chỉnh thủ công", value: "MANUAL_ADJUSTMENT" },
      { label: "Xác nhận phiếu nhập", value: "STOCK_RECEIPT_CONFIRMED" },
      { label: "Trừ tồn đơn hàng", value: "ORDER_STOCK_DEDUCTED" },
      { label: "Hoàn tồn đơn hàng", value: "ORDER_STOCK_RESTORED" },
    ],
  },
];
const dates: DataTableDateColumn[] = [
  {
    id: "createdAt",
    title: "Thời gian",
    placeholder: "Khoảng thời gian",
    mode: "range",
    enablePresets: true,
    dateFormatPattern: "DD/MM/YYYY",
  },
];

function handleQuery(value: DataTableQuery) {
  page.value = value.page;
  limit.value = value.pageSize;
  search.value = value.search?.value ?? "";
  const nextType = value.filters?.find(({ id }) => id === "type")?.value;
  type.value =
    typeof nextType === "string" &&
    [
      "MANUAL_ADJUSTMENT",
      "STOCK_RECEIPT_CONFIRMED",
      "ORDER_STOCK_DEDUCTED",
      "ORDER_STOCK_RESTORED",
    ].includes(nextType)
      ? (nextType as InventoryMovementsListParams["type"])
      : undefined;
  const date = value.filters?.find(({ id }) => id === "createdAt")?.value as
    { start?: string; end?: string } | undefined;
  dateFrom.value = date?.start;
  dateTo.value = date?.end;
  sortOrder.value = value.sort?.[0]?.desc === false ? "asc" : "desc";
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Kho & tồn"
      :group-to="{ name: String(route.name) }"
      section-label="Nhật ký tồn kho"
    />
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Nhật ký tồn kho
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Truy vết mọi lần tăng, giảm tồn tại {{ branchStore.scopeLabel }}.
      </p>
    </div>
    <DataTable
      :columns="columns"
      :data="query.data.value?.data ?? []"
      :page-count="query.data.value?.meta.lastPage"
      :row-count="query.data.value?.meta.total"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :global-search="{
        columnIds: ['product', 'source', 'actor'],
        placeholder:
          'Tìm sản phẩm, biến thể, SKU, mã nguồn hoặc người thao tác...',
      }"
      :filterable-columns="filters"
      :date-columns="dates"
      :page-size-options="[20, 50]"
      :config="{
        tableId: 'inventory-movements',
        rowIdKey: 'id',
        pageSize: 20,
        maxPageSize: 50,
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
          filterIds: ['type', 'createdAt'],
          stringFilterIds: ['type'],
          replace: true,
        },
      }"
      @update:query="handleQuery"
      @retry="query.refetch()"
    >
      <template #error>
        <div class="space-y-1 text-center">
          <p class="font-medium">Không thể tải nhật ký tồn kho.</p>
          <p class="text-sm text-muted-foreground">
            Vui lòng đặt lại bộ lọc hoặc thử lại.
          </p>
        </div>
      </template>
      <template #toolbar-right>
        <Button size="sm" variant="outline" @click="query.refetch()"
          ><RefreshCcw class="mr-2 size-4" />Tải lại</Button
        >
      </template>
    </DataTable>
  </section>
</template>
