<script setup lang="ts">
import { AlertTriangle, BookOpen, Home, RefreshCcw } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { toast } from "vue-sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartActions, useCartQuery } from "@/features/cart/api/cart-api";
import CartItemRow from "@/features/cart/components/CartItemRow.vue";
import CartSidebar from "@/features/cart/components/CartSidebar.vue";
import { cartErrorMessage } from "@/features/cart/utils/cart-error";
import { useAuthStore } from "@/stores/auth.store";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";

const authStore = useAuthStore();
const branchStore = useStorefrontBranchStore();
const cartQuery = useCartQuery(
  computed(
    () =>
      authStore.user?.type === "CUSTOMER" &&
      Boolean(branchStore.selectedBranchId),
  ),
);
const actions = useCartActions();
const selectedItemIds = ref(new Set<string>());
const knownItemIds = ref(new Set<string>());
const pendingItemIds = ref(new Set<string>());
const cart = computed(() => cartQuery.data.value ?? null);
const eligibleItems = computed(
  () => cart.value?.items.filter((item) => item.isCheckoutEligible) ?? [],
);
const selectedItems = computed(() =>
  eligibleItems.value.filter((item) =>
    selectedItemIds.value.has(item.cartItemId),
  ),
);
const allSelected = computed<boolean | "indeterminate">(() => {
  if (!eligibleItems.value.length) return false;
  const count = selectedItems.value.length;
  if (count === 0) return false;
  return count === eligibleItems.value.length ? true : "indeterminate";
});
const selectedQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.quantity, 0),
);
const subtotal = computed(() =>
  selectedItems.value.reduce(
    (sum, item) => sum + item.originalPrice * item.quantity,
    0,
  ),
);
const discount = computed(() =>
  selectedItems.value.reduce(
    (sum, item) => sum + item.discount * item.quantity,
    0,
  ),
);
const total = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.lineSubtotal, 0),
);

watch(
  () => cart.value?.items,
  (items = []) => {
    const eligible = new Set(
      items
        .filter((item) => item.isCheckoutEligible)
        .map((item) => item.cartItemId),
    );
    const next = new Set(
      [...selectedItemIds.value].filter((id) => eligible.has(id)),
    );
    for (const id of eligible) {
      if (!knownItemIds.value.has(id)) next.add(id);
    }
    selectedItemIds.value = next;
    knownItemIds.value = new Set(items.map((item) => item.cartItemId));
  },
  { immediate: true },
);

function toggleAll(value: boolean | "indeterminate"): void {
  selectedItemIds.value =
    value === true
      ? new Set(eligibleItems.value.map((item) => item.cartItemId))
      : new Set();
}

function toggleItem(itemId: string, selected: boolean): void {
  const next = new Set(selectedItemIds.value);
  if (selected) next.add(itemId);
  else next.delete(itemId);
  selectedItemIds.value = next;
}

async function updateQuantity(itemId: string, quantity: number): Promise<void> {
  if (pendingItemIds.value.has(itemId)) return;
  pendingItemIds.value = new Set([...pendingItemIds.value, itemId]);
  try {
    await actions.update(itemId, { quantity });
    toast.success("Đã cập nhật số lượng.");
  } catch (error: unknown) {
    toast.error(cartErrorMessage(error));
  } finally {
    const next = new Set(pendingItemIds.value);
    next.delete(itemId);
    pendingItemIds.value = next;
  }
}

async function removeItem(itemId: string): Promise<void> {
  if (pendingItemIds.value.has(itemId)) return;
  pendingItemIds.value = new Set([...pendingItemIds.value, itemId]);
  try {
    await actions.remove(itemId);
    toast.success("Đã xóa sản phẩm khỏi giỏ hàng.");
  } catch (error: unknown) {
    toast.error(cartErrorMessage(error));
  } finally {
    const next = new Set(pendingItemIds.value);
    next.delete(itemId);
    pendingItemIds.value = next;
  }
}
</script>

