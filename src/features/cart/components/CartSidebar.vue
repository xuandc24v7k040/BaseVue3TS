<script setup lang="ts">
import {
  Clock3,
  Headphones,
  KeyRound,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
} from "@lucide/vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import BranchSelector from "@/components/client/layout/BranchSelector.vue";
import { serializeCheckoutCartItemIds } from "@/features/checkout/utils/checkout-selection";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";

const props = defineProps<{
  selectedItemIds: string[];
  selectedQuantity: number;
  subtotal: number;
  discount: number;
  total: number;
}>();

const branchStore = useStorefrontBranchStore();
const router = useRouter();
const isStartingCheckout = ref(false);
const formatter = new Intl.NumberFormat("vi-VN");

function formatPrice(value: number): string {
  return `${formatter.format(value)}đ`;
}

async function startCheckout(): Promise<void> {
  if (isStartingCheckout.value || props.selectedItemIds.length === 0) return;
  isStartingCheckout.value = true;
  try {
    await router.push({
      name: "client-checkout",
      query: { items: serializeCheckoutCartItemIds(props.selectedItemIds) },
    });
  } catch {
    toast.error(
      "Không thể bắt đầu thanh toán. Vui lòng kiểm tra lại giỏ hàng.",
    );
  } finally {
    isStartingCheckout.value = false;
  }
}

const commitments = [
  {
    icon: Clock3,
    title: "Giá được tính lại theo chi nhánh",
    detail: "Luôn cập nhật ưu đãi và giá tốt nhất",
  },
  {
    icon: KeyRound,
    title: "Kiểm tra tồn kho theo thời gian thực",
    detail: "Đặt hàng nhanh chóng, chính xác",
  },
  {
    icon: RefreshCcw,
    title: "Đổi trả trong 15 ngày",
    detail: "Hỗ trợ đổi trả dễ dàng",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ khách hàng 24/7",
    detail: "Luôn sẵn sàng hỗ trợ bạn",
  },
];
</script>

<template>
  <aside class="space-y-3">
    <section class="rounded-xl border bg-background p-4 shadow-sm">
      <h2 class="flex items-center gap-2 font-bold text-[var(--bookora-green)]">
        <MapPin class="size-5" /> Nhận tại chi nhánh
      </h2>
      <div class="mt-3 rounded-lg border p-3 text-sm">
        <p>
          Chi nhánh:
          <strong class="text-[var(--bookora-green)]">{{
            branchStore.selectedBranch?.name ?? "Chưa chọn"
          }}</strong>
        </p>
        <p class="mt-1 leading-5 text-[var(--bookora-muted)]">
          {{
            branchStore.selectedBranch?.address ?? "Vui lòng chọn chi nhánh."
          }}
        </p>
        <BranchSelector class="mt-3" />
      </div>
    </section>

    <section class="rounded-xl border bg-background p-4 shadow-sm">
      <h2 class="flex items-center gap-2 font-bold text-[var(--bookora-green)]">
        <ShieldCheck class="size-5" /> Cam kết Bookora
      </h2>
      <ul class="mt-3 space-y-3">
        <li
          v-for="commitment in commitments"
          :key="commitment.title"
          class="flex gap-3 text-sm"
        >
          <span
            class="grid size-8 shrink-0 place-items-center rounded-full bg-green-50 text-[var(--bookora-green)]"
          >
            <component :is="commitment.icon" class="size-4" />
          </span>
          <span>
            <strong class="block">{{ commitment.title }}</strong>
            <span class="text-xs text-[var(--bookora-muted)]">{{
              commitment.detail
            }}</span>
          </span>
        </li>
      </ul>
    </section>

    <section class="rounded-xl border bg-background p-4 shadow-sm">
      <h2 class="text-lg font-bold">Tóm tắt đơn hàng</h2>
      <dl class="mt-3 space-y-2 text-sm">
        <div class="flex justify-between gap-4">
          <dt>Tạm tính ({{ selectedQuantity }} sản phẩm)</dt>
          <dd>{{ formatPrice(subtotal) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt>Giảm giá</dt>
          <dd class="text-red-600">-{{ formatPrice(discount) }}</dd>
        </div>
      </dl>
      <Separator class="my-4" />
      <div class="flex items-center justify-between">
        <strong class="text-lg">Tổng cộng</strong>
        <strong class="text-2xl text-red-600">{{ formatPrice(total) }}</strong>
      </div>
      <p class="mt-1 text-xs text-[var(--bookora-muted)]">
        Đã bao gồm VAT (nếu có)
      </p>
      <Button
        type="button"
        class="mt-4 h-11 w-full bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
        :disabled="selectedQuantity === 0 || isStartingCheckout"
        @click="startCheckout"
      >
        <ShieldCheck class="size-4.5" />
        {{ isStartingCheckout ? "Đang chuẩn bị..." : "Tiến hành thanh toán" }}
      </Button>
      <Button as-child variant="outline" class="mt-2 h-11 w-full">
        <RouterLink to="/san-pham">
          <ShoppingCart class="size-4.5" /> Tiếp tục mua sắm
        </RouterLink>
      </Button>
    </section>
  </aside>
</template>
