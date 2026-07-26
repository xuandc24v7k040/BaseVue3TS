<script setup lang="ts">
import { computed, ref } from "vue";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { CircleAlert, MoreHorizontal, RefreshCcw } from "@lucide/vue";
import { toast } from "vue-sonner";
import { useRoute } from "vue-router";
import type {
  InventoryGroupedStocksListParams,
  InventoryStockVariantResponseDto,
} from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useBranchStore } from "@/stores/branch.store";
import { inventoryKeys } from "../api/inventory-query-keys";
import {
  adjustStockQuantity,
  listGroupedStocks,
  updateStockThreshold,
} from "../api/inventory-api";
import { inventoryErrorMessage } from "../utils/inventory-format";
import {
  createGroupedStockColumns,
  type InventoryStockTableRow,
} from "../components/inventory-columns";

const branchStore = useBranchStore();
const route = useRoute();
const client = useQueryClient();
const { canAny } = useAdminPermissions();
const page = ref(1);
const limit = ref(10);
const search = ref("");
const stockState = ref<InventoryGroupedStocksListParams["stockState"]>();
const sortBy = ref<InventoryGroupedStocksListParams["sortBy"]>("updatedAt");
const sortOrder = ref<InventoryGroupedStocksListParams["sortOrder"]>("desc");
const columns = createGroupedStockColumns();
const thresholdEditing = ref<InventoryStockVariantResponseDto | null>(null);
const threshold = ref(0);
const thresholdSaving = ref(false);
const adjusting = ref<InventoryStockVariantResponseDto | null>(null);
const adjustmentDirection = ref<"INCREASE" | "DECREASE">("INCREASE");
const adjustmentQuantity = ref<number | undefined>();
const adjustmentNote = ref("");
const adjustmentSaving = ref(false);
const adjustmentSubmitted = ref(false);
const adjustmentStep = ref<"form" | "confirm">("form");
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const params = computed<InventoryGroupedStocksListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
  ...(stockState.value ? { stockState: stockState.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));
const query = useQuery({
  queryKey: computed(() =>
    inventoryKeys.groupedStocks(branchId.value, params.value),
  ),
  queryFn: ({ signal }) => listGroupedStocks(params.value, signal),
  enabled: computed(() => Boolean(branchId.value)),
  placeholderData: keepPreviousData,
});
const rows = computed<InventoryStockTableRow[]>(() =>
  (query.data.value?.data ?? []).map((group) => ({
    id: `product:${group.productId}`,
    rowType: "product",
    productId: group.productId,
    productName: group.productName,
    thumbnailUrl: group.thumbnailUrl ?? null,
    sku: group.isSimple ? group.variants[0]?.sku : undefined,
    variantCount: group.variantCount,
    quantity: group.totalQuantity,
    stockState: group.stockState,
    updatedAt: group.updatedAt,
    isSimple: group.isSimple,
    actionVariant: group.isSimple ? group.variants[0] : undefined,
    children: group.isSimple
      ? undefined
      : group.variants.map((variant) => ({
          id: `variant:${variant.variantId}`,
          rowType: "variant",
          productId: group.productId,
          productName: variant.productName,
          thumbnailUrl: null,
          variantId: variant.variantId,
          variantName: variant.variantName,
          sku: variant.sku,
          optionSummary: variant.optionSummary,
          variantCount: 0,
          quantity: variant.quantity,
          lowStockThreshold: variant.lowStockThreshold,
          stockState: variant.stockState,
          updatedAt: variant.updatedAt,
          isSimple: false,
          actionVariant: variant,
        })),
  })),
);
const canAdjustQuantity = computed(() =>
  canAny([ADMIN_PERMISSIONS.INVENTORY_ADJUST_QUANTITY]),
);
const canOpenActions = computed(
  () =>
    canAdjustQuantity.value ||
    canAny([ADMIN_PERMISSIONS.INVENTORY_UPDATE_THRESHOLD]),
);
const adjustmentDelta = computed(() => {
  const quantity = Number.isInteger(adjustmentQuantity.value)
    ? Number(adjustmentQuantity.value)
    : 0;
  return adjustmentDirection.value === "INCREASE" ? quantity : -quantity;
});
const adjustmentAfter = computed(
  () => (adjusting.value?.quantity ?? 0) + adjustmentDelta.value,
);
const adjustmentQuantityError = computed(() => {
  if (
    adjustmentQuantity.value === undefined ||
    adjustmentQuantity.value === null
  )
    return "Vui lòng nhập số lượng điều chỉnh.";
  if (!Number.isInteger(adjustmentQuantity.value))
    return "Số lượng phải là số nguyên.";
  if (adjustmentQuantity.value <= 0) return "Số lượng phải lớn hơn 0.";
  if (adjustmentQuantity.value > 1000)
    return "Mỗi lần chỉ được điều chỉnh tối đa 1000 sản phẩm.";
  if (adjustmentAfter.value < 0)
    return "Số lượng giảm không được vượt quá tồn hiện tại.";
  return null;
});
const adjustmentNoteError = computed(() =>
  adjustmentNote.value.trim() ? null : "Vui lòng nhập ghi chú điều chỉnh.",
);
const adjustmentValid = computed(
  () => !adjustmentQuantityError.value && !adjustmentNoteError.value,
);

