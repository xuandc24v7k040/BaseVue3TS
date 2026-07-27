<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { RefreshCcw } from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import type {
  AdminOrderListItemDto,
  AdminOrdersListParams,
  AdminOrdersListPaymentMethodItem,
  AdminOrdersListPaymentStatusItem,
  AdminOrdersListStatusItem,
} from "@/api/generated/models";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import { Button } from "@/components/ui/button";
import { useBranchStore } from "@/stores/branch.store";
import { listAdminOrders } from "../api/admin-orders-api";
import { ORDER_LIST_QUERY_POLICY } from "@/features/orders/api/order-query-policy";
import { adminOrderKeys } from "../api/admin-order-query-keys";
import { createAdminOrderColumns } from "../components/admin-order-columns";

const route = useRoute();
const router = useRouter();
const branchStore = useBranchStore();
const routePrefix = computed<"super-admin" | "branch-admin">(() =>
  String(route.name).startsWith("super-admin") ? "super-admin" : "branch-admin",
);
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const page = ref(1);
const limit = ref(10);
const search = ref("");
const statuses = ref<AdminOrdersListStatusItem[]>([]);
const paymentStatuses = ref<AdminOrdersListPaymentStatusItem[]>([]);
const paymentMethods = ref<AdminOrdersListPaymentMethodItem[]>([]);
const dateFrom = ref("");
const dateTo = ref("");
const sortBy = ref<NonNullable<AdminOrdersListParams["sortBy"]>>("placedAt");
const sortOrder = ref<NonNullable<AdminOrdersListParams["sortOrder"]>>("desc");

const columns = computed(() => createAdminOrderColumns(routePrefix.value));
const params = computed<AdminOrdersListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  ...(statuses.value.length ? { status: statuses.value } : {}),
  ...(paymentStatuses.value.length
    ? { paymentStatus: paymentStatuses.value }
    : {}),
  ...(paymentMethods.value.length
    ? { paymentMethod: paymentMethods.value }
    : {}),
  ...(dateFrom.value ? { dateFrom: dateFrom.value } : {}),
  ...(dateTo.value ? { dateTo: dateTo.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));

const ordersQuery = useQuery({
  ...ORDER_LIST_QUERY_POLICY,
  queryKey: computed(() => adminOrderKeys.list(branchId.value, params.value)),
  queryFn: ({ signal }) => listAdminOrders(params.value, signal),
  enabled: computed(() => Boolean(branchId.value)),
  placeholderData: keepPreviousData,
});

const filters: DataTableFilterableColumn[] = [
  {
    id: "status",
    title: "Trạng thái",
    operator: "in",
    multiple: true,
    options: [
      { label: "Chờ thanh toán", value: "PENDING_PAYMENT" },
      { label: "Thanh toán lỗi", value: "PAYMENT_FAILED" },
      { label: "Chờ xác nhận", value: "PENDING" },
      { label: "Đã xác nhận", value: "CONFIRMED" },
      { label: "Đang xử lý", value: "PACKING" },
      { label: "Đang giao", value: "SHIPPING" },
      { label: "Hoàn thành", value: "COMPLETED" },
      { label: "Đã hủy", value: "CANCELLED" },
      { label: "Đã hoàn tiền", value: "REFUNDED" },
    ],
  },
  {
    id: "paymentStatus",
    title: "Thanh toán",
    operator: "in",
    multiple: true,
    options: [
      { label: "Chờ thanh toán", value: "PENDING" },
      { label: "Chưa thanh toán", value: "UNPAID" },
      { label: "Đã thanh toán", value: "PAID" },
      { label: "Thanh toán lỗi", value: "FAILED" },
      { label: "Đã hủy", value: "CANCELLED" },
      { label: "Đã hoàn tiền", value: "REFUNDED" },
      { label: "Hoàn một phần", value: "PARTIALLY_REFUNDED" },
    ],
  },
  {
    id: "paymentMethod",
    title: "Phương thức",
    operator: "in",
    multiple: true,
    options: [
      { label: "COD", value: "COD" },
      { label: "VNPAY", value: "VNPAY" },
    ],
  },
];
const dates: DataTableDateColumn[] = [
  {
    id: "placedAt",
    title: "Ngày đặt",
    placeholder: "Khoảng thời gian",
    mode: "range",
    enablePresets: true,
    disableFutureDates: true,
    dateFormatPattern: "DD/MM/YYYY",
  },
];

