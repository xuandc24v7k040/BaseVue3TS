<script setup lang="ts">
import { ArrowLeft, Ban, LoaderCircle, PackageCheck } from "@lucide/vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { toast } from "vue-sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cancelCustomerOrder,
  customerOrderKeys,
  getCustomerOrder,
} from "@/features/orders/api/customer-orders-api";
import CustomerReceiptConfirmationAction from "@/features/orders/components/CustomerReceiptConfirmationAction.vue";
import { ORDER_DETAIL_QUERY_POLICY } from "@/features/orders/api/order-query-policy";
import {
  customerOrderStatusLabel,
  paymentStatusLabel,
} from "@/features/orders/presentation/order-status";
import { publishInventoryChanged } from "@/features/storefront/state/inventory-sync-channel";
import { invalidateInventoryState } from "@/features/storefront/state/inventory-state";
import { formatDateTime } from "@/lib/date-format";
import type { PendingReviewOpportunityDto } from "@/api/generated/models";
import ReviewFormDialog from "@/features/engagement/components/ReviewFormDialog.vue";
import {
  engagementKeys,
  listPendingReviews,
} from "@/features/engagement/api/engagement-api";

const route = useRoute();
const queryClient = useQueryClient();
const orderId = computed(() => String(route.params.orderId ?? ""));
const cancelDialogOpen = ref(false);
const cancelSubmitting = ref(false);
const orderQuery = useQuery({
  ...ORDER_DETAIL_QUERY_POLICY,
  queryKey: computed(() => customerOrderKeys.detail(orderId.value)),
  queryFn: ({ signal }) => getCustomerOrder(orderId.value, signal),
});
const cancelMutation = useMutation({
  mutationFn: () => cancelCustomerOrder(orderId.value),
  onSuccess: async (order) => {
    const inventoryContext = {
      branchId: order.branchId,
      productIds: order.items.flatMap((item) =>
        item.productId ? [item.productId] : [],
      ),
      variantIds: order.items.flatMap((item) =>
        item.variantId ? [item.variantId] : [],
      ),
    };
    queryClient.setQueryData(customerOrderKeys.detail(order.id), order);
    cancelDialogOpen.value = false;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: customerOrderKeys.detail(order.id),
      }),
      queryClient.invalidateQueries({ queryKey: customerOrderKeys.all }),
      invalidateInventoryState(inventoryContext),
    ]);
    publishInventoryChanged(inventoryContext);
    toast.success("Đơn hàng đã được hủy.");
  },
  onError: () => toast.error("Đơn hàng không còn đủ điều kiện hủy."),
});
function handleCancelDialogOpenChange(open: boolean): void {
  if (!open && cancelSubmitting.value) return;
  cancelDialogOpen.value = open;
}
async function confirmCancellation(event: MouseEvent): Promise<void> {
  event.preventDefault();
  if (cancelSubmitting.value) return;
  cancelSubmitting.value = true;
  try {
    await cancelMutation.mutateAsync();
  } catch {
    // onError owns the Vietnamese feedback; keep the dialog open for retry.
  } finally {
    cancelSubmitting.value = false;
  }
}
const cancellable = computed(
  () => orderQuery.data.value?.allowedActions.cancel ?? false,
);
const reviewDialogOpen = ref(false);
const selectedOpportunity = ref<PendingReviewOpportunityDto | null>(null);
const pendingReviewParams = computed(() => ({
  page: 1,
  limit: 50,
  orderId: orderId.value,
}));
const pendingReviews = useQuery({
  queryKey: computed(() => engagementKeys.pending(pendingReviewParams.value)),
  queryFn: ({ signal }) =>
    listPendingReviews(pendingReviewParams.value, signal),
  enabled: computed(() => orderQuery.data.value?.status === "COMPLETED"),
});
function reviewProduct(item: PendingReviewOpportunityDto): void {
  selectedOpportunity.value = item;
  reviewDialogOpen.value = true;
}
const money = new Intl.NumberFormat("vi-VN");
</script>