const filters: DataTableFilterableColumn[] = [
  {
    id: "stockState",
    title: "Trạng thái tồn",
    operator: "in",
    multiple: false,
    options: [
      { label: "Đủ hàng", value: "IN_STOCK" },
      { label: "Sắp hết", value: "LOW_STOCK" },
      { label: "Hết hàng", value: "OUT_OF_STOCK" },
    ],
  },
];

function handleQuery(value: DataTableQuery) {
  page.value = value.page;
  limit.value = value.pageSize;
  search.value = value.search?.value ?? "";
  const nextState = value.filters?.find(({ id }) => id === "stockState")?.value;
  stockState.value =
    typeof nextState === "string" &&
    ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"].includes(nextState)
      ? (nextState as InventoryGroupedStocksListParams["stockState"])
      : undefined;
  const sorting = value.sort?.[0];
  sortBy.value =
    sorting && ["productName", "quantity", "updatedAt"].includes(sorting.id)
      ? (sorting.id as NonNullable<InventoryGroupedStocksListParams["sortBy"]>)
      : "updatedAt";
  sortOrder.value = sorting?.desc === false ? "asc" : "desc";
}

function openThreshold(row: InventoryStockVariantResponseDto) {
  thresholdEditing.value = row;
  threshold.value = row.lowStockThreshold;
}

function openAdjustment(row: InventoryStockVariantResponseDto) {
  if (!canAdjustQuantity.value) return;
  adjusting.value = row;
  adjustmentDirection.value = "INCREASE";
  adjustmentQuantity.value = undefined;
  adjustmentNote.value = "";
  adjustmentSubmitted.value = false;
  adjustmentStep.value = "form";
}

function closeAdjustment() {
  adjusting.value = null;
  adjustmentDirection.value = "INCREASE";
  adjustmentQuantity.value = undefined;
  adjustmentNote.value = "";
  adjustmentSubmitted.value = false;
  adjustmentStep.value = "form";
}

function handleAdjustmentOpenChange(open: boolean) {
  if (!open && !adjustmentSaving.value) closeAdjustment();
}

function continueAdjustment() {
  adjustmentSubmitted.value = true;
  if (!adjusting.value || !adjustmentValid.value) return;
  adjustmentStep.value = "confirm";
}

async function saveThreshold() {
  if (
    !thresholdEditing.value ||
    thresholdSaving.value ||
    !Number.isInteger(threshold.value) ||
    threshold.value < 0
  )
    return;
  thresholdSaving.value = true;
  try {
    await updateStockThreshold(thresholdEditing.value.variantId, {
      lowStockThreshold: threshold.value,
    });
    await client.invalidateQueries({
      queryKey: inventoryKeys.scoped(branchId.value),
    });
    toast.success("Đã cập nhật ngưỡng tồn thấp.");
    thresholdEditing.value = null;
  } catch (error) {
    toast.error(
      inventoryErrorMessage(error, "Không thể cập nhật ngưỡng tồn thấp."),
    );
  } finally {
    thresholdSaving.value = false;
  }
}

