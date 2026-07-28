<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  ArrowRight,
  ClipboardCheck,
  ShoppingBag,
  Star,
  Truck,
  Wallet,
} from "@lucide/vue";
import { RouterLink } from "vue-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  engagementKeys,
  getAccountDashboard,
} from "@/features/engagement/api/engagement-api";
import { customerOrderStatusLabel } from "@/features/orders/presentation/order-status";
import { formatDateTime } from "@/lib/date-format";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const dashboard = useQuery({
  queryKey: engagementKeys.dashboard,
  queryFn: ({ signal }) => getAccountDashboard(signal),
});
const stats = computed(() => [
  {
    value: dashboard.data.value?.totalOrders ?? 0,
    label: "Tổng đơn hàng",
    icon: ShoppingBag,
    to: "/account/orders",
  },
  {
    value: money.format(dashboard.data.value?.totalSpent ?? 0),
    label: "Tổng tiền đã chi tiêu",
    icon: Wallet,
    to: "/account/orders",
  },
  {
    value: dashboard.data.value?.writtenReviewCount ?? 0,
    label: "Sản phẩm đã đánh giá",
    icon: Star,
    to: "/account/reviews",
  },
]);
const attention = computed(() => [
  {
    title: "Đang giao",
    value: dashboard.data.value?.shippingOrderCount ?? 0,
    detail: "Đơn hàng đang trên đường",
    action: "Xem chi tiết",
    icon: Truck,
    to: "/account/orders",
  },
  {
    title: "Chờ đánh giá",
    value: dashboard.data.value?.pendingReviewCount ?? 0,
    detail: "Sản phẩm chờ bạn đánh giá",
    action: "Đánh giá ngay",
    icon: ClipboardCheck,
    to: "/account/reviews",
  },
]);
</script>