<template>
  <div>
    <Button as-child variant="ghost" class="mb-4 -ml-3">
      <RouterLink to="/account/orders"
        ><ArrowLeft class="size-4" /> Trở lại</RouterLink
      >
    </Button>
    <div v-if="orderQuery.data.value" class="space-y-5">
      <section class="rounded-xl border bg-white p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-slate-500">Mã đơn hàng</p>
            <h1 class="mt-1 text-2xl font-bold">
              {{ orderQuery.data.value.orderCode }}
            </h1>
          </div>
          <Badge>{{
            customerOrderStatusLabel(
              orderQuery.data.value.status,
              orderQuery.data.value.customerReceiptConfirmation.confirmed,
            )
          }}</Badge>
        </div>
        <div class="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
          <div>
            <p class="text-xs uppercase text-slate-400">Thanh toán</p>
            <p class="mt-1 font-medium">
              {{ orderQuery.data.value.paymentMethod }} ·
              {{ paymentStatusLabel(orderQuery.data.value.paymentStatus) }}
            </p>
          </div>
          <div>
            <p class="text-xs uppercase text-slate-400">Ngày đặt</p>
            <p class="mt-1 font-medium">
              {{
                new Date(orderQuery.data.value.placedAt).toLocaleString("vi-VN")
              }}
            </p>
          </div>
          <div>
            <p class="text-xs uppercase text-slate-400">Tổng thanh toán</p>
            <p class="mt-1 text-lg font-bold text-green-700">
              {{ money.format(orderQuery.data.value.totalAmount) }}đ
            </p>
          </div>
        </div>
      </section>
      <section
        v-if="pendingReviews.data.value?.items.length"
        class="rounded-xl border bg-white p-5"
      >
        <h2 class="font-bold">Sản phẩm chờ đánh giá</h2>
        <div class="mt-3 space-y-3">
          <div
            v-for="item in pendingReviews.data.value.items"
            :key="item.product.id"
            class="flex items-center justify-between gap-4 border-t pt-3 first:border-0"
          >
            <div>
              <p class="font-medium">{{ item.product.name }}</p>
              <p class="text-xs text-muted-foreground">Đơn hàng đã hoàn tất</p>
            </div>
            <Button size="sm" @click="reviewProduct(item)"
              >Đánh giá ngay</Button
            >
          </div>
        </div>
      </section>
      <section class="flex items-center gap-3 rounded-xl border bg-white p-5">
        <PackageCheck class="size-8 text-green-700" />
        <div>
          <h2 class="font-bold">Snapshot đơn hàng đã được lưu</h2>
          <p class="text-sm text-slate-500">
            Giá, chi nhánh và thông tin giao hàng của đơn không bị thay đổi theo
            dữ liệu catalog sau này.
          </p>
        </div>
      </section>
      <section class="rounded-xl border bg-white p-5">
        <h2 class="font-bold">Sản phẩm</h2>
        <ul class="mt-4 divide-y">
          <li
            v-for="item in orderQuery.data.value.items"
            :key="item.id"
            class="flex gap-4 py-4 first:pt-0 last:pb-0"
          >
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.productName"
              class="h-20 w-14 rounded border object-cover"
            />
            <div class="min-w-0 flex-1">
              <strong>{{ item.productName }}</strong>
              <p class="text-sm text-slate-500">{{ item.variantLabel }}</p>
              <p class="mt-1 text-sm">Số lượng: {{ item.quantity }}</p>
            </div>
            <strong>{{ money.format(item.lineTotal) }}đ</strong>
          </li>
        </ul>
      </section>
      <section class="grid gap-5 rounded-xl border bg-white p-5 sm:grid-cols-2">
        <div>
          <h2 class="font-bold">Giao đến</h2>
          <p class="mt-2 text-sm">{{ orderQuery.data.value.receiverName }}</p>
          <p class="text-sm text-slate-500">
            {{ orderQuery.data.value.receiverPhone }}
          </p>
          <p class="mt-1 text-sm leading-6 text-slate-600">
            {{ orderQuery.data.value.shippingAddress }}
          </p>
        </div>
        <div>
          <h2 class="font-bold">Vận chuyển</h2>
          <p class="mt-2 text-sm">{{ orderQuery.data.value.branchName }}</p>
          <p class="text-sm text-slate-500">
            {{ orderQuery.data.value.shippingServiceName }}
          </p>
          <p class="mt-1 text-sm">
            Phí: {{ money.format(orderQuery.data.value.shippingFee) }}đ
          </p>
        </div>
      </section>
      <section
        v-if="orderQuery.data.value.customerReceiptConfirmation.confirmed"
        class="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        Bạn đã xác nhận nhận hàng lúc
        <strong>{{
          formatDateTime(
            orderQuery.data.value.customerReceiptConfirmation.confirmedAt,
          )
        }}</strong
        >.
      </section>
      <CustomerReceiptConfirmationAction
        v-if="orderQuery.data.value.allowedActions.confirmReceived"
        :order-id="orderQuery.data.value.id"
      />
      <ReviewFormDialog
        v-model:open="reviewDialogOpen"
        :opportunity="selectedOpportunity"
      />
      <Button
        v-if="cancellable"
        variant="destructive"
        @click="cancelDialogOpen = true"
      >
        <Ban class="size-4" /> Hủy đơn hàng
      </Button>
    </div>
    <AlertDialog
      :open="cancelDialogOpen"
      @update:open="handleCancelDialogOpenChange"
    >
      <AlertDialogContent
        class="bookora-client-theme z-[51] pointer-events-auto"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận hủy đơn hàng</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc muốn hủy đơn
            <strong v-if="orderQuery.data.value">{{
              orderQuery.data.value.orderCode
            }}</strong
            >? Thao tác này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button" :disabled="cancelSubmitting">
            Không, quay lại
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="cancelSubmitting"
            @click.capture="confirmCancellation"
          >
            <LoaderCircle v-if="cancelSubmitting" class="size-4 animate-spin" />
            <Ban v-else class="size-4" />
            Xác nhận hủy
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
