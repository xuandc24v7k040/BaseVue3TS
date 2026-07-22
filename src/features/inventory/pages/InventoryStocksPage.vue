<script setup lang="ts">
import { computed, ref } from "vue";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { RefreshCcw, Settings2 } from "@lucide/vue";
import { toast } from "vue-sonner";
import { useRoute } from "vue-router";
import type {
  BranchProductStockResponseDto,
  InventoryStocksListParams,
} from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBranchStore } from "@/stores/branch.store";
import { inventoryKeys } from "../api/inventory-query-keys";
import { listStocks, updateStockThreshold } from "../api/inventory-api";
import { createStockColumns, isStockSortBy } from "../components/inventory-columns";
import { inventoryErrorMessage } from "../utils/inventory-format";

const branchStore = useBranchStore();
const route = useRoute();
const client = useQueryClient();
const columns = createStockColumns();
const page = ref(1);
const limit = ref(10);
const search = ref("");
const stockState = ref<InventoryStocksListParams["stockState"]>();
const sortBy = ref<InventoryStocksListParams["sortBy"]>("updatedAt");
const sortOrder = ref<InventoryStocksListParams["sortOrder"]>("desc");
const editing = ref<BranchProductStockResponseDto | null>(null);
const threshold = ref(0);
const saving = ref(false);
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const params = computed<InventoryStocksListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(stockState.value ? { stockState: stockState.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));
const query = useQuery({
  queryKey: computed(() => inventoryKeys.stocks(branchId.value, params.value)),
  queryFn: ({ signal }) => listStocks(params.value, signal),
  enabled: computed(() => Boolean(branchId.value)),
  placeholderData: keepPreviousData,
});
const filters: DataTableFilterableColumn[] = [
  {
    id: "stockState",
    title: "Trạng thái tồn",
    operator: "in",
    multiple: false,
    options: [
      { label: "Còn hàng", value: "IN_STOCK" },
      { label: "Sắp hết", value: "LOW_STOCK" },
      { label: "Hết hàng", value: "OUT_OF_STOCK" },
    ],
  },
];

function handleQuery(value: DataTableQuery) {
  page.value = value.page;
  limit.value = value.pageSize;
  search.value = value.search?.value ?? "";
  const nextStockState = value.filters?.find(({ id }) => id === "stockState")?.value;
  stockState.value = typeof nextStockState === "string" && ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"].includes(nextStockState)
    ? nextStockState as InventoryStocksListParams["stockState"]
    : undefined;
  const sorting = value.sort?.[0];
  sortBy.value = sorting && isStockSortBy(sorting.id) ? sorting.id : "updatedAt";
  sortOrder.value = sorting?.desc === false ? "asc" : "desc";
}

function openThreshold(row: BranchProductStockResponseDto) {
  editing.value = row;
  threshold.value = row.lowStockThreshold;
}

async function saveThreshold() {
  if (
    !editing.value ||
    saving.value ||
    !Number.isInteger(threshold.value) ||
    threshold.value < 0
  )
    return;
  saving.value = true;
  try {
    await updateStockThreshold(editing.value.variantId, {
      lowStockThreshold: threshold.value,
    });
    await client.invalidateQueries({
      queryKey: inventoryKeys.scoped(branchId.value),
    });
    toast.success("Đã cập nhật ngưỡng tồn thấp.");
    editing.value = null;
  } catch (error) {
    toast.error(
      inventoryErrorMessage(error, "Không thể cập nhật ngưỡng tồn thấp."),
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Kho & tồn"
      :group-to="{ name: String(route.name) }"
      section-label="Tồn kho"
    />
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Tồn kho</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Theo dõi tồn theo biến thể tại {{ branchStore.scopeLabel }}.
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
        columnIds: ['productName', 'sku'],
        placeholder: 'Tìm sản phẩm, SKU hoặc barcode...',
      }"
      :filterable-columns="filters"
      :config="{
        tableId: 'inventory-stocks',
        rowIdKey: 'variantId',
        pageSize: 10,
        maxPageSize: 100,
        emitInitialQuery: true,
        initialSorting: [{ id: 'updatedAt', desc: true }],
        enableColumnVisibility: true,
        stickyActionColumn: true,
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['stockState'],
          stringFilterIds: ['stockState'],
          replace: true,
        },
      }"
      @update:query="handleQuery"
      @retry="query.refetch()"
    >
      <template #error>
        <div class="space-y-1 text-center">
          <p class="font-medium">Không thể tải dữ liệu tồn kho.</p>
          <p class="text-sm text-muted-foreground">Vui lòng đặt lại bộ lọc hoặc thử lại.</p>
        </div>
      </template>
      <template #toolbar-right
        ><Button size="sm" variant="outline" @click="query.refetch()"
          ><RefreshCcw class="mr-2 size-4" />Tải lại</Button
        ></template
      >
      <template #row-actions="{ rowData }">
        <PermissionGate
          :all-of="[ADMIN_PERMISSIONS.INVENTORY_UPDATE_THRESHOLD]"
        >
          <TooltipProvider :delay-duration="200">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  size="icon"
                  variant="ghost"
                  class="size-9 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Chỉnh ngưỡng cảnh báo"
                  @click="openThreshold(rowData)"
                ><Settings2 class="size-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Chỉnh ngưỡng cảnh báo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </PermissionGate>
      </template>
    </DataTable>
  </section>

  <Dialog
    :open="Boolean(editing)"
    @update:open="
      (open) => {
        if (!open) editing = null;
      }
    "
  >
    <DialogContent class="sm:max-w-md">
      <DialogHeader
        ><DialogTitle>Ngưỡng cảnh báo sắp hết</DialogTitle
        ><DialogDescription
          >{{ editing?.productName }} ·
          {{ editing?.variantName }}</DialogDescription
        ></DialogHeader
      >
      <div class="space-y-2">
        <Label for="low-stock-threshold">Ngưỡng cảnh báo sắp hết</Label
        ><Input
          id="low-stock-threshold"
          v-model.number="threshold"
          type="number"
          min="0"
          step="1"
        />
      </div>
      <p class="text-sm text-muted-foreground">Hệ thống đánh dấu “Sắp hết” khi tồn hiện tại nhỏ hơn hoặc bằng ngưỡng này.</p>
      <p
        v-if="!Number.isInteger(threshold) || threshold < 0"
        class="text-sm text-destructive"
      >
        Ngưỡng phải là số nguyên không âm.
      </p>
      <DialogFooter
        ><Button variant="outline" @click="editing = null">Đóng</Button
        ><Button
          :disabled="saving || !Number.isInteger(threshold) || threshold < 0"
          @click="saveThreshold"
          >{{ saving ? "Đang lưu..." : "Lưu ngưỡng" }}</Button
        ></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
