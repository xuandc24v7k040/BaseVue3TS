<script setup lang="ts">
import { computed, ref } from "vue";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { Eye, EyeOff, RefreshCcw, Star } from "@lucide/vue";
import { toast } from "vue-sonner";
import {
  adminReviewsList,
  adminReviewsSetVisibility,
} from "@/api/generated/endpoints/admin-reviews/admin-reviews";
import type {
  AdminReviewDto,
  AdminReviewsListParams,
} from "@/api/generated/models";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import { Button } from "@/components/ui/button";
import { adminReviewColumns } from "../components/admin-review-columns";

const page = ref(1);
const limit = ref(10);
const search = ref("");
const rating = ref<number>();
const isVisible = ref<boolean>();
const sortBy = ref<NonNullable<AdminReviewsListParams["sortBy"]>>("createdAt");
const sortOrder = ref<NonNullable<AdminReviewsListParams["sortOrder"]>>("desc");
const queryClient = useQueryClient();

const params = computed<AdminReviewsListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  ...(rating.value ? { rating: rating.value } : {}),
  ...(isVisible.value === undefined ? {} : { isVisible: isVisible.value }),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));

const query = useQuery({
  queryKey: computed(() => ["admin-reviews", params.value]),
  queryFn: async ({ signal }) =>
    (await adminReviewsList(params.value, undefined, signal)).data,
  placeholderData: keepPreviousData,
});

const visibilityMutation = useMutation({
  mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
    adminReviewsSetVisibility(id, { isVisible: visible }),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    toast.success("Đã cập nhật trạng thái hiển thị đánh giá");
  },
  onError: () => toast.error("Không thể cập nhật đánh giá."),
});

const filters: DataTableFilterableColumn[] = [
  {
    id: "rating",
    title: "Số sao",
    operator: "equals",
    multiple: false,
    options: [5, 4, 3, 2, 1].map((value) => ({
      label: `${value} sao`,
      value: String(value),
      icon: Star,
    })),
  },
  {
    id: "isVisible",
    title: "Trạng thái",
    operator: "equals",
    multiple: false,
    options: [
      { label: "Đang hiển thị", value: "true", variant: "success" },
      { label: "Đang ẩn", value: "false", variant: "muted" },
    ],
  },
];

function scalarValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

function handleQuery(value: DataTableQuery): void {
  page.value = value.page;
  limit.value = value.pageSize;
  search.value = value.search?.value ?? "";

  const ratingValue = scalarValue(
    value.filters?.find(({ id }) => id === "rating")?.value,
  );
  rating.value = ratingValue ? Number(ratingValue) : undefined;

  const visibilityValue = scalarValue(
    value.filters?.find(({ id }) => id === "isVisible")?.value,
  );
  isVisible.value =
    visibilityValue === undefined ? undefined : visibilityValue === "true";

  const sorting = value.sort?.[0];
  const sortableColumns: NonNullable<AdminReviewsListParams["sortBy"]>[] = [
    "productName",
    "orderCode",
    "customerName",
    "rating",
    "branchName",
    "isVisible",
    "createdAt",
    "updatedAt",
  ];
  sortBy.value =
    sorting &&
    sortableColumns.includes(sorting.id as (typeof sortableColumns)[number])
      ? (sorting.id as NonNullable<AdminReviewsListParams["sortBy"]>)
      : "createdAt";
  sortOrder.value = sorting?.desc === false ? "asc" : "desc";
}

function toggleVisibility(row: AdminReviewDto): void {
  visibilityMutation.mutate({ id: row.id, visible: !row.isVisible });
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Đơn hàng & thanh toán"
      :group-to="{ name: 'super-admin-orders' }"
      section-label="Đánh giá"
    />

    <header>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Quản lý đánh giá
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Tìm kiếm và kiểm duyệt đánh giá trên toàn hệ thống. Chi nhánh chỉ là
        metadata.
      </p>
    </header>

    <DataTable
      :columns="adminReviewColumns"
      :data="query.data.value?.items ?? []"
      :page-count="query.data.value?.totalPages"
      :row-count="query.data.value?.totalItems"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :global-search="{
        columnIds: ['productName', 'orderCode', 'customerName', 'content'],
        placeholder: 'Tìm sản phẩm, khách hàng, đơn hàng hoặc nội dung...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :page-size-options="[10, 20]"
      :config="{
        tableId: 'admin-reviews',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 20,
        searchDebounce: 400,
        emitInitialQuery: true,
        enableColumnVisibility: true,
        stickyActionColumn: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        initialColumnVisibility: { updatedAt: false },
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['rating', 'isVisible'],
          stringFilterIds: ['rating', 'isVisible'],
          replace: true,
        },
      }"
      @update:query="handleQuery"
      @retry="query.refetch()"
    >
      <template #toolbar-right>
        <Button size="sm" variant="outline" @click="query.refetch()">
          <RefreshCcw class="mr-2 size-4" />Tải lại
        </Button>
      </template>

      <template #row-actions="{ rowData }">
        <Button
          size="icon-sm"
          variant="outline"
          class="shrink-0"
          :aria-label="rowData.isVisible ? 'Ẩn đánh giá' : 'Hiện đánh giá'"
          :title="rowData.isVisible ? 'Ẩn đánh giá' : 'Hiện đánh giá'"
          :disabled="visibilityMutation.isPending.value"
          @click="toggleVisibility(rowData)"
        >
          <component
            :is="rowData.isVisible ? Eye : EyeOff"
            class="size-4"
            aria-hidden="true"
          />
        </Button>
      </template>

      <template #empty>
        <div class="py-12 text-center text-muted-foreground">
          <Star class="mx-auto mb-3 size-9" />
          <p class="font-medium text-foreground">Không có đánh giá phù hợp</p>
          <p class="mt-1 text-sm">Hãy thử thay đổi từ khóa hoặc bộ lọc.</p>
        </div>
      </template>

      <template #error>
        <div class="space-y-1 text-center">
          <p class="font-medium">Không thể tải danh sách đánh giá.</p>
          <p class="text-sm text-muted-foreground">
            Vui lòng đặt lại bộ lọc hoặc thử tải lại.
          </p>
        </div>
      </template>
    </DataTable>
  </section>
</template>
