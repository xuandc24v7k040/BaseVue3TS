<script setup lang="ts">
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  PackageX,
  RefreshCw,
  Truck,
} from "@lucide/vue";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerAddresses } from "@/features/customer-account/composables/use-customer-account";
import { useStorefrontAvailabilityQuery } from "@/features/storefront/api/storefront-api";
import { storefrontErrorMessage } from "@/features/storefront/utils/storefront-error";
import { useAuthStore } from "@/stores/auth.store";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";

const props = defineProps<{
  productId: string;
  productSlug: string;
  variantId: string;
}>();
const authStore = useAuthStore();
const branchStore = useStorefrontBranchStore();
const isCustomer = computed(
  () =>
    authStore.status === "authenticated" && authStore.user?.type === "CUSTOMER",
);
const returnTo = computed(() => `/books/${props.productSlug}`);
const addressesQuery = useCustomerAddresses({ enabled: isCustomer });
const defaultAddress = computed(
  () => addressesQuery.data.value?.find((address) => address.isDefault) ?? null,
);
const hasAddresses = computed(() => Boolean(addressesQuery.data.value?.length));
const availabilityParams = computed(() => ({
  variantId: props.variantId || undefined,
}));
const availabilityQuery = useStorefrontAvailabilityQuery(
  computed(() => branchStore.selectedBranchId),
  computed(() => props.productId),
  availabilityParams,
);
const status = computed(() => availabilityQuery.data.value?.status);
</script>

<template>
  <aside class="space-y-4">
    <section
      class="rounded-xl border border-[var(--bookora-border)] bg-background p-5"
    >
      <h2 class="font-bold">Giao hàng đến</h2>
      <div class="mt-2 flex items-start gap-2 text-sm">
        <MapPin class="mt-0.5 size-4 shrink-0 text-[var(--bookora-green)]" />
        <div>
          <template v-if="authStore.status === 'unknown'">
            <span>Đang kiểm tra thông tin giao hàng...</span>
          </template>
          <template v-else-if="!isCustomer">
            <span>Đăng nhập để chọn địa chỉ giao hàng.</span>
            <RouterLink
              :to="{ path: '/login', query: { returnTo } }"
              class="ml-1 font-semibold text-[var(--bookora-green)] hover:underline"
              >Đăng nhập</RouterLink
            >
          </template>
          <template v-else-if="addressesQuery.isPending.value">
            <span>Đang tải địa chỉ giao hàng...</span>
          </template>
          <template v-else-if="addressesQuery.isError.value">
            <span>Không thể tải địa chỉ giao hàng.</span>
            <Button
              type="button"
              variant="link"
              class="ml-1 h-auto p-0 text-[var(--bookora-green)]"
              @click="addressesQuery.refetch()"
              >Thử lại</Button
            >
          </template>
          <template v-else-if="defaultAddress">
            <strong class="block">{{ defaultAddress.recipientName }}</strong>
            <span>{{ defaultAddress.formattedAddress }}</span>
            <RouterLink
              :to="{ path: '/account/addresses', query: { returnTo } }"
              class="mt-1 block font-semibold text-[var(--bookora-green)] hover:underline"
              >Thay đổi</RouterLink
            >
          </template>
          <template v-else-if="hasAddresses">
            <span>Bạn chưa chọn địa chỉ mặc định.</span>
            <RouterLink
              :to="{ path: '/account/addresses', query: { returnTo } }"
              class="ml-1 font-semibold text-[var(--bookora-green)] hover:underline"
              >Chọn địa chỉ</RouterLink
            >
          </template>
          <template v-else>
            <span>Bạn chưa có địa chỉ giao hàng.</span>
            <RouterLink
              :to="{ path: '/account/addresses', query: { returnTo } }"
              class="ml-1 font-semibold text-[var(--bookora-green)] hover:underline"
              >Thêm địa chỉ</RouterLink
            >
          </template>
        </div>
      </div>

      <div class="mt-4 border-t pt-4">
        <h3 class="text-sm font-semibold">
          Tình trạng tại
          {{ branchStore.selectedBranch?.name ?? "chi nhánh đã chọn" }}
        </h3>
        <div v-if="availabilityQuery.isPending.value" class="mt-3 space-y-2">
          <Skeleton class="h-12" /><Skeleton class="h-12" />
        </div>
        <div
          v-else-if="availabilityQuery.isError.value"
          class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          <p>
            {{
              storefrontErrorMessage(
                availabilityQuery.error.value,
                "Không thể tải tình trạng còn hàng. Vui lòng thử lại.",
              )
            }}
          </p>
          <Button
            type="button"
            variant="link"
            class="mt-1 h-auto p-0 text-red-700"
            @click="availabilityQuery.refetch()"
            ><RefreshCw class="size-3.5" /> Thử lại</Button
          >
        </div>
        <div
          v-else-if="availabilityQuery.data.value"
          class="mt-3 rounded-lg border p-3"
        >
          <p
            v-if="status === 'IN_STOCK'"
            class="flex items-center gap-2 font-semibold text-emerald-700"
          >
            <CheckCircle2 class="size-5" /> Còn hàng
          </p>
          <p
            v-else-if="status === 'LOW_STOCK'"
            class="flex items-center gap-2 font-semibold text-amber-700"
          >
            <AlertTriangle class="size-5" /> Sắp hết hàng
          </p>
          <p v-else class="flex items-center gap-2 font-semibold text-red-700">
            <PackageX class="size-5" /> Hết hàng tại chi nhánh
          </p>
          <p class="mt-1 text-xs text-[var(--bookora-muted)]">
            Số lượng khả dụng:
            {{ availabilityQuery.data.value.availableQuantity }}
          </p>
        </div>
      </div>

      <div class="mt-4 border-t pt-4 text-sm">
        <p class="flex gap-2">
          <Truck class="size-4 text-[var(--bookora-green)]" />
          <span
            ><strong class="block">Giao hàng tiêu chuẩn</strong>Thời gian dự
            kiến sẽ được xác nhận khi đặt hàng.</span
          >
        </p>
      </div>
    </section>
    <section
      class="rounded-xl border border-[var(--bookora-border)] bg-background p-5"
    >
      <h2 class="font-bold">Ưu đãi & cam kết</h2>
      <ul class="mt-3 space-y-3 text-sm">
        <li>✓ Đổi trả miễn phí trong 15 ngày</li>
        <li>✓ Cam kết hàng thật 100%</li>
        <li>✓ Xuất hóa đơn điện tử</li>
      </ul>
    </section>
  </aside>
</template>
