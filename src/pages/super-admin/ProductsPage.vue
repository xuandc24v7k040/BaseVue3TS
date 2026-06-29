<template>
  <AdminPagePlaceholder
    title="Sản phẩm"
    description="Bảng kiểm thử DataTable bằng DummyJSON Products với phân trang, tìm kiếm và sắp xếp server-side."
    scope="super-admin"
  >
    <div class="min-w-0 max-w-full space-y-4 overflow-hidden">
      <div
        class="flex min-w-0 flex-col gap-3 border-b pb-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="min-w-0 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">DummyJSON</Badge>
            <Badge
              v-for="feature in supportedFeatureLabels"
              :key="feature"
              variant="outline"
              class="capitalize"
            >
              {{ feature }}
            </Badge>
          </div>
          <p class="max-w-full truncate font-mono text-xs">
            {{
              latestRequestUrl || `${dummyJsonProductsSource.baseUrl}/products`
            }}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="isLoading"
          aria-label="Làm mới dữ liệu sản phẩm DummyJSON"
          @click="retry"
        >
          <RefreshCw
            :class="['mr-2 h-4 w-4', isLoading ? 'animate-spin' : undefined]"
          />
          Làm mới
        </Button>
      </div>

      <div class="min-w-0 max-w-full overflow-hidden p-1">
        <DataTable
          :columns="productColumns"
          :data="products"
          :page-count="pageCount"
          :row-count="rowCount"
          :is-loading="isLoading"
          :error="error"
          :global-search="globalSearch"
          :filterable-columns="filterableColumns"
          :config="tableConfig"
          :page-size-options="[10, 20, 30, 50]"
          @update:query="handleQueryChange"
          @retry="retry"
        />
      </div>
    </div>
  </AdminPagePlaceholder>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { RefreshCw } from "@lucide/vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import AdminPagePlaceholder from "@/components/AdminPagePlaceholder.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  DataTableConfig,
  DataTableFilterableColumn,
  DataTableGlobalSearch,
  DataTableQuery,
} from "@/components/admin/table/interface";
import {
  createDummyJsonProductsRequest,
  dummyJsonProductFilterOptions,
  dummyJsonProductsSource,
  fetchDummyJsonProducts,
} from "@/components/admin/table/examples/sources/dummyjson";
import {
  productColumns,
  type ProductTableRow,
} from "./products/product-columns";

const products = ref<ProductTableRow[]>([]);
const pageCount = ref(0);
const rowCount = ref(0);
const isLoading = ref(false);
const error = ref<string | null>(null);
const latestRequestUrl = ref("");
const latestQuery = ref<DataTableQuery>({
  page: 1,
  pageSize: dummyJsonProductsSource.defaultLimit,
});

let activeController: AbortController | null = null;
let latestRequestId = 0;

const globalSearch: DataTableGlobalSearch = {
  columnIds: ["title", "brand", "category"],
  title: "Search products",
  placeholder: "Tìm sản phẩm...",
};

const filterableColumns: DataTableFilterableColumn[] = [
  {
    id: "category",
    title: "Danh mục",
    options: dummyJsonProductFilterOptions.category,
  },
  {
    id: "priceRange",
    title: "Khoảng giá",
    options: dummyJsonProductFilterOptions.priceRange,
  },
  {
    id: "ratingRange",
    title: "Rating",
    options: dummyJsonProductFilterOptions.ratingRange,
  },
  {
    id: "stockStatus",
    title: "Tồn kho",
    options: dummyJsonProductFilterOptions.stockStatus,
  },
  {
    id: "discountRange",
    title: "Giảm giá",
    options: dummyJsonProductFilterOptions.discountRange,
  },
];

const tableConfig: DataTableConfig<ProductTableRow> = {
  tableId: "dummyjson-products-table",
  rowIdKey: "id",
  storageKey: "123",
  pageSize: dummyJsonProductsSource.defaultLimit,
  maxPageSize: 50,
  queryDebounce: 300,
  enableColumnVisibility: true,
  initialColumnVisibility: {
    priceRange: false,
    ratingRange: false,
    stockStatus: false,
    discountRange: false,
  },
  persistence: {
    key: "dummyjson-products-table",
    version: 2,
    pageSize: true,
    columns: true,
    sorting: true,
  },
  routeSync: {
    enabled: true,
    mode: "compact",
    replace: true,
    paramNames: {
      search: "q",
      page: "page",
      pageSize: "limit",
      sort: "sort",
    },
    filterIds: [
      "category",
      "priceRange",
      "ratingRange",
      "stockStatus",
      "discountRange",
    ],
    arrayFilterIds: [
      "category",
      "priceRange",
      "ratingRange",
      "stockStatus",
      "discountRange",
    ],
    stringFilterIds: [
      "category",
      "priceRange",
      "ratingRange",
      "stockStatus",
      "discountRange",
    ],
    filterParamMap: {
      category: "category",
      priceRange: "price",
      ratingRange: "rating",
      stockStatus: "stock",
      discountRange: "discount",
    },
  },
};

const supportedFeatureLabels = computed(() =>
  Object.entries(dummyJsonProductsSource.supportedFeatures)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature),
);

function handleQueryChange(query: DataTableQuery) {
  void fetchProducts(query);
}

function retry() {
  void fetchProducts(latestQuery.value);
}

async function fetchProducts(query: DataTableQuery) {
  latestQuery.value = query;
  latestRequestUrl.value = createDummyJsonProductsRequest(query).url;
  error.value = null;

  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const requestId = ++latestRequestId;
  isLoading.value = true;

  try {
    const response = await fetchDummyJsonProducts(query, controller.signal);
    if (controller.signal.aborted || requestId !== latestRequestId) return;

    products.value = response.items;
    rowCount.value = response.total;
    pageCount.value = response.pageCount;
    latestRequestUrl.value = response.request.url;
  } catch (caughtError) {
    if (isAbortError(caughtError) || requestId !== latestRequestId) return;
    error.value = getErrorMessage(caughtError);
  } finally {
    if (requestId === latestRequestId) {
      isLoading.value = false;
    }
  }
}

function isAbortError(value: unknown): boolean {
  return value instanceof Error && value.name === "AbortError";
}

function getErrorMessage(value: unknown): string {
  if (value instanceof Error && value.message) return value.message;
  return "Không thể tải dữ liệu sản phẩm từ DummyJSON.";
}

onBeforeUnmount(() => {
  activeController?.abort();
});
</script>
