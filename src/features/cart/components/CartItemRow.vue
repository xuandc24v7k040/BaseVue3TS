<script setup lang="ts">
import { BookOpen, Minus, Plus, Trash2 } from "@lucide/vue";
import { computed } from "vue";
import type { CartItemResponseDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cartVariantSummary } from "@/features/cart/utils/cart-display";

const props = defineProps<{
  item: CartItemResponseDto;
  selected: boolean;
  pending: boolean;
}>();

const emit = defineEmits<{
  "update:selected": [value: boolean];
  quantity: [value: number];
  remove: [];
}>();

const priceFormatter = new Intl.NumberFormat("vi-VN");
const variantSummary = computed(() => cartVariantSummary(props.item));

function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} đ`;
}

const displayMessage = computed(() => {
  if (props.item.issues.includes("PRICE_CHANGED")) {
    return `Giá sản phẩm đã thay đổi từ ${formatPrice(props.item.previousUnitPrice)} thành ${formatPrice(props.item.currentUnitPrice)}.`;
  }

  return props.item.message;
});

function updateSelected(value: boolean | "indeterminate"): void {
  emit("update:selected", value === true);
}
</script>

<template>
  <article
    class="grid gap-4 border-t border-[var(--bookora-border)] px-4 py-5 first:border-t-0 sm:px-6 lg:grid-cols-[auto_92px_minmax(0,1fr)_130px_145px_auto] lg:items-center"
    :class="{ 'opacity-55': !item.isCheckoutEligible }"
  >
    <Checkbox
      :model-value="selected"
      :disabled="!item.isSelectable || pending"
      :aria-label="`Chọn ${item.productName}`"
      @update:model-value="updateSelected"
    />

    <RouterLink
      :to="`/books/${item.productSlug}`"
      class="grid aspect-[3/4] w-20 place-items-center overflow-hidden rounded-md bg-[var(--bookora-soft)] sm:w-[92px]"
    >
      <img
        v-if="item.primaryImageUrl"
        :src="item.primaryImageUrl"
        :alt="item.productName"
        class="size-full object-cover"
      />
      <BookOpen v-else class="size-8 text-[var(--bookora-green)]/45" />
    </RouterLink>

    <div class="min-w-0">
      <RouterLink
        :to="`/books/${item.productSlug}`"
        class="font-bold hover:text-[var(--bookora-green)]"
      >
        {{ item.productName }}
      </RouterLink>
      <p
        v-if="variantSummary.visible"
        class="mt-1 text-sm text-[var(--bookora-muted)]"
      >
        {{ variantSummary.text }}
      </p>
      <div class="mt-3 flex flex-wrap items-baseline gap-2">
        <strong class="text-red-600">{{
          formatPrice(item.currentUnitPrice)
        }}</strong>
        <del
          v-if="item.originalPrice > item.currentUnitPrice"
          class="text-xs text-[var(--bookora-muted)]"
          >{{ formatPrice(item.originalPrice) }}</del
        >
      </div>
      <p
        v-if="displayMessage"
        class="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-800"
      >
        {{ displayMessage }}
      </p>
    </div>

    <div class="flex w-fit items-center rounded-lg border">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Giảm số lượng"
        :disabled="pending || !item.isQuantityEditable || item.quantity <= 1"
        @click="emit('quantity', item.quantity - 1)"
      >
        <Minus class="size-4" />
      </Button>
      <span class="w-9 text-center text-sm font-semibold">{{
        item.quantity
      }}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Tăng số lượng"
        :disabled="
          pending ||
          !item.isQuantityEditable ||
          item.quantity >= item.availableQuantity
        "
        @click="emit('quantity', item.quantity + 1)"
      >
        <Plus class="size-4" />
      </Button>
    </div>

    <strong class="text-lg text-red-600">{{
      formatPrice(item.lineSubtotal)
    }}</strong>

    <Button
      type="button"
      size="icon"
      variant="ghost"
      :disabled="pending"
      :aria-label="`Xóa ${item.productName}`"
      @click="emit('remove')"
    >
      <Trash2 class="size-4.5" />
    </Button>
  </article>
</template>
