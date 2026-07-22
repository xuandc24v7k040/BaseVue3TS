<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PackagePlus,
  Plus,
  Search,
  Trash2,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  InventoryVariantOptionResponseDto,
  StockReceiptItemInputDto,
} from "@/api/generated/models";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import AsyncMasterDataCombobox from "@/features/products/components/AsyncMasterDataCombobox.vue";
import { useBranchStore } from "@/stores/branch.store";
import { registerBranchChangeGuard } from "@/stores/branch-change-guard";
import {
  createStockReceipt,
  getStockReceipt,
  listVariantOptions,
  updateStockReceipt,
} from "../api/inventory-api";
import { inventoryKeys } from "../api/inventory-query-keys";
import { formatMoney, inventoryErrorMessage } from "../utils/inventory-format";

interface FormItem {
  variant: InventoryVariantOptionResponseDto;
  quantity: number;
  costPrice: string;
}

interface VariantGroup {
  productId: string;
  productName: string;
  thumbnailUrl: string | null;
  variants: InventoryVariantOptionResponseDto[];
}

const route = useRoute();
const router = useRouter();
const client = useQueryClient();
const branchStore = useBranchStore();
const receiptId = computed(() =>
  typeof route.params.id === "string" ? route.params.id : "",
);
const isEdit = computed(() => Boolean(receiptId.value));
const routePrefix = computed(() =>
  String(route.name).startsWith("super-admin") ? "super-admin" : "branch-admin",
);
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const supplierId = ref("");
const note = ref("");
const items = ref<FormItem[]>([]);
const errors = ref<Record<string, string>>({});
const saving = ref(false);
const baseline = ref("");
const hydratedId = ref("");
const selectorOpen = ref(false);
const selectorSearch = ref("");
const selectorPage = ref(1);
const selectorSelected = ref(
  new Map<string, InventoryVariantOptionResponseDto>(),
);
const expandedProductIds = ref(new Set<string>());
const discardOpen = ref(false);
let discardResolver: ((allow: boolean) => void) | null = null;

const detailQuery = useQuery({
  queryKey: computed(() =>
    inventoryKeys.receipt(branchId.value, receiptId.value),
  ),
  queryFn: ({ signal }) => getStockReceipt(receiptId.value, signal),
  enabled: computed(() => Boolean(branchId.value && receiptId.value)),
});
const variantParams = computed(() => ({
  page: selectorPage.value,
  limit: 20,
  ...(selectorSearch.value.trim()
    ? { search: selectorSearch.value.trim() }
    : {}),
}));
const variantQuery = useQuery({
  queryKey: computed(() => [
    ...inventoryKeys.variantOptions(variantParams.value),
    routePrefix.value === "branch-admin" ? branchId.value : "global",
  ]),
  queryFn: ({ signal }) =>
    listVariantOptions(
      variantParams.value,
      signal,
      routePrefix.value === "branch-admin",
    ),
  enabled: selectorOpen,
});
const variantGroups = computed<VariantGroup[]>(() => {
  const groups = new Map<string, VariantGroup>();
  for (const variant of variantQuery.data.value?.data ?? []) {
    const group: VariantGroup = groups.get(variant.productId) ?? {
      productId: variant.productId,
      productName: variant.productName,
      thumbnailUrl: variant.thumbnailUrl ?? null,
      variants: [],
    };
    group.variants.push(variant);
    groups.set(variant.productId, group);
  }
  return [...groups.values()];
});

function snapshot(): string {
  return JSON.stringify({
    supplierId: supplierId.value,
    note: note.value,
    items: items.value.map(({ variant, quantity, costPrice }) => ({
      variantId: variant.id,
      quantity,
      costPrice,
    })),
  });
}
const isDirty = computed(
  () => Boolean(baseline.value) && snapshot() !== baseline.value,
);
const totalQuantity = computed(() =>
  items.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
);
const totalAmount = computed(() =>
  items.value.reduce(
    (sum, item) =>
      sum + (Number(item.costPrice) || 0) * (Number(item.quantity) || 0),
    0,
  ),
);