<template>
  <div class="w-full min-w-0">
    <nav
      aria-label="Breadcrumb"
      class="mb-5 flex items-center gap-2 text-sm text-[var(--bookora-muted)]"
    >
      <RouterLink to="/" aria-label="Trang chủ">
        <Home class="size-4 text-[var(--bookora-green)]" />
      </RouterLink>
      <span>/</span><span aria-current="page">Giỏ hàng</span>
    </nav>

    <div v-if="cartQuery.isPending.value" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div class="space-y-3 rounded-xl border p-5">
        <Skeleton class="h-8 w-52" />
        <Skeleton v-for="index in 4" :key="index" class="h-36 w-full" />
      </div>
      <div class="space-y-3">
        <Skeleton class="h-40 w-full" /><Skeleton class="h-56 w-full" /><Skeleton
          class="h-64 w-full"
        />
      </div>
    </div>

    <div
      v-else-if="cartQuery.isError.value"
      class="grid min-h-[50vh] place-items-center rounded-xl border border-dashed p-8 text-center"
    >
      <div>
        <AlertTriangle class="mx-auto size-14 text-amber-600" />
        <h1 class="mt-4 text-2xl font-bold">Không thể tải giỏ hàng</h1>
        <p class="mt-2 text-sm text-[var(--bookora-muted)]">
          {{ cartErrorMessage(cartQuery.error.value, "Không thể tải giỏ hàng. Vui lòng thử lại.") }}
        </p>
        <Button type="button" class="mt-5" @click="cartQuery.refetch()">
          <RefreshCcw class="size-4" /> Thử lại
        </Button>
      </div>
    </div>

    <div v-else-if="cart">
      <h1 class="mb-4 text-3xl font-bold">
        Giỏ hàng
        <span class="text-base font-medium"
          >({{ cart.totalQuantity }} sản phẩm)</span
        >
      </h1>

      <Alert
        v-if="cart.hasBlockingIssues"
        class="mb-4 border-amber-200 bg-amber-50"
      >
        <AlertTriangle class="size-4 text-amber-700" />
        <AlertTitle>Một số sản phẩm cần được kiểm tra</AlertTitle>
        <AlertDescription>
          Sản phẩm không hợp lệ đã được bỏ chọn và không tính vào tổng tiền.
        </AlertDescription>
      </Alert>

      <div class="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <main class="min-w-0">
          <section
            v-if="cart.items.length"
            class="overflow-hidden rounded-xl border bg-background shadow-sm"
          >
            <div
              class="flex min-h-14 items-center gap-3 px-4 sm:px-6"
            >
              <Checkbox
                :model-value="allSelected"
                :disabled="eligibleItems.length === 0"
                aria-label="Chọn tất cả sản phẩm hợp lệ"
                @update:model-value="toggleAll"
              />
              <strong>Chọn tất cả ({{ eligibleItems.length }} sản phẩm)</strong>
              <span class="ml-auto hidden text-sm text-[var(--bookora-muted)] lg:block"
                >Số lượng &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Thành tiền</span
              >
            </div>
            <CartItemRow
              v-for="item in cart.items"
              :key="item.cartItemId"
              :item="item"
              :selected="selectedItemIds.has(item.cartItemId)"
              :pending="pendingItemIds.has(item.cartItemId)"
              @update:selected="toggleItem(item.cartItemId, $event)"
              @quantity="updateQuantity(item.cartItemId, $event)"
              @remove="removeItem(item.cartItemId)"
            />
          </section>

          <section
            v-else
            class="grid min-h-[360px] place-items-center rounded-xl border border-dashed bg-background p-8 text-center"
          >
            <div>
              <BookOpen class="mx-auto size-16 text-[var(--bookora-green)]/40" />
              <h2 class="mt-4 text-2xl font-bold">Giỏ hàng đang trống</h2>
              <p class="mt-2 text-sm text-[var(--bookora-muted)]">
                Hãy chọn thêm những cuốn sách bạn yêu thích.
              </p>
              <Button as-child class="mt-5">
                <RouterLink to="/books">Tiếp tục mua sắm</RouterLink>
              </Button>
            </div>
          </section>

          <div
            class="mt-4 rounded-xl border border-green-100 bg-green-50/70 px-4 py-3 text-sm text-[var(--bookora-green)]"
          >
            <strong
              >Giá và tồn kho được cập nhật theo chi nhánh
              {{ cart.branch.name }}.</strong
            >
            <span class="mt-1 block text-xs text-[var(--bookora-muted)]"
              >Bạn có thể thay đổi chi nhánh ở khối bên phải.</span
            >
          </div>
        </main>

        <CartSidebar
          :selected-item-ids="[...selectedItemIds]"
          :selected-quantity="selectedQuantity"
          :subtotal="subtotal"
          :discount="discount"
          :total="total"
        />
      </div>
    </div>
  </div>
</template>
