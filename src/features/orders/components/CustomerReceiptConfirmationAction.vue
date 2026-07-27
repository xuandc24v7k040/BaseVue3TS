<script setup lang="ts">
import { LoaderCircle, PackageCheck } from "@lucide/vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import type { CustomerOrderResponseDto } from "@/api/generated/models";
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
import { Button } from "@/components/ui/button";
import {
  confirmCustomerOrderReceived,
  customerOrderKeys,
} from "@/features/orders/api/customer-orders-api";
import { customerReceiptErrorMessage } from "@/features/orders/presentation/customer-order-errors";
import { publishOrderInvalidated } from "@/features/orders/state/order-sync-channel";

const props = defineProps<{
  orderId: string;
  compact?: boolean;
}>();

const emit = defineEmits<{
  confirmed: [order: CustomerOrderResponseDto];
}>();

const router = useRouter();
const queryClient = useQueryClient();
const dialogOpen = ref(false);
const submitting = ref(false);

const mutation = useMutation({
  mutationFn: () => confirmCustomerOrderReceived(props.orderId),
  onSuccess: async (order) => {
    queryClient.setQueryData(customerOrderKeys.detail(order.id), order);
    dialogOpen.value = false;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: customerOrderKeys.detail(order.id),
      }),
      queryClient.invalidateQueries({ queryKey: customerOrderKeys.all }),
    ]);
    publishOrderInvalidated(order.id);
    emit("confirmed", order);
    toast.success(
      "Đã xác nhận nhận hàng. Đơn hàng đang chờ chi nhánh hoàn tất.",
    );
    await router.replace({
      name: "customer-account-orders",
      query: { tab: "received", page: "1" },
    });
  },
  onError: (error) => toast.error(customerReceiptErrorMessage(error)),
});

function handleOpenChange(open: boolean): void {
  if (!open && submitting.value) return;
  dialogOpen.value = open;
}

async function confirmReceipt(event: MouseEvent): Promise<void> {
  event.preventDefault();
  event.stopPropagation();
  if (submitting.value) return;
  submitting.value = true;
  try {
    await mutation.mutateAsync();
  } catch {
    // onError owns the Vietnamese feedback; keep the dialog open for retry.
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Button
    type="button"
    :size="compact ? 'sm' : 'default'"
    :class="compact ? 'min-h-9' : undefined"
    @click.stop.prevent="dialogOpen = true"
  >
    <PackageCheck class="size-4" /> Đã nhận hàng
  </Button>

  <AlertDialog :open="dialogOpen" @update:open="handleOpenChange">
    <AlertDialogContent class="bookora-client-theme z-[51] pointer-events-auto">
      <AlertDialogHeader>
        <AlertDialogTitle>Xác nhận đã nhận hàng?</AlertDialogTitle>
        <AlertDialogDescription>
          Bạn xác nhận đã nhận đủ sản phẩm trong đơn hàng. Sau khi xác nhận, chi
          nhánh sẽ kiểm tra và hoàn thành đơn hàng.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel type="button" :disabled="submitting">
          Hủy
        </AlertDialogCancel>
        <AlertDialogAction
          type="button"
          :disabled="submitting"
          @click.capture="confirmReceipt"
        >
          <LoaderCircle v-if="submitting" class="size-4 animate-spin" />
          <PackageCheck v-else class="size-4" />
          Xác nhận đã nhận hàng
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