watch(
  detailQuery.data,
  (receipt) => {
    if (!receipt || hydratedId.value === receipt.id) return;
    if (receipt.status !== "DRAFT") {
      void router.replace({
        name: `${routePrefix.value}-stock-receipt-detail`,
        params: { id: receipt.id },
      });
      return;
    }
    supplierId.value = receipt.supplier?.id ?? "";
    note.value = receipt.note ?? "";
    items.value = receipt.items.map((item) => ({
      variant: {
        id: item.variantId,
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        barcode: item.barcode,
        isDefault: false,
        isActive: item.variantActive,
        productStatus: item.productStatus,
        optionSummary: item.optionSummary,
        thumbnailUrl: item.thumbnailUrl,
      },
      quantity: item.quantity,
      costPrice: item.costPrice ?? "",
    }));
    hydratedId.value = receipt.id;
    baseline.value = snapshot();
  },
  { immediate: true },
);

watch(selectorSearch, () => {
  selectorPage.value = 1;
});
watch(selectorOpen, (open) => {
  if (open) selectorSelected.value = new Map();
  else selectorSearch.value = "";
});
watch(
  variantGroups,
  (groups) => {
    const next = new Set(expandedProductIds.value);
    groups.forEach(({ productId }) => next.add(productId));
    expandedProductIds.value = next;
  },
  { immediate: true },
);

function initializeCreate() {
  if (!isEdit.value && !baseline.value) baseline.value = snapshot();
}
onMounted(initializeCreate);

function toggleVariant(
  variant: InventoryVariantOptionResponseDto,
  checked: boolean | "indeterminate",
) {
  const next = new Map(selectorSelected.value);
  if (checked === true) next.set(variant.id, variant);
  else next.delete(variant.id);
  selectorSelected.value = next;
}

function setProductExpanded(productId: string, open: boolean) {
  const next = new Set(expandedProductIds.value);
  if (open) next.add(productId);
  else next.delete(productId);
  expandedProductIds.value = next;
}

function variantDisplayName(variant: InventoryVariantOptionResponseDto) {
  return variant.isDefault && !variant.variantName.trim()
    ? "Mặc định"
    : variant.variantName;
}

function addSelectedVariants() {
  const existing = new Set(items.value.map(({ variant }) => variant.id));
  const additions = [...selectorSelected.value.values()].filter(
    ({ id }) => !existing.has(id),
  );
  items.value.push(
    ...additions.map((variant) => ({ variant, quantity: 1, costPrice: "" })),
  );
  selectorOpen.value = false;
  delete errors.value.items;
}

function removeItem(index: number) {
  items.value.splice(index, 1);
}

function validate(): boolean {
  const next: Record<string, string> = {};
  if (!items.value.length)
    next.items = "Phiếu nhập phải có ít nhất một sản phẩm.";
  items.value.forEach((item, index) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1)
      next[`quantity-${index}`] = "Số lượng phải là số nguyên lớn hơn 0.";
    if (item.costPrice && !/^\d{1,13}(\.\d{1,2})?$/.test(item.costPrice))
      next[`cost-${index}`] = "Giá nhập không hợp lệ.";
  });
  errors.value = next;
  return Object.keys(next).length === 0;
}

async function save() {
  if (!validate() || saving.value) return;
  saving.value = true;
  const payload = {
    supplierId: supplierId.value || null,
    note: note.value.trim() || null,
    items: items.value.map<StockReceiptItemInputDto>(
      ({ variant, quantity, costPrice }) => ({
        variantId: variant.id,
        quantity,
        costPrice: costPrice || null,
      }),
    ),
  };
  try {
    const saved = isEdit.value
      ? await updateStockReceipt(receiptId.value, payload)
      : await createStockReceipt(payload);
    baseline.value = snapshot();
    await client.invalidateQueries({
      queryKey: inventoryKeys.scoped(branchId.value),
    });
    toast.success(
      isEdit.value ? "Đã lưu phiếu nhập nháp." : "Đã tạo phiếu nhập nháp.",
    );
    await router.replace({
      name: `${routePrefix.value}-stock-receipt-detail`,
      params: { id: saved.id },
    });
  } catch (error) {
    toast.error(inventoryErrorMessage(error, "Không thể lưu phiếu nhập."));
  } finally {
    saving.value = false;
  }
}