<template>
  <div class="grid min-w-0 gap-4 sm:gap-5">
    <section
      class="relative overflow-hidden rounded-xl border border-[var(--bookora-border)] bg-[var(--bookora-cream)] px-6 py-7 sm:px-8"
    >
      <div class="relative z-10 max-w-xl">
        <p class="font-semibold text-[var(--bookora-green)]">
          Chào mừng trở lại,
        </p>
        <h1
          class="mt-1 text-2xl font-bold text-[var(--bookora-green)] sm:text-3xl"
        >
          {{ authStore.user?.fullName }}!
        </h1>
        <p class="mt-3 text-sm leading-6">
          Cảm ơn bạn đã luôn đồng hành cùng Bookora.<br />Cùng khám phá những
          cuốn sách hay nhé!
        </p>
      </div>
      <div
        aria-hidden="true"
        class="absolute -bottom-8 right-6 hidden items-end gap-2 opacity-70 lg:flex"
      >
        <div
          class="h-20 w-36 rotate-[-3deg] rounded-md bg-[#87936b] shadow-md"
        />
        <div
          class="size-20 rounded-b-2xl rounded-t-md bg-[var(--bookora-green)]"
        />
        <div class="h-28 w-14 rounded-t-full bg-[#9cab75]" />
      </div>
    </section>

    <section
      aria-label="Thống kê tài khoản"
      class="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <Card
        v-for="stat in stats"
        :key="stat.label"
        class="min-w-0 p-5 shadow-none"
        ><div class="flex items-center gap-4">
          <span
            class="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--bookora-soft)] text-[var(--bookora-green)]"
            ><component :is="stat.icon" class="size-7"
          /></span>
          <div class="min-w-0">
            <p class="text-2xl font-bold text-[var(--bookora-green)]">
              {{ stat.value }}
            </p>
            <p class="text-sm text-[var(--bookora-muted)]">{{ stat.label }}</p>
            <RouterLink
              :to="stat.to"
              class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--bookora-green)]"
              >Xem chi tiết <ArrowRight class="size-3.5"
            /></RouterLink>
          </div></div
      ></Card>
    </section>

    <Card class="min-w-0 bg-[var(--bookora-cream)] p-5 shadow-none"
      ><h2 class="font-semibold">Việc cần quan tâm</h2>
      <div
        class="mt-4 grid gap-5 md:grid-cols-3 md:divide-x md:divide-[var(--bookora-border)]"
      >
        <div
          v-for="item in attention"
          :key="item.title"
          class="flex min-w-0 gap-3 md:px-4 first:md:pl-0"
        >
          <span
            class="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--bookora-soft)] text-[var(--bookora-green)]"
            ><component :is="item.icon" class="size-6"
          /></span>
          <div class="min-w-0">
            <p class="text-sm font-semibold">{{ item.title }}</p>
            <p>
              <strong class="mr-2 text-lg">{{ item.value }}</strong
              ><span class="text-xs text-[var(--bookora-muted)]">{{
                item.detail
              }}</span>
            </p>
            <RouterLink
              :to="item.to"
              class="mt-1 inline-flex items-center gap-1 text-xs text-[var(--bookora-green)]"
              >{{ item.action }} <ArrowRight class="size-3"
            /></RouterLink>
          </div>
        </div></div
    ></Card>

    <Card class="min-w-0 p-5 shadow-none"
      ><div class="flex items-center justify-between">
        <h2 class="font-semibold">Đơn hàng gần đây</h2>
        <RouterLink
          to="/account/orders"
          class="text-xs text-[var(--bookora-green)]"
          >Xem tất cả →</RouterLink
        >
      </div>
      <div
        v-if="dashboard.data.value?.latestOrder"
        class="mt-4 grid min-w-0 gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
      >
        <img
          v-if="dashboard.data.value.latestOrder.productImageUrl"
          :src="dashboard.data.value.latestOrder.productImageUrl"
          :alt="dashboard.data.value.latestOrder.productName"
          class="h-24 w-16 rounded object-cover"
        />
        <div class="min-w-0 flex-1">
          <p class="line-clamp-2 break-words font-semibold">
            {{ dashboard.data.value.latestOrder.productName }}
          </p>
          <p
            class="mt-1 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]"
          >
            {{ dashboard.data.value.latestOrder.orderCode }} ·
            {{ dashboard.data.value.latestOrder.itemCount }} mặt hàng ·
            {{ dashboard.data.value.latestOrder.totalQuantity }} sản phẩm
          </p>
          <time
            :datetime="dashboard.data.value.latestOrder.placedAt"
            class="mt-1 block text-xs text-muted-foreground"
          >
            {{ formatDateTime(dashboard.data.value.latestOrder.placedAt) }}
          </time>
        </div>
        <div class="flex items-end justify-between gap-3 sm:flex-col">
          <Badge variant="secondary">
            {{
              customerOrderStatusLabel(
                dashboard.data.value.latestOrder.status,
                dashboard.data.value.latestOrder.customerConfirmedReceived,
              )
            }}
          </Badge>
          <p class="whitespace-nowrap font-semibold">
            {{ money.format(dashboard.data.value.latestOrder.totalAmount) }}
          </p>
        </div>
      </div>
      <p v-else class="mt-4 text-sm text-muted-foreground">
        Bạn chưa có đơn hàng nào.
      </p></Card
    >

    <Card class="min-w-0 overflow-hidden p-5 shadow-none"
      ><div class="flex justify-between">
        <h2 class="font-semibold">Sản phẩm yêu thích</h2>
        <RouterLink
          to="/account/wishlist"
          class="text-xs text-[var(--bookora-green)]"
          >Xem tất cả →</RouterLink
        >
      </div>
      <ScrollArea
        type="auto"
        class="mt-4 min-w-0 max-w-full"
        scrollbar-orientation="horizontal"
        ><div
          v-if="dashboard.data.value?.latestWishlistItems.length"
          class="flex w-max gap-5 pb-4"
        >
          <article
            v-for="item in dashboard.data.value.latestWishlistItems"
            :key="item.id"
            class="grid w-60 shrink-0 grid-cols-[4rem_1fr] gap-3"
          >
            <img
              v-if="item.product.imageUrl"
              :src="item.product.imageUrl"
              :alt="`Bìa ${item.product.name}`"
              class="h-24 w-16 rounded object-cover"
            />
            <div class="min-w-0">
              <RouterLink
                :to="`/books/${item.product.slug}`"
                class="line-clamp-2 min-h-10 break-words font-medium leading-5 [overflow-wrap:anywhere]"
                >{{ item.product.name }}</RouterLink
              >
              <p class="mt-1 truncate text-sm text-[var(--bookora-muted)]">
                {{ item.product.authors.join(", ") }}
              </p>
              <p class="mt-2 text-sm font-semibold">
                {{
                  item.product.price.current
                    ? money.format(item.product.price.current)
                    : "Liên hệ"
                }}
              </p>
            </div>
          </article>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          Bạn chưa lưu sách yêu thích.
        </p></ScrollArea
      ></Card
    >
  </div>
</template>
