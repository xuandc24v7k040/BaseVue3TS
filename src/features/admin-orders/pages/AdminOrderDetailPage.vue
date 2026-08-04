<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  ArrowLeft,
  Check,
  Circle,
  FileText,
  Package,
  RefreshCcw,
  UserRound,
  WalletCards,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import { useRoute, useRouter } from "vue-router";
import type { AdminOrderDetailDtoStatus } from "@/api/generated/models";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ORDER_DETAIL_QUERY_POLICY } from "@/features/orders/api/order-query-policy";
import { useBranchStore } from "@/stores/branch.store";
import { publishOrderInvalidated } from "@/features/orders/state/order-sync-channel";
import { publishInventoryChanged } from "@/features/storefront/state/inventory-sync-channel";
import { invalidateInventoryState } from "@/features/storefront/state/inventory-state";
import {
  cancelAdminOrder,
  getAdminOrder,
  transitionAdminOrder,
  updateAdminOrderInternalNote,
} from "../api/admin-orders-api";
import { adminOrderKeys } from "../api/admin-order-query-keys";
import {
  actorTypeLabel,
  adminOrderErrorMessage,
  formatDateTime,
  formatMoney,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  transitionLabel,
} from "../utils/admin-order-format";

type DialogMode = "transition" | "cancel" | "note";

const route = useRoute();
const router = useRouter();
const branchStore = useBranchStore();
const queryClient = useQueryClient();
const orderId = computed(() => String(route.params.id ?? ""));
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const routePrefix = computed<"super-admin" | "branch-admin">(() =>
  String(route.name).startsWith("super-admin") ? "super-admin" : "branch-admin",
);
const dialogMode = ref<DialogMode | null>(null);
const targetStatus = ref<AdminOrderDetailDtoStatus | null>(null);
const dialogText = ref("");
const saving = ref(false);

const orderQuery = useQuery({
  ...ORDER_DETAIL_QUERY_POLICY,
  queryKey: computed(() =>
    adminOrderKeys.detail(branchId.value, orderId.value),
  ),
  queryFn: ({ signal }) => getAdminOrder(orderId.value, signal),
  enabled: computed(() => Boolean(branchId.value && orderId.value)),
});
const order = computed(() => orderQuery.data.value);

const progressSteps = [
  { status: "PENDING", label: "Chờ xác nhận", detail: "Đơn mới được tạo" },
  { status: "CONFIRMED", label: "Đã xác nhận", detail: "Đã kiểm tra tồn kho" },
  { status: "PACKING", label: "Đang xử lý", detail: "Đang chuẩn bị hàng" },
  { status: "SHIPPING", label: "Đang giao", detail: "Đơn đang vận chuyển" },
  { status: "COMPLETED", label: "Hoàn thành", detail: "Đã hoàn tất đơn" },
] as const;

const currentProgress = computed(() => {
  const status = order.value?.status;
  if (status === "PENDING_PAYMENT" || status === "PAYMENT_FAILED") return -1;
  return progressSteps.findIndex((step) => step.status === status);
});

const nextAction = computed(() => {
  const actions = order.value?.allowedActions;
  if (!actions) return null;
  if (actions.confirm) return "CONFIRMED" as const;
  if (actions.startPacking) return "PACKING" as const;
  if (actions.startShipping) return "SHIPPING" as const;
  if (actions.complete) return "COMPLETED" as const;
  return null;
});
const waitingForCustomerReceipt = computed(
  () =>
    order.value?.completionReadiness.reasonCode === "WAITING_CUSTOMER_RECEIPT",
);

function openTransition(status: AdminOrderDetailDtoStatus): void {
  targetStatus.value = status;
  dialogText.value = "";
  dialogMode.value = "transition";
}

function openCancel(): void {
  targetStatus.value = null;
  dialogText.value = "";
  dialogMode.value = "cancel";
}

function openNote(): void {
  targetStatus.value = null;
  dialogText.value = order.value?.internalNote ?? "";
  dialogMode.value = "note";
}

function closeDialog(): void {
  if (saving.value) return;
  dialogMode.value = null;
  targetStatus.value = null;
  dialogText.value = "";
}