function stringValues(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" && value ? [value] : [];
}

function handleQuery(value: DataTableQuery): void {
  page.value = value.page;
  limit.value = value.pageSize;
  search.value = value.search?.value ?? "";
  statuses.value = stringValues(
    value.filters?.find(({ id }) => id === "status")?.value,
  ) as AdminOrdersListStatusItem[];
  paymentStatuses.value = stringValues(
    value.filters?.find(({ id }) => id === "paymentStatus")?.value,
  ) as AdminOrdersListPaymentStatusItem[];
  paymentMethods.value = stringValues(
    value.filters?.find(({ id }) => id === "paymentMethod")?.value,
  ) as AdminOrdersListPaymentMethodItem[];
  const placedAt = value.filters?.find(({ id }) => id === "placedAt")?.value as
    { start?: string; end?: string } | undefined;
  dateFrom.value = placedAt?.start ?? "";
  dateTo.value = placedAt?.end ?? "";
  const sorting = value.sort?.[0];
  sortBy.value =
    sorting && ["placedAt", "totalAmount", "status"].includes(sorting.id)
      ? (sorting.id as NonNullable<AdminOrdersListParams["sortBy"]>)
      : "placedAt";
  sortOrder.value = sorting?.desc === false ? "asc" : "desc";
}

function openDetail(row: AdminOrderListItemDto): void {
  void router.push({
    name: `${routePrefix.value}-order-detail`,
    params: { id: row.id },
  });
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Đơn hàng & thanh toán"
      :group-to="{ name: String(route.name) }"
      section-label="Đơn hàng"
    />

    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Quản lý đơn hàng
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Theo dõi xử lý, thanh toán và giao hàng tại
          {{ branchStore.scopeLabel }}.
        </p>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :data="ordersQuery.data.value?.data ?? []"
      :page-count="ordersQuery.data.value?.meta.lastPage"
      :row-count="ordersQuery.data.value?.meta.total"
      :is-loading="ordersQuery.isFetching.value"
      :error="ordersQuery.error.value"
      :global-search="{
        columnIds: ['orderCode'],
        placeholder: 'Tìm mã đơn, khách hàng, sản phẩm hoặc SKU...',
      }"
      :filterable-columns="filters"
      :date-columns="dates"
      :page-size-options="[10, 20, 50]"
      :config="{
        tableId: 'admin-orders',
        getRowId: (row) => row.id,
        pageSize: 10,
        maxPageSize: 50,
        emitInitialQuery: true,
        enableColumnVisibility: true,
        enableRowClick: true,
        stickyActionColumn: true,
        initialColumnVisibility: {
          paymentStatus: false,
          paymentMethod: false,
        },
        initialSorting: [{ id: 'placedAt', desc: true }],
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['status', 'paymentStatus', 'paymentMethod', 'placedAt'],
          arrayFilterIds: ['status', 'paymentStatus', 'paymentMethod'],
          stringFilterIds: ['status', 'paymentStatus', 'paymentMethod'],
          replace: true,
        },
      }"
      @update:query="handleQuery"
      @row-click="openDetail"
      @retry="ordersQuery.refetch()"
    >
      <template #error>
        <div class="space-y-1 text-center">
          <p class="font-medium">Không thể tải danh sách đơn hàng.</p>
          <p class="text-sm text-muted-foreground">
            Vui lòng kiểm tra chi nhánh, đặt lại bộ lọc hoặc thử lại.
          </p>
        </div>
      </template>

      <template #toolbar-right>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" @click="ordersQuery.refetch()">
            <RefreshCcw class="mr-2 size-4" />Tải lại
          </Button>
        </div>
      </template>
    </DataTable>
  </section>
</template>