function askDiscard(): Promise<boolean> {
  if (!isDirty.value) return Promise.resolve(true);
  discardOpen.value = true;
  return new Promise((resolve) => {
    discardResolver = resolve;
  });
}

function resolveDiscard(allow: boolean) {
  discardOpen.value = false;
  discardResolver?.(allow);
  discardResolver = null;
}

onBeforeRouteLeave(() => askDiscard());
const unregisterBranchGuard = registerBranchChangeGuard(() => askDiscard());
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}
window.addEventListener("beforeunload", handleBeforeUnload);
onBeforeUnmount(() => {
  unregisterBranchGuard();
  window.removeEventListener("beforeunload", handleBeforeUnload);
  discardResolver?.(false);
});
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Kho & tồn"
      :group-to="{ name: `${routePrefix}-stock-receipts` }"
      section-label="Phiếu nhập kho"
      :current-label="isEdit ? 'Sửa phiếu nháp' : 'Tạo phiếu'"
    />
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        {{ isEdit ? "Sửa phiếu nhập nháp" : "Tạo phiếu nhập kho" }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Chi nhánh: {{ branchStore.scopeLabel }}. Phiếu chỉ làm tăng tồn khi được
        xác nhận.
      </p>
    </div>

    <Card
      ><CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader
      ><CardContent class="grid gap-5 md:grid-cols-2">
        <div class="space-y-2">
          <AsyncMasterDataCombobox
            id="receipt-supplier"
            v-model="supplierId"
            kind="supplier"
            label="Nhà cung cấp (không bắt buộc)"
            :selected-label="detailQuery.data.value?.supplier?.name"
            :branch-scoped="routePrefix === 'branch-admin'"
            :authorization-scope="routePrefix === 'branch-admin' ? branchId : 'global'"
            nullable
          />
        </div>
        <div class="space-y-2 md:col-span-2">
          <Label for="receipt-note">Ghi chú</Label
          ><Textarea
            id="receipt-note"
            v-model="note"
            maxlength="1000"
            placeholder="Ghi chú nội bộ cho phiếu nhập..."
          />
        </div> </CardContent
    ></Card>

    <Card
      ><CardHeader class="flex-row items-center justify-between"
        ><div>
          <CardTitle>Sản phẩm nhập kho</CardTitle>
          <p class="mt-1 text-sm text-muted-foreground">
            Chọn biến thể từ danh mục ACTIVE toàn hệ thống.
          </p>
        </div>
        <Button type="button" variant="outline" @click="selectorOpen = true"
          ><Plus class="mr-2 size-4" />Thêm sản phẩm</Button
        ></CardHeader
      ><CardContent>
        <p v-if="errors.items" class="mb-3 text-sm text-destructive">
          {{ errors.items }}
        </p>
        <ScrollArea
          v-if="items.length"
          type="always"
          scrollbar-orientation="horizontal"
          class="w-full rounded-lg border pb-2"
        >
          <table class="w-full min-w-[760px] text-sm">
            <thead class="bg-muted/50 text-left">
              <tr>
                <th class="p-3">Sản phẩm / biến thể</th>
                <th class="p-3">SKU</th>
                <th class="w-36 p-3">Số lượng</th>
                <th class="w-48 p-3">Giá nhập</th>
                <th class="w-12 p-3"><span class="sr-only">Xóa</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in items"
                :key="item.variant.id"
                class="border-t align-top"
              >
                <td class="p-3">
                  <p class="font-medium">{{ item.variant.productName }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ item.variant.variantName }}
                  </p>
                </td>
                <td class="p-3 font-mono text-xs">{{ item.variant.sku }}</td>
                <td class="p-3">
                  <Input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    step="1"
                    @input="delete errors[`quantity-${index}`]"
                  />
                  <p
                    v-if="errors[`quantity-${index}`]"
                    class="mt-1 text-xs text-destructive"
                  >
                    {{ errors[`quantity-${index}`] }}
                  </p>
                </td>
                <td class="p-3">
                  <Input
                    v-model="item.costPrice"
                    inputmode="decimal"
                    placeholder="Không bắt buộc"
                    @input="delete errors[`cost-${index}`]"
                  />
                  <p
                    v-if="errors[`cost-${index}`]"
                    class="mt-1 text-xs text-destructive"
                  >
                    {{ errors[`cost-${index}`] }}
                  </p>
                </td>
                <td class="p-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Xóa sản phẩm"
                    @click="removeItem(index)"
                    ><Trash2 class="size-4"
                  /></Button>
                </td>
              </tr>
            </tbody>
          </table>
        </ScrollArea>
        <div
          v-else
          class="rounded-lg border border-dashed py-12 text-center text-muted-foreground"
        >
          <PackagePlus class="mx-auto size-9" />
          <p class="mt-2 font-medium text-foreground">Chưa có sản phẩm</p>
          <p class="text-sm">Thêm ít nhất một biến thể vào phiếu nhập.</p>
        </div>
      </CardContent></Card
    >

    <div
      class="sticky bottom-3 z-20 flex flex-col gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="text-sm">
        <span class="font-medium"
          >{{ items.length }} dòng · {{ totalQuantity }} sản phẩm</span
        ><span class="ml-3 text-muted-foreground"
          >Tạm tính {{ formatMoney(totalAmount) }}</span
        >
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="router.back()">Hủy</Button
        ><Button
          :disabled="saving || detailQuery.isLoading.value"
          @click="save"
          >{{ saving ? "Đang lưu..." : "Lưu phiếu nháp" }}</Button
        >
      </div>
    </div>
  </section>

  <Dialog v-model:open="selectorOpen"
    ><DialogContent
      class="grid h-[min(52rem,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl"
      ><DialogHeader class="shrink-0 border-b p-5 pb-4"
        ><DialogTitle>Chọn biến thể sản phẩm</DialogTitle
        ><DialogDescription
          >Tìm theo tên, SKU hoặc barcode. Danh sách này không phụ thuộc chi
          nhánh.</DialogDescription
        >
        <div class="relative pt-2">
          <Search
            class="absolute left-3 top-5 size-4 text-muted-foreground"
          /><Input
            v-model="selectorSearch"
            class="pl-9"
            placeholder="Tìm sản phẩm hoặc SKU..."
          /></div></DialogHeader
      ><ScrollArea
        type="auto"
        show-scroll-buttons
        class="h-full min-h-0 w-full overflow-hidden"
        ><div class="space-y-3 px-5 py-4 pb-6 pr-7">
          <div v-if="variantQuery.isFetching.value" class="py-10 text-center text-sm text-muted-foreground">Đang tải danh sách biến thể...</div>
          <div v-else-if="variantQuery.isError.value" class="space-y-3 py-10 text-center">
            <p class="text-sm text-destructive">Không thể tải danh sách biến thể sản phẩm.</p>
            <Button type="button" size="sm" variant="outline" @click="variantQuery.refetch()">Thử lại</Button>
          </div>
          <template v-else>
            <Collapsible
              v-for="group in variantGroups"
              :key="group.productId"
              :open="expandedProductIds.has(group.productId)"
              class="overflow-hidden rounded-lg border bg-card"
              @update:open="(open) => setProductExpanded(group.productId, open)"
            >
              <CollapsibleTrigger
                class="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <img
                  v-if="group.thumbnailUrl"
                  :src="group.thumbnailUrl"
                  :alt="group.productName"
                  class="size-10 shrink-0 rounded-md border object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium" :title="group.productName">{{ group.productName }}</p>
                  <p class="text-xs text-muted-foreground">{{ group.variants.length }} biến thể</p>
                </div>
                <ChevronDown
                  class="size-4 shrink-0 transition-transform"
                  :class="expandedProductIds.has(group.productId) ? 'rotate-180' : ''"
                />
              </CollapsibleTrigger>
              <CollapsibleContent class="border-t">
                <label
                  v-for="variant in group.variants"
                  :key="variant.id"
                  class="flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                >
                  <Checkbox
                    class="mt-0.5"
                    :model-value="selectorSelected.has(variant.id)"
                    :disabled="items.some((item) => item.variant.id === variant.id)"
                    @update:model-value="(checked) => toggleVariant(variant, checked)"
                  />
                  <span class="min-w-0 flex-1 space-y-1">
                    <span class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{{ variantDisplayName(variant) }}</span>
                      <span
                        v-if="items.some((item) => item.variant.id === variant.id)"
                        class="text-xs text-muted-foreground"
                      >Đã thêm</span>
                    </span>
                    <span v-if="variant.optionSummary" class="block text-sm text-muted-foreground">{{ variant.optionSummary }}</span>
                    <span class="block break-all font-mono text-xs text-muted-foreground">SKU: {{ variant.sku }}</span>
                    <span v-if="variant.barcode" class="block break-all text-xs text-muted-foreground">Barcode: {{ variant.barcode }}</span>
                  </span>
                </label>
              </CollapsibleContent>
            </Collapsible>
          </template>
          <p
            v-if="
              !variantQuery.isFetching.value &&
              !variantQuery.isError.value &&
              !variantQuery.data.value?.data.length
            "
            class="py-12 text-center text-sm text-muted-foreground"
          >
            Không tìm thấy biến thể phù hợp.
          </p>
        </div></ScrollArea
      ><DialogFooter class="z-10 shrink-0 flex-col gap-3 border-t bg-background p-4 sm:flex-row sm:flex-wrap sm:items-center"
        ><div class="flex items-center gap-2 sm:mr-auto">
          <Button
            size="icon"
            variant="outline"
            :disabled="selectorPage <= 1"
            @click="selectorPage--"
            ><ChevronLeft class="size-4" /></Button
          ><span class="text-sm"
            >Trang {{ selectorPage }} /
            {{ variantQuery.data.value?.meta.lastPage ?? 1 }}</span
          ><Button
            size="icon"
            variant="outline"
            :disabled="
              selectorPage >= (variantQuery.data.value?.meta.lastPage ?? 1)
            "
            @click="selectorPage++"
            ><ChevronRight class="size-4"
          /></Button>
        </div>
        <div class="flex w-full gap-2 sm:w-auto"><Button class="flex-1 sm:flex-none" variant="outline" @click="selectorOpen = false">Đóng</Button
        ><Button class="flex-1 sm:flex-none"
          :disabled="selectorSelected.size === 0"
          @click="addSelectedVariants"
          >Thêm {{ selectorSelected.size }} biến thể</Button></div
        ></DialogFooter
      ></DialogContent
    ></Dialog
  >

  <Dialog
    :open="discardOpen"
    @update:open="
      (open) => {
        if (!open) resolveDiscard(false);
      }
    "
    ><DialogContent class="sm:max-w-md"
      ><DialogHeader
        ><DialogTitle>Bỏ thay đổi chưa lưu?</DialogTitle
        ><DialogDescription
          >Phiếu nháp có thay đổi chưa lưu. Nếu tiếp tục, các thay đổi này sẽ bị
          mất.</DialogDescription
        ></DialogHeader
      ><DialogFooter
        ><Button variant="outline" @click="resolveDiscard(false)">Ở lại</Button
        ><Button variant="destructive" @click="resolveDiscard(true)"
          >Bỏ thay đổi</Button
        ></DialogFooter
      ></DialogContent
    ></Dialog
  >
</template>