const dialogValid = computed(() => {
  if (dialogMode.value === "transition") return Boolean(targetStatus.value);
  if (dialogMode.value === "cancel") return dialogText.value.trim().length >= 3;
  if (dialogMode.value === "note") return dialogText.value.length <= 2000;
  return false;
});

async function submitDialog(): Promise<void> {
  if (!order.value || !dialogMode.value || !dialogValid.value || saving.value)
    return;
  saving.value = true;
  try {
    const completedMode = dialogMode.value;
    const completedTarget = targetStatus.value;
    const updated =
      dialogMode.value === "transition" && targetStatus.value
        ? await transitionAdminOrder(order.value.id, {
            targetStatus: targetStatus.value,
            ...(dialogText.value.trim()
              ? { note: dialogText.value.trim() }
              : {}),
          })
        : dialogMode.value === "cancel"
          ? await cancelAdminOrder(order.value.id, {
              reason: dialogText.value.trim(),
            })
          : await updateAdminOrderInternalNote(order.value.id, {
              note: dialogText.value.trim(),
            });
    queryClient.setQueryData(
      adminOrderKeys.detail(branchId.value, orderId.value),
      updated,
    );
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.detail(branchId.value, orderId.value),
      }),
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.lists(branchId.value),
      }),
    ]);
    if (completedMode === "transition" || completedMode === "cancel") {
      publishOrderInvalidated(updated.id);
    }
    if (completedMode === "cancel") {
      const inventoryContext = {
        branchId: updated.branchId,
        productIds: updated.items.flatMap((item) =>
          item.productId ? [item.productId] : [],
        ),
        variantIds: updated.items.flatMap((item) =>
          item.variantId ? [item.variantId] : [],
        ),
      };
      await invalidateInventoryState(inventoryContext);
      publishInventoryChanged(inventoryContext);
    }
    toast.success(
      completedMode === "note"
        ? "Đã lưu ghi chú nội bộ."
        : completedMode === "cancel"
          ? "Đã hủy đơn hàng và xử lý hoàn tồn kho."
          : completedTarget === "COMPLETED"
            ? "Đã hoàn thành đơn hàng."
            : "Đã cập nhật trạng thái đơn hàng.",
    );
    dialogMode.value = null;
    targetStatus.value = null;
    dialogText.value = "";
  } catch (error) {
    toast.error(adminOrderErrorMessage(error, "Không thể cập nhật đơn hàng."));
    await orderQuery.refetch();
  } finally {
    saving.value = false;
  }
}