async function saveAdjustment() {
  if (
    adjustmentStep.value !== "confirm" ||
    !canAdjustQuantity.value ||
    !adjusting.value ||
    !adjustmentValid.value ||
    adjustmentSaving.value
  )
    return;
  adjustmentSaving.value = true;
  try {
    await adjustStockQuantity(adjusting.value.variantId, {
      expectedCurrentQuantity: adjusting.value.quantity,
      direction: adjustmentDirection.value,
      quantity: Number(adjustmentQuantity.value),
      note: adjustmentNote.value.trim(),
    });
    await client.invalidateQueries({
      queryKey: inventoryKeys.scoped(branchId.value),
    });
    toast.success("Đã điều chỉnh số lượng tồn kho.");
    closeAdjustment();
  } catch (error) {
    const code = isAxiosError(error)
      ? (error.response?.data as { code?: string } | undefined)?.code
      : undefined;
    if (code === "INVENTORY_QUANTITY_CHANGED") {
      const refreshed = await query.refetch();
      const latest = refreshed.data?.data
        .flatMap((group) => group.variants)
        .find(({ variantId }) => variantId === adjusting.value?.variantId);
      if (latest) adjusting.value = latest;
      adjustmentStep.value = "form";
      adjustmentSubmitted.value = true;
      toast.error("Tồn kho đã thay đổi. Vui lòng kiểm tra và xác nhận lại.");
    } else {
      toast.error(
        inventoryErrorMessage(error, "Không thể điều chỉnh tồn kho."),
      );
    }
  } finally {
    adjustmentSaving.value = false;
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
        Theo dõi tồn theo sản phẩm tại {{ branchStore.scopeLabel }}.
      </p>
    </div>

    <DataTable
      :columns="columns"
      :data="rows"
      :page-count="query.data.value?.meta.lastPage"
      :row-count="query.data.value?.meta.total"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :global-search="{
        columnIds: ['productName'],
        placeholder: 'Tìm sản phẩm, biến thể, SKU hoặc barcode...',
      }"
      :filterable-columns="filters"
      :page-size-options="[10, 20, 50]"
      :config="{
        tableId: 'inventory-grouped-stocks',
        getRowId: (row) => row.id,
        pageSize: 10,
        maxPageSize: 50,
        emitInitialQuery: true,
        enableExpanding: true,
        expansionMode: 'tree',
        getSubRows: (row) => row.children,
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
          <p class="text-sm text-muted-foreground">
            Vui lòng đặt lại bộ lọc hoặc thử lại.
          </p>
        </div>
      </template>
      <template #toolbar-right>
        <Button size="sm" variant="outline" @click="query.refetch()">
          <RefreshCcw class="mr-2 size-4" />Tải lại
        </Button>
      </template>
      <template #row-actions="{ rowData }">
        <DropdownMenu v-if="canOpenActions && rowData.actionVariant">
          <DropdownMenuTrigger as-child>
            <Button
              size="icon-sm"
              variant="ghost"
              title="Thao tác tồn kho"
              aria-label="Mở menu thao tác tồn kho"
              @click.stop
            >
              <MoreHorizontal class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" @click.stop>
            <DropdownMenuItem
              v-if="canAny([ADMIN_PERMISSIONS.INVENTORY_ADJUST_QUANTITY])"
              @select="openAdjustment(rowData.actionVariant)"
              >Điều chỉnh số lượng tồn</DropdownMenuItem
            >
            <DropdownMenuItem
              v-if="canAny([ADMIN_PERMISSIONS.INVENTORY_UPDATE_THRESHOLD])"
              @select="openThreshold(rowData.actionVariant)"
              >Cập nhật ngưỡng tồn thấp</DropdownMenuItem
            >
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
    </DataTable>
  </section>

  <Dialog :open="Boolean(adjusting)" @update:open="handleAdjustmentOpenChange">
    <DialogContent
      class="grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="shrink-0 border-b p-5">
        <DialogTitle>{{
          adjustmentStep === "form"
            ? "Điều chỉnh số lượng tồn kho"
            : "Xác nhận điều chỉnh tồn kho"
        }}</DialogTitle>
        <DialogDescription class="min-w-0">
          <span class="block truncate">{{ adjusting?.productName }}</span>
          <span class="block truncate"
            >{{
              adjusting && !adjusting.isDefault
                ? adjusting.variantName + " · "
                : ""
            }}SKU: {{ adjusting?.sku }}</span
          >
        </DialogDescription>
      </DialogHeader>
      <ScrollArea class="min-h-0 overflow-hidden">
        <div v-if="adjustmentStep === 'form'" class="space-y-5 p-5 pr-7">
          <div
            class="flex gap-3 rounded-lg border bg-muted p-4 text-sm text-foreground"
          >
            <CircleAlert
              class="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p>
              Chỉ dùng để xử lý sai lệch kiểm kê, hư hỏng, số dư ban đầu hoặc
              sửa sai dữ liệu. Hàng nhập thông thường phải được ghi nhận bằng
              phiếu nhập kho.
            </p>
          </div>
          <div
            class="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4 text-center"
          >
            <div>
              <p class="text-xs text-muted-foreground">Tồn hiện tại</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">
                {{ adjusting?.quantity ?? 0 }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Lượng thay đổi</p>
              <p
                class="mt-1 text-lg font-semibold tabular-nums"
                :class="
                  adjustmentDelta >= 0 ? 'text-emerald-600' : 'text-destructive'
                "
              >
                {{ adjustmentDelta >= 0 ? "+" : "" }}{{ adjustmentDelta }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Tồn sau điều chỉnh</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">
                {{ adjustmentAfter }}
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <Label>Loại điều chỉnh</Label>
            <div class="grid grid-cols-2 gap-3">
              <Button
                :variant="
                  adjustmentDirection === 'INCREASE' ? 'default' : 'outline'
                "
                @click="adjustmentDirection = 'INCREASE'"
                >+ Điều chỉnh tăng</Button
              >
              <Button
                :variant="
                  adjustmentDirection === 'DECREASE' ? 'default' : 'outline'
                "
                @click="adjustmentDirection = 'DECREASE'"
                >− Điều chỉnh giảm</Button
              >
            </div>
          </div>
          <div class="space-y-2">
            <Label for="adjustment-quantity"
              >Số lượng
              <span class="text-destructive" aria-hidden="true">*</span></Label
            >
            <Input
              id="adjustment-quantity"
              v-model.number="adjustmentQuantity"
              type="number"
              min="1"
              max="1000"
              step="1"
              required
              :aria-invalid="
                adjustmentSubmitted && Boolean(adjustmentQuantityError)
              "
              aria-describedby="adjustment-quantity-error"
              placeholder="Nhập số lượng từ 1 đến 1000"
            />
            <p
              v-if="adjustmentSubmitted && adjustmentQuantityError"
              id="adjustment-quantity-error"
              class="text-sm text-destructive"
              role="alert"
            >
              {{ adjustmentQuantityError }}
            </p>
          </div>
          <div class="space-y-2">
            <Label for="adjustment-note"
              >Ghi chú điều chỉnh
              <span class="text-destructive" aria-hidden="true">*</span></Label
            >
            <Textarea
              id="adjustment-note"
              v-model="adjustmentNote"
              maxlength="1000"
              required
              :aria-invalid="
                adjustmentSubmitted && Boolean(adjustmentNoteError)
              "
              aria-describedby="adjustment-note-error"
              placeholder="Nhập lý do kiểm kê, hư hỏng, số dư ban đầu hoặc sửa sai dữ liệu..."
            />
            <p
              v-if="adjustmentSubmitted && adjustmentNoteError"
              id="adjustment-note-error"
              class="text-sm text-destructive"
              role="alert"
            >
              {{ adjustmentNoteError }}
            </p>
          </div>
        </div>
        <div v-else class="space-y-5 p-5 pr-7">
          <div
            v-if="adjustmentDirection === 'DECREASE'"
            class="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <CircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p>
              Thao tác này sẽ làm giảm tồn kho. Vui lòng kiểm tra kỹ thông tin
              trước khi xác nhận.
            </p>
          </div>

          <div class="space-y-3 rounded-lg border p-4 text-sm">
            <div class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
              <span class="text-muted-foreground">Sản phẩm</span>
              <span class="font-medium">{{ adjusting?.productName }}</span>
            </div>
            <div
              v-if="adjusting && !adjusting.isDefault"
              class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3"
            >
              <span class="text-muted-foreground">Biến thể</span>
              <span class="font-medium">{{ adjusting.variantName }}</span>
            </div>
            <div class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
              <span class="text-muted-foreground">SKU</span>
              <span class="break-all font-mono">{{ adjusting?.sku }}</span>
            </div>
            <div class="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
              <span class="text-muted-foreground">Chi nhánh</span>
              <span class="font-medium">{{ branchStore.scopeLabel }}</span>
            </div>
          </div>

          <div
            class="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4 text-center"
          >
            <div>
              <p class="text-xs text-muted-foreground">Tồn hiện tại</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">
                {{ adjusting?.quantity ?? 0 }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Thay đổi</p>
              <p
                class="mt-1 text-lg font-semibold tabular-nums"
                :class="
                  adjustmentDelta >= 0 ? 'text-emerald-600' : 'text-destructive'
                "
              >
                {{ adjustmentDelta >= 0 ? "+" : "" }}{{ adjustmentDelta }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Tồn sau điều chỉnh</p>
              <p class="mt-1 text-lg font-semibold tabular-nums">
                {{ adjustmentAfter }}
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-sm text-muted-foreground">Lý do</p>
            <p
              class="whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 text-sm"
            >
              {{ adjustmentNote.trim() }}
            </p>
          </div>
        </div>
      </ScrollArea>
      <DialogFooter class="shrink-0 border-t bg-background p-4 sm:flex-row">
        <template v-if="adjustmentStep === 'form'">
          <Button variant="outline" @click="closeAdjustment">Hủy</Button>
          <Button @click="continueAdjustment">Tiếp tục</Button>
        </template>
        <template v-else>
          <Button
            variant="outline"
            :disabled="adjustmentSaving"
            @click="adjustmentStep = 'form'"
            >Quay lại</Button
          >
          <Button
            :variant="
              adjustmentDirection === 'DECREASE' ? 'destructive' : 'default'
            "
            :disabled="adjustmentSaving"
            @click="saveAdjustment"
          >
            {{
              adjustmentSaving
                ? "Đang xử lý..."
                : `Xác nhận điều chỉnh ${adjustmentDirection === "INCREASE" ? "tăng" : "giảm"}`
            }}
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog
    :open="Boolean(thresholdEditing)"
    @update:open="
      (open) => {
        if (!open) thresholdEditing = null;
      }
    "
  >
    <DialogContent
      class="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
    >
      <DialogHeader class="shrink-0 border-b p-5">
        <DialogTitle>Ngưỡng tồn thấp</DialogTitle>
        <DialogDescription>
          {{ thresholdEditing?.productName
          }}{{
            thresholdEditing && !thresholdEditing.isDefault
              ? ` · ${thresholdEditing.variantName}`
              : ""
          }}
          · SKU: {{ thresholdEditing?.sku }}
        </DialogDescription>
      </DialogHeader>
      <ScrollArea class="min-h-0 flex-1"
        ><div class="space-y-4 p-5 pr-7">
          <div class="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p class="text-xs text-muted-foreground">Tồn hiện tại</p>
              <p class="font-semibold tabular-nums">
                {{ thresholdEditing?.quantity }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Ngưỡng hiện tại</p>
              <p class="font-semibold tabular-nums">
                {{ thresholdEditing?.lowStockThreshold }}
              </p>
            </div>
          </div>
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
          <p class="text-sm text-muted-foreground">
            Hệ thống đánh dấu “Sắp hết” khi tồn hiện tại nhỏ hơn hoặc bằng
            ngưỡng này.
          </p>
          <p
            v-if="!Number.isInteger(threshold) || threshold < 0"
            class="text-sm text-destructive"
          >
            Ngưỡng phải là số nguyên không âm.
          </p>
        </div></ScrollArea
      >
      <DialogFooter class="shrink-0 border-t bg-background p-4"
        ><Button variant="outline" @click="thresholdEditing = null">Hủy</Button
        ><Button
          :disabled="
            thresholdSaving || !Number.isInteger(threshold) || threshold < 0
          "
          @click="saveThreshold"
          >{{ thresholdSaving ? "Đang lưu..." : "Lưu ngưỡng" }}</Button
        ></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
