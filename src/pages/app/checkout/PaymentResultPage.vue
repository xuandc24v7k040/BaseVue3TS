<script setup lang="ts">
import { CircleAlert, LoaderCircle, ShieldCheck } from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import {
  getPaymentStatus,
  retryVnpayPayment,
} from "@/features/checkout/api/checkout-api";
import { paymentStatusLabel } from "@/features/orders/presentation/order-status";
import { synchronizeCheckoutState } from "@/features/checkout/state/checkout-state-sync";

const route = useRoute();
const paymentId = computed(() => String(route.query.paymentId ?? ""));
const returnResult = computed(() =>
  String(route.query.returnResult ?? "invalid"),
);
const isRetrying = ref(false);
const pollingStartedAt = Date.now();
const pollingEnabled = ref(true);
let synchronizedStatus: string | null = null;
const statusQuery = useQuery({
  queryKey: computed(() => ["payment-status", paymentId.value]),
  queryFn: ({ signal }) => getPaymentStatus(paymentId.value, signal),
  enabled: computed(
    () => paymentId.value.length > 0 && paymentId.value !== "unknown",
  ),
  refetchInterval: (query) =>
    pollingEnabled.value &&
    query.state.data?.paymentStatus === "PENDING" &&
    Date.now() - pollingStartedAt < 60_000
      ? 2_000
      : false,
});
const isPaid = computed(() => statusQuery.data.value?.paymentStatus === "PAID");
const resultState = computed(() => {
  const status = statusQuery.data.value?.paymentStatus;
  if (status === "PAID") return "success";
  if (status === "CANCELLED") return "cancelled";
  if (status === "FAILED" || status === "EXPIRED") return "failed";
  if (returnResult.value === "invalid") return "invalid";
  if (returnResult.value === "cancelled") return "cancelled";
  if (returnResult.value === "failed") return "failed";
  return "processing";
});

watch(
  returnResult,
  async (result) => {
    if (result !== "failed" && result !== "cancelled") return;
    try {
      await synchronizeCheckoutState(false);
    } catch {
      // The status query remains authoritative and can retry on its next update.
    }
  },
  { immediate: true },
);

watch(
  () => statusQuery.data.value?.paymentStatus,
  async (status) => {
    if (!status || status === synchronizedStatus) return;
    if (status !== "PENDING") pollingEnabled.value = false;
    if (!["PAID", "FAILED", "CANCELLED", "EXPIRED"].includes(status)) return;
    synchronizedStatus = status;
    try {
      await synchronizeCheckoutState(
        status === "PAID",
        status === "PAID" ? "CLEAR_AFTER_VNPAY_PAID" : undefined,
      );
    } catch {
      synchronizedStatus = null;
    }
  },
);

onBeforeUnmount(() => {
  pollingEnabled.value = false;
});

async function retryPayment(): Promise<void> {
  if (!statusQuery.data.value || isRetrying.value) return;
  isRetrying.value = true;
  try {
    const result = await retryVnpayPayment(statusQuery.data.value.paymentId);
    window.location.assign(result.paymentUrl);
  } finally {
    isRetrying.value = false;
  }
}
</script>

<template>
  <div class="w-full min-w-0 bg-slate-50 py-8 sm:py-12">
    <div
      class="mx-auto max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm"
    >
      <LoaderCircle
        v-if="statusQuery.isLoading.value"
        class="mx-auto size-14 animate-spin text-green-600"
      />
      <ShieldCheck v-else-if="isPaid" class="mx-auto size-14 text-green-600" />
      <CircleAlert v-else class="mx-auto size-14 text-amber-500" />
      <h1 class="mt-5 text-2xl font-bold">
        {{
          resultState === "success"
            ? "Thanh toán thành công"
            : resultState === "cancelled"
              ? "Thanh toán đã hủy"
              : resultState === "failed"
                ? "Thanh toán thất bại"
                : resultState === "invalid"
                  ? "Dữ liệu trả về không hợp lệ"
                  : "Đang xác nhận thanh toán"
        }}
      </h1>
      <p class="mt-3 leading-6 text-slate-600">
        {{
          resultState === "invalid"
            ? "Dữ liệu trả về không có chữ ký hợp lệ. Trạng thái bên dưới vẫn được lấy trực tiếp từ hệ thống Bookora."
            : "Bookora chỉ xác nhận đơn sau khi nhận IPN hợp lệ từ VNPAY."
        }}
      </p>
      <div
        v-if="statusQuery.data.value"
        class="mt-6 rounded-xl bg-slate-50 p-4 text-sm"
      >
        <p>
          Mã đơn: <strong>{{ statusQuery.data.value.orderCode }}</strong>
        </p>
        <p class="mt-2">
          Trạng thái:
          <strong>{{
            paymentStatusLabel(statusQuery.data.value.paymentStatus)
          }}</strong>
        </p>
      </div>
      <div class="mt-7 flex justify-center gap-3">
        <Button
          v-if="
            statusQuery.data.value &&
            ['FAILED', 'CANCELLED', 'EXPIRED'].includes(
              statusQuery.data.value.paymentStatus,
            )
          "
          :disabled="isRetrying"
          @click="retryPayment"
        >
          <LoaderCircle v-if="isRetrying" class="size-4 animate-spin" />
          Thanh toán lại
        </Button>
        <Button v-if="statusQuery.data.value" as-child>
          <RouterLink
            :to="{
              name: 'customer-account-order-detail',
              params: { orderId: statusQuery.data.value.orderId },
            }"
          >
            Xem đơn hàng
          </RouterLink>
        </Button>
        <Button as-child variant="outline">
          <RouterLink to="/account/orders">Đơn của tôi</RouterLink>
        </Button>
      </div>
    </div>
  </div>
</template>