function backToList(): void {
  void router.push({ name: `${routePrefix.value}-orders` });
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Đơn hàng"
      :group-to="{ name: `${routePrefix}-orders` }"
      section-label="Chi tiết"
    />

    <div
      v-if="orderQuery.isLoading.value"
      class="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground"
    >
      Đang tải chi tiết đơn hàng...
    </div>
    <div
      v-else-if="orderQuery.isError.value || !order"
      class="rounded-xl border border-destructive/30 bg-card p-10 text-center"
    >
      <p class="font-medium">Không thể tải chi tiết đơn hàng.</p>
      <Button class="mt-4" variant="outline" @click="orderQuery.refetch()">
        <RefreshCcw class="mr-2 size-4" />Thử lại
      </Button>
    </div>

    <template v-else>
      <header
        class="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="min-w-0">
          <h1
            class="truncate text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {{ order.orderCode }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ order.branchName }} · Đặt lúc
            {{ formatDateTime(order.placedAt) }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="backToList">
            <ArrowLeft class="mr-2 size-4" />Danh sách
          </Button>
          <Button
            v-if="order.allowedActions.updateInternalNote"
            variant="outline"
            @click="openNote"
          >
            <FileText class="mr-2 size-4" />Ghi chú
          </Button>
          <Button v-if="nextAction" @click="openTransition(nextAction)">
            {{ transitionLabel[nextAction] }}
          </Button>
          <TooltipProvider
            v-else-if="waitingForCustomerReceipt"
            :delay-duration="200"
          >
            <Tooltip>
              <TooltipTrigger as-child>
                <span tabindex="0">
                  <Button disabled>Hoàn thành đơn</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent class="max-w-72">
                Đang chờ khách hàng xác nhận đã nhận hàng.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            v-if="order.allowedActions.cancel"
            variant="destructive"
            @click="openCancel"
          >
            Hủy đơn
          </Button>
        </div>
      </header>

      <div class="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card class="min-w-0">
          <CardHeader class="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Thông tin đơn hàng</CardTitle>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ order.itemLineCount }} mặt hàng ·
                {{ order.totalQuantity }} sản phẩm
              </p>
            </div>
            <Badge variant="outline">{{
              orderStatusLabel[order.status]
            }}</Badge>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="grid gap-4 sm:grid-cols-5">
              <div
                v-for="(step, index) in progressSteps"
                :key="step.status"
                class="relative min-w-0 text-center"
              >
                <div
                  v-if="index > 0"
                  class="absolute right-1/2 top-4 hidden h-px w-full sm:block"
                  :class="index <= currentProgress ? 'bg-primary' : 'bg-border'"
                />
                <div
                  class="relative mx-auto flex size-8 items-center justify-center rounded-full border bg-background"
                  :class="
                    index <= currentProgress
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  "
                >
                  <Check v-if="index < currentProgress" class="size-4" />
                  <Package
                    v-else-if="index === currentProgress"
                    class="size-4"
                  />
                  <Circle v-else class="size-3" />
                </div>
                <p class="mt-3 text-sm font-medium">{{ step.label }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ step.detail }}
                </p>
              </div>
            </div>

            <Tabs default-value="products" class="min-w-0">
              <TabsList class="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="products"
                  ><Package class="mr-2 size-4" />Sản phẩm</TabsTrigger
                >
                <TabsTrigger value="customer"
                  ><UserRound class="mr-2 size-4" />Khách & giao
                  hàng</TabsTrigger
                >
                <TabsTrigger value="payment"
                  ><WalletCards class="mr-2 size-4" />Thanh toán</TabsTrigger
                >
                <TabsTrigger value="history"
                  ><RefreshCcw class="mr-2 size-4" />Lịch sử</TabsTrigger
                >
              </TabsList>

              <TabsContent
                value="products"
                class="mt-5 overflow-hidden rounded-lg border"
              >
                <ScrollArea
                  type="auto"
                  scrollbar-orientation="horizontal"
                  class="w-full min-w-0 max-w-full overflow-hidden"
                >
                  <table class="w-full min-w-[42rem] pb-3 text-sm">
                    <thead class="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th class="px-4 py-3">Sản phẩm</th>
                        <th class="px-4 py-3 text-right">Đơn giá</th>
                        <th class="px-4 py-3 text-right">SL</th>
                        <th class="px-4 py-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y">
                      <tr v-for="item in order.items" :key="item.id">
                        <td class="px-4 py-4">
                          <p class="font-medium">{{ item.productName }}</p>
                          <p class="mt-1 text-xs text-muted-foreground">
                            {{ item.variantLabel
                            }}<span v-if="item.sku"> · SKU {{ item.sku }}</span>
                          </p>
                        </td>
                        <td class="px-4 py-4 text-right tabular-nums">
                          {{ formatMoney(item.unitPrice) }}
                        </td>
                        <td class="px-4 py-4 text-right tabular-nums">
                          {{ item.quantity }}
                        </td>
                        <td
                          class="px-4 py-4 text-right font-semibold tabular-nums"
                        >
                          {{ formatMoney(item.lineTotal) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="customer"
                class="mt-5 grid gap-4 lg:grid-cols-2"
              >
                <div class="rounded-lg border p-5">
                  <h3 class="font-semibold">Khách hàng</h3>
                  <p class="mt-5 font-medium">{{ order.customerName }}</p>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ order.customerEmail }}
                  </p>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ order.customerPhone || "Chưa có số điện thoại" }}
                  </p>
                </div>
                <div class="rounded-lg border p-5">
                  <h3 class="font-semibold">Giao hàng</h3>
                  <p class="mt-5 font-medium">
                    {{ order.receiverName }} · {{ order.receiverPhone }}
                  </p>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ order.shippingAddress }}
                  </p>
                  <p class="mt-2 text-sm">Giao hàng tiêu chuẩn</p>
                  <p
                    v-if="order.estimatedDeliveryAt"
                    class="mt-1 text-sm text-muted-foreground"
                  >
                    Dự kiến: {{ formatDateTime(order.estimatedDeliveryAt) }}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="payment" class="mt-5 rounded-lg border p-5">
                <template v-if="order.payment">
                  <div
                    class="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <h3 class="font-semibold">
                        {{ paymentMethodLabel[order.payment.method] }}
                      </h3>
                      <p class="mt-1 text-sm text-muted-foreground">
                        Tạo lúc {{ formatDateTime(order.payment.createdAt) }}
                      </p>
                    </div>
                    <Badge variant="outline">{{
                      paymentStatusLabel[order.payment.status]
                    }}</Badge>
                  </div>
                  <p class="mt-5 text-lg font-semibold tabular-nums">
                    {{ formatMoney(order.payment.amount) }}
                  </p>
                  <div
                    v-if="order.payment.transactions.length"
                    class="mt-5 divide-y rounded-lg border"
                  >
                    <div
                      v-for="transaction in order.payment.transactions"
                      :key="transaction.id"
                      class="grid gap-2 p-4 text-sm sm:grid-cols-3"
                    >
                      <div>
                        <p class="text-muted-foreground">Nhà cung cấp</p>
                        <p class="font-medium">{{ transaction.provider }}</p>
                      </div>
                      <div>
                        <p class="text-muted-foreground">Trạng thái</p>
                        <p class="font-medium">{{ transaction.status }}</p>
                      </div>
                      <div>
                        <p class="text-muted-foreground">Mã giao dịch</p>
                        <p class="break-all font-mono text-xs">
                          {{ transaction.providerTransactionNo || "—" }}
                        </p>
                      </div>
                    </div>
                  </div>
                </template>
                <p v-else class="text-sm text-muted-foreground">
                  Không có thông tin thanh toán.
                </p>
              </TabsContent>

              <TabsContent value="history" class="mt-5">
                <div v-if="order.history.length" class="space-y-0">
                  <div
                    v-for="entry in order.history"
                    :key="entry.id"
                    class="relative border-l pl-6 pb-6 last:pb-0"
                  >
                    <span
                      class="absolute -left-1.5 top-1 size-3 rounded-full bg-primary"
                    />
                    <p class="font-medium">
                      {{
                        entry.eventType === "CUSTOMER_RECEIPT_CONFIRMED"
                          ? "Khách hàng đã xác nhận nhận hàng"
                          : entry.toStatus
                            ? orderStatusLabel[entry.toStatus]
                            : "Sự kiện đơn hàng"
                      }}
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {{ formatDateTime(entry.createdAt) }} ·
                      {{
                        entry.actorDisplayName ||
                        entry.actorRole ||
                        entry.branchName
                      }}
                      · {{ actorTypeLabel[entry.actorType] }} ·
                      {{ entry.branchName }}
                    </p>
                    <p v-if="entry.reason || entry.note" class="mt-2 text-sm">
                      {{ entry.reason || entry.note }}
                    </p>
                  </div>
                </div>
                <p
                  v-else
                  class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
                >
                  Chưa có lịch sử trạng thái được ghi nhận cho đơn hàng này.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <aside class="space-y-5">
          <Card>
            <CardHeader
              ><CardTitle class="text-base"
                >Tổng kết đơn hàng</CardTitle
              ></CardHeader
            >
            <CardContent class="space-y-3 text-sm">
              <div class="flex justify-between gap-4">
                <span class="text-muted-foreground">Tạm tính</span
                ><span class="tabular-nums">{{
                  formatMoney(order.subtotalAmount)
                }}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-muted-foreground">Giảm giá</span
                ><span class="tabular-nums text-emerald-600"
                  >-{{ formatMoney(order.discountAmount) }}</span
                >
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-muted-foreground">Phí giao hàng</span
                ><span class="tabular-nums">{{
                  formatMoney(order.shippingFee)
                }}</span>
              </div>
              <div class="flex items-end justify-between gap-4 border-t pt-4">
                <span class="font-semibold">Tổng thanh toán</span
                ><span class="text-lg font-bold text-primary tabular-nums">{{
                  formatMoney(order.totalAmount)
                }}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              ><CardTitle class="text-base">Ghi chú</CardTitle></CardHeader
            >
            <CardContent class="space-y-5 text-sm">
              <div>
                <p class="font-medium">Khách hàng</p>
                <p class="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {{ order.customerNote || "Không có ghi chú" }}
                </p>
              </div>
              <div class="border-t pt-4">
                <p class="font-medium">Nội bộ</p>
                <p class="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {{ order.internalNote || "Chưa có ghi chú nội bộ" }}
                </p>
                <p
                  v-if="order.internalNoteUpdatedAt"
                  class="mt-2 text-xs text-muted-foreground"
                >
                  Cập nhật {{ formatDateTime(order.internalNoteUpdatedAt) }}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card v-if="order.status === 'CANCELLED'">
            <CardHeader
              ><CardTitle class="text-base text-destructive"
                >Đơn đã hủy</CardTitle
              ></CardHeader
            >
            <CardContent class="text-sm"
              ><p>{{ order.cancelReason || "Không có lý do" }}</p>
              <p v-if="order.cancelledAt" class="mt-2 text-muted-foreground">
                {{ formatDateTime(order.cancelledAt) }}
              </p></CardContent
            >
          </Card>
        </aside>
      </div>
    </template>
  </section>

  <Dialog
    :open="Boolean(dialogMode)"
    @update:open="
      (open) => {
        if (!open) closeDialog();
      }
    "
  >
    <DialogContent
      class="grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
    >
      <DialogHeader class="border-b p-5">
        <DialogTitle>{{
          dialogMode === "cancel"
            ? "Hủy đơn hàng"
            : dialogMode === "note"
              ? "Ghi chú nội bộ"
              : targetStatus
                ? transitionLabel[targetStatus]
                : "Cập nhật trạng thái"
        }}</DialogTitle>
        <DialogDescription>{{
          dialogMode === "cancel"
            ? "Tồn kho sẽ được hoàn lại đúng một lần nếu đơn đã giữ hoặc trừ tồn."
            : dialogMode === "note"
              ? "Ghi chú này chỉ hiển thị cho nhân sự quản trị."
              : "Xác nhận chuyển đơn sang bước xử lý kế tiếp."
        }}</DialogDescription>
      </DialogHeader>
      <ScrollArea class="min-h-0 overflow-hidden">
        <div class="space-y-3 p-5 pr-7">
          <Label for="order-dialog-text">{{
            dialogMode === "cancel"
              ? "Lý do hủy"
              : dialogMode === "note"
                ? "Nội dung ghi chú"
                : "Ghi chú chuyển trạng thái (không bắt buộc)"
          }}</Label>
          <Textarea
            id="order-dialog-text"
            v-model="dialogText"
            :maxlength="dialogMode === 'note' ? 2000 : 500"
            :placeholder="
              dialogMode === 'cancel'
                ? 'Nhập lý do hủy đơn...'
                : 'Nhập ghi chú...'
            "
            class="min-h-32"
          />
          <p
            v-if="
              dialogMode === 'cancel' &&
              dialogText.trim().length > 0 &&
              dialogText.trim().length < 3
            "
            class="text-sm text-destructive"
          >
            Lý do hủy cần ít nhất 3 ký tự.
          </p>
          <p class="text-right text-xs text-muted-foreground">
            {{ dialogText.length }} / {{ dialogMode === "note" ? 2000 : 500 }}
          </p>
        </div>
      </ScrollArea>
      <DialogFooter class="border-t bg-background p-4">
        <Button variant="outline" :disabled="saving" @click="closeDialog"
          >Đóng</Button
        >
        <Button
          :variant="dialogMode === 'cancel' ? 'destructive' : 'default'"
          :disabled="saving || !dialogValid"
          @click="submitDialog"
          >{{
            saving
              ? "Đang lưu..."
              : dialogMode === "cancel"
                ? "Xác nhận hủy"
                : "Lưu thay đổi"
          }}</Button
        >
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
