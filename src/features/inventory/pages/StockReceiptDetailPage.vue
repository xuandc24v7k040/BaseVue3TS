<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { ArrowLeft, CheckCircle2, Pencil, XCircle } from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBranchStore } from "@/stores/branch.store";
import {
  cancelStockReceipt,
  confirmStockReceipt,
  getStockReceipt,
} from "../api/inventory-api";
import { inventoryKeys } from "../api/inventory-query-keys";
import {
  formatDateTime,
  formatMoney,
  inventoryErrorMessage,
  receiptStatusLabel,
} from "../utils/inventory-format";

const route = useRoute();
const router = useRouter();
const client = useQueryClient();
const branchStore = useBranchStore();
const id = computed(() => String(route.params.id ?? ""));
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const routePrefix = computed(() =>
  String(route.name).startsWith("super-admin") ? "super-admin" : "branch-admin",
);
const confirmOpen = ref(false);
const cancelOpen = ref(false);
const pending = ref(false);
const query = useQuery({
  queryKey: computed(() => inventoryKeys.receipt(branchId.value, id.value)),
  queryFn: ({ signal }) => getStockReceipt(id.value, signal),
  enabled: computed(() => Boolean(branchId.value && id.value)),
});
const receipt = computed(() => query.data.value);

watch(
  [receipt, () => route.query.action],
  ([currentReceipt, action]) => {
    if (currentReceipt?.status !== "DRAFT") return;
    if (action === "confirm") confirmOpen.value = true;
    if (action === "cancel") cancelOpen.value = true;
  },
  { immediate: true },
);

function closeRequestedAction(): void {
  confirmOpen.value = false;
  cancelOpen.value = false;
  if (route.query.action) {
    void router.replace({ query: { ...route.query, action: undefined } });
  }
}

