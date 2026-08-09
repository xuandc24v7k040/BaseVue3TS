<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";
import { Heart } from "@lucide/vue";
import { getActivePinia } from "pinia";
import { computed } from "vue";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { queryClient } from "@/lib/query-client";
import { engagementKeys, setWishlist } from "../api/engagement-api";
import { publishEngagementChange } from "../state/engagement-sync";
import {
  setLocalWishlistStatus,
  useWishlistStatus,
  useWishlistStatusPending,
} from "../composables/use-wishlist-status";

const props = withDefaults(
  defineProps<{ productId: string; compact?: boolean }>(),
  { compact: true },
);
const pinia = getActivePinia();
const auth = pinia ? useAuthStore(pinia) : null;
const statusEnabled = computed(
  () => auth?.isAuthenticated === true && auth.user?.type === "CUSTOMER",
);
const wished = useWishlistStatus(
  () => props.productId,
  statusEnabled,
);
const statusPending = useWishlistStatusPending(
  () => props.productId,
  statusEnabled,
);

const mutation = useMutation(
  {
    mutationFn: (next: boolean) => setWishlist(props.productId, next),
    onMutate: (next) => {
      const previous = wished.value;
      setLocalWishlistStatus(props.productId, next);
      return { previous };
    },
    onSuccess: (_data, next) => {
      void queryClient.invalidateQueries({ queryKey: engagementKeys.wishlist });
      void queryClient.invalidateQueries({
        queryKey: engagementKeys.dashboard,
      });
      publishEngagementChange();
      toast.success(
        next
          ? "Đã thêm sách vào danh sách yêu thích."
          : "Đã xóa sách khỏi danh sách yêu thích.",
      );
    },
    onError: (_error, _next, context) => {
      if (context) {
        setLocalWishlistStatus(props.productId, context.previous);
      }
      toast.error("Không thể cập nhật sách yêu thích. Vui lòng thử lại.");
    },
  },
  queryClient,
);

async function toggle(event: MouseEvent): Promise<void> {
  event.preventDefault();
  event.stopPropagation();
  if (!auth?.isAuthenticated || auth.user?.type !== "CUSTOMER") {
    toast.info(
      "Vui lòng đăng nhập tài khoản khách hàng để lưu sách yêu thích.",
    );
    const { router } = await import("@/router");
    await router.push({
      name: "customer-login",
      query: { returnTo: router.currentRoute.value.fullPath },
    });
    return;
  }
  mutation.mutate(!wished.value);
}
</script>

<template>
  <Button
    type="button"
    :variant="compact ? 'ghost' : 'outline'"
    :size="compact ? 'icon' : 'default'"
    :disabled="mutation.isPending.value || statusPending"
    :aria-pressed="wished"
    :aria-label="wished ? 'Bỏ khỏi sách yêu thích' : 'Thêm vào sách yêu thích'"
    class="cursor-pointer disabled:cursor-not-allowed"
    @click="toggle"
  >
    <Heart
      aria-hidden="true"
      :class="[
        'size-4.5',
        wished && 'fill-current text-[var(--bookora-green)]',
      ]"
    />
    <span v-if="!compact">{{ wished ? "Đã yêu thích" : "Yêu thích" }}</span>
  </Button>
</template>
