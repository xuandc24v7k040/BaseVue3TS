<script setup lang="ts">
import { CheckCircle2, PackageSearch } from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { getCustomerOrder } from "@/features/orders/api/customer-orders-api";

const route = useRoute();
const orderId = computed(() => String(route.params.orderId ?? ""));
const orderQuery = useQuery({
  queryKey: computed(() => ["customer-order", orderId.value]),
  queryFn: ({ signal }) => getCustomerOrder(orderId.value, signal),
});
const money = new Intl.NumberFormat("vi-VN");
</script>

<template>
  <div class="w-full min-w-0 bg-slate-50 py-8 sm:py-12">
    <div
      class="mx-auto w-full max-w-2xl rounded-2xl border bg-white p-6 text-center shadow-sm sm:p-8"
    >
      <CheckCircle2 class="mx-auto size-16 text-green-600" />
      <h1 class="mt-5 text-3xl font-bold">Đặt hàng thành công</h1>
      <p class="mt-2 text-slate-600">
        Bookora đã tiếp nhận đơn hàng và sẽ sớm xác nhận với bạn.
      </p>
      <div v-if="orderQuery.data.value" class="mt-6 rounded-xl bg-slate-50 p-5">
        <p class="text-sm text-slate-500">Mã đơn hàng</p>
        <p class="mt-1 text-xl font-bold">{{ orderQuery.data.value.orderCode }}</p>
        <p class="mt-3 text-sm">
          Tổng thanh toán:
          <strong class="text-green-700"
            >{{ money.format(orderQuery.data.value.totalAmount) }}đ</strong
          >
        </p>
      </div>
      <div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button as-child>
          <RouterLink
            :to="{
              name: 'customer-account-order-detail',
              params: { orderId },
            }"
          >
            <PackageSearch class="size-4" /> Xem chi tiết đơn
          </RouterLink>
        </Button>
        <Button as-child variant="outline">
          <RouterLink to="/books">Tiếp tục mua sắm</RouterLink>
        </Button>
      </div>
    </div>
  </div>
</template>