async function mutate(action: "confirm" | "cancel") {
  if (pending.value) return;
  pending.value = true;
  try {
    if (action === "confirm") await confirmStockReceipt(id.value);
    else await cancelStockReceipt(id.value);
    await client.invalidateQueries({
      queryKey: inventoryKeys.scoped(branchId.value),
    });
    await query.refetch();
    toast.success(
      action === "confirm"
        ? "Đã xác nhận phiếu và cộng tồn kho."
        : "Đã hủy phiếu nhập kho.",
    );
    confirmOpen.value = false;
    cancelOpen.value = false;
    closeRequestedAction();
  } catch (error) {
    toast.error(
      inventoryErrorMessage(
        error,
        action === "confirm"
          ? "Không thể xác nhận phiếu."
          : "Không thể hủy phiếu.",
      ),
    );
    await query.refetch();
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Kho & tồn"
      :group-to="{ name: `${routePrefix}-stock-receipts` }"
      section-label="Phiếu nhập kho"
      :current-label="receipt?.code ?? 'Chi tiết'"
    />
    <div v-if="receipt" class="space-y-6">
      <Button
        type="button"
        variant="ghost"
        class="-ml-3 w-fit"
        @click="router.push({ name: `${routePrefix}-stock-receipts` })"
      >
        <ArrowLeft class="mr-2 size-4" />Quay lại danh sách
      </Button>
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
              {{ receipt.code }}
            </h1>
            <Badge
              :variant="
                receipt.status === 'CANCELLED' ? 'destructive' : 'secondary'
              "
              >{{ receiptStatusLabel[receipt.status] }}</Badge
            >
          </div>
          <p class="mt-1 text-sm text-muted-foreground">
            Tạo lúc {{ formatDateTime(receipt.createdAt) }} tại
            {{ receipt.branch.name }}.
          </p>
        </div>
        <div v-if="receipt.status === 'DRAFT'" class="flex flex-wrap gap-2">
          <PermissionGate :all-of="[ADMIN_PERMISSIONS.STOCK_RECEIPTS_UPDATE]"
            ><Button
              variant="outline"
              @click="
                router.push({
                  name: `${routePrefix}-stock-receipt-edit`,
                  params: { id },
                })
              "
              ><Pencil class="mr-2 size-4" />Sửa</Button
            ></PermissionGate
          >
          <PermissionGate :all-of="[ADMIN_PERMISSIONS.STOCK_RECEIPTS_CANCEL]"
            ><Button variant="outline" @click="cancelOpen = true"
              ><XCircle class="mr-2 size-4" />Hủy phiếu</Button
            ></PermissionGate
          >
          <PermissionGate :all-of="[ADMIN_PERMISSIONS.STOCK_RECEIPTS_CONFIRM]"
            ><Button @click="confirmOpen = true"
              ><CheckCircle2 class="mr-2 size-4" />Xác nhận nhập kho</Button
            ></PermissionGate
          >
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          ><CardHeader
            ><CardTitle class="text-sm text-muted-foreground"
              >Nhà cung cấp</CardTitle
            ></CardHeader
          ><CardContent class="font-medium">{{
            receipt.supplier?.name ?? "Không chọn"
          }}</CardContent></Card
        ><Card
          ><CardHeader
            ><CardTitle class="text-sm text-muted-foreground"
              >Số dòng</CardTitle
            ></CardHeader
          ><CardContent class="text-xl font-semibold">{{
            receipt.itemCount
          }}</CardContent></Card
        ><Card
          ><CardHeader
            ><CardTitle class="text-sm text-muted-foreground"
              >Tổng số lượng</CardTitle
            ></CardHeader
          ><CardContent class="text-xl font-semibold">{{
            receipt.totalQuantity
          }}</CardContent></Card
        ><Card
          ><CardHeader
            ><CardTitle class="text-sm text-muted-foreground"
              >Tổng tiền nhập</CardTitle
            ></CardHeader
          ><CardContent class="text-xl font-semibold">{{
            formatMoney(receipt.totalCostAmount)
          }}</CardContent></Card
        >
      </div>

      <Card
        ><CardHeader><CardTitle>Chi tiết sản phẩm</CardTitle></CardHeader
        ><CardContent class="min-w-0 p-0"
          ><ScrollArea
            type="always"
            scrollbar-orientation="horizontal"
            class="w-full min-w-0 max-w-full overflow-hidden"
          >
            <table class="w-full min-w-[760px] pb-3 text-sm">
              <thead class="border-y bg-muted/40 text-left">
                <tr>
                  <th class="p-3 pl-6">Sản phẩm / biến thể</th>
                  <th class="p-3">SKU</th>
                  <th class="p-3 text-right">Số lượng</th>
                  <th class="p-3 text-right">Giá nhập</th>
                  <th class="p-3 pr-6 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in receipt.items"
                  :key="item.id"
                  class="border-b last:border-0"
                >
                  <td class="p-3 pl-6">
                    <p class="font-medium">{{ item.productName }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ item.variantName }}
                    </p>
                  </td>
                  <td class="p-3 font-mono text-xs">{{ item.sku }}</td>
                  <td class="p-3 text-right">{{ item.quantity }}</td>
                  <td class="p-3 text-right">
                    {{ item.costPrice ? formatMoney(item.costPrice) : "—" }}
                  </td>
                  <td class="p-3 pr-6 text-right font-medium">
                    {{ item.lineTotal ? formatMoney(item.lineTotal) : "—" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </ScrollArea></CardContent
        ></Card
      >

      <Card
        ><CardHeader><CardTitle>Thông tin xử lý</CardTitle></CardHeader
        ><CardContent class="grid gap-4 text-sm sm:grid-cols-2"
          ><div>
            <span class="text-muted-foreground">Người tạo</span>
            <p class="mt-1 font-medium">
              {{ receipt.createdBy?.name ?? "Hệ thống" }}
            </p>
          </div>
          <div>
            <span class="text-muted-foreground">Người xác nhận</span>
            <p class="mt-1 font-medium">
              {{ receipt.confirmedBy?.name ?? "—" }}
            </p>
          </div>
          <div v-if="receipt.confirmedAt">
            <span class="text-muted-foreground">Thời điểm xác nhận</span>
            <p class="mt-1 font-medium">
              {{ formatDateTime(receipt.confirmedAt) }}
            </p>
          </div>
          <div v-if="receipt.note">
            <span class="text-muted-foreground">Ghi chú</span>
            <p class="mt-1 whitespace-pre-wrap">{{ receipt.note }}</p>
          </div></CardContent
        ></Card
      >
    </div>
    <div
      v-else-if="query.isLoading.value"
      class="py-20 text-center text-muted-foreground"
    >
      Đang tải phiếu nhập...
    </div>
    <div v-else class="rounded-xl border border-dashed p-10 text-center">
      <p class="font-medium">Không thể tải phiếu nhập</p>
      <Button class="mt-4" variant="outline" @click="query.refetch()"
        >Thử lại</Button
      >
    </div>
  </section>

  <Dialog :open="confirmOpen" @update:open="(open) => { if (!open) closeRequestedAction() }"
    ><DialogContent class="sm:max-w-md"
      ><DialogHeader
        ><DialogTitle>Xác nhận nhập kho?</DialogTitle
        ><DialogDescription
          >Hành động này sẽ cộng {{ receipt?.totalQuantity ?? 0 }} sản phẩm vào
          tồn kho của {{ branchStore.scopeLabel }} và không thể sửa phiếu sau
          đó.</DialogDescription
        ></DialogHeader
      ><DialogFooter
        ><Button variant="outline" @click="closeRequestedAction">Đóng</Button
        ><Button :disabled="pending" @click="mutate('confirm')">{{
          pending ? "Đang xác nhận..." : "Xác nhận và cộng tồn"
        }}</Button></DialogFooter
      ></DialogContent
    ></Dialog
  >
  <Dialog :open="cancelOpen" @update:open="(open) => { if (!open) closeRequestedAction() }"
    ><DialogContent class="sm:max-w-md"
      ><DialogHeader
        ><DialogTitle>Hủy phiếu nhập?</DialogTitle
        ><DialogDescription
          >Phiếu sẽ chuyển sang trạng thái đã hủy và không làm thay đổi tồn
          kho.</DialogDescription
        ></DialogHeader
      ><DialogFooter
        ><Button variant="outline" @click="closeRequestedAction">Đóng</Button
        ><Button
          variant="destructive"
          :disabled="pending"
          @click="mutate('cancel')"
          >{{ pending ? "Đang hủy..." : "Hủy phiếu" }}</Button
        ></DialogFooter
      ></DialogContent
    ></Dialog
  >
</template>
