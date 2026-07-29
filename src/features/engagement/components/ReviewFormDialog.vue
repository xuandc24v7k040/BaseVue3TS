<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { BookOpen, LoaderCircle, Star } from "@lucide/vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toast } from "vue-sonner";
import type {
  CustomerReviewDto,
  PendingReviewOpportunityDto,
} from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  createReview,
  engagementKeys,
  updateReview,
} from "../api/engagement-api";
import { customerOrderKeys } from "@/features/orders/api/customer-orders-api";
import { publishEngagementChange } from "../state/engagement-sync";

const props = defineProps<{
  open: boolean;
  opportunity?: PendingReviewOpportunityDto | null;
  review?: CustomerReviewDto | null;
}>();
const emit = defineEmits<{ "update:open": [value: boolean]; saved: [] }>();
const rating = ref(5);
const content = ref("");
const queryClient = useQueryClient();
const product = computed(
  () => props.review?.product ?? props.opportunity?.product ?? null,
);
const ratingLabels = [
  "Rất tệ",
  "Tệ",
  "Bình thường",
  "Tốt",
  "Tuyệt vời",
] as const;

watch(
  () => [props.open, props.review, props.opportunity] as const,
  ([open, review]) => {
    if (!open) return;
    rating.value = review?.rating ?? 5;
    content.value = review?.content ?? "";
  },
  { immediate: true },
);

const mutation = useMutation({
  mutationFn: () => {
    const normalized = content.value.trim() || null;
    if (props.review) {
      return updateReview(props.review.id, {
        rating: rating.value,
        content: normalized,
      });
    }
    if (!props.opportunity) throw new Error("MISSING_OPPORTUNITY");
    return createReview({
      orderId: props.opportunity.orderId,
      productId: props.opportunity.product.id,
      rating: rating.value,
      content: normalized,
    });
  },
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: engagementKeys.reviews });
    void queryClient.invalidateQueries({ queryKey: engagementKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.all });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.details });
    publishEngagementChange();
    toast.success(
      props.review ? "Đã cập nhật đánh giá." : "Đã gửi đánh giá của bạn.",
    );
    emit("saved");
    emit("update:open", false);
  },
  onError: () => toast.error("Không thể gửi đánh giá. Vui lòng thử lại."),
});

function submit(): void {
  if (mutation.isPending.value) return;
  mutation.mutate();
}

function updateOpen(value: boolean): void {
  if (!value && mutation.isPending.value) return;
  emit("update:open", value);
}
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent
      class="grid max-h-[min(90vh,700px)] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0"
    >
      <DialogHeader class="border-b px-5 py-4 sm:px-6">
        <DialogTitle>Đánh giá sản phẩm</DialogTitle>
        <DialogDescription as-child>
          <div class="mt-3 flex min-w-0 items-center gap-3 text-left">
            <img
              v-if="product?.imageUrl"
              :src="product.imageUrl"
              :alt="`Bìa ${product.name}`"
              class="h-16 w-11 shrink-0 rounded border object-cover"
            />
            <span
              v-else
              class="grid h-16 w-11 shrink-0 place-items-center rounded border bg-muted"
            >
              <BookOpen class="size-5" />
            </span>
            <strong
              class="min-w-0 line-clamp-2 break-words text-sm text-foreground"
            >
              {{ product?.name }}
            </strong>
          </div>
        </DialogDescription>
      </DialogHeader>

      <ScrollArea type="auto" class="min-h-0">
        <form
          id="review-form"
          class="space-y-6 px-5 py-5 sm:px-6"
          @submit.prevent="submit"
        >
          <fieldset>
            <legend class="text-sm font-semibold">Đánh giá chung</legend>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <button
                v-for="value in 5"
                :key="value"
                type="button"
                class="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
                :aria-label="`${value} sao — ${ratingLabels[value - 1]}`"
                :aria-pressed="rating === value"
                @click="rating = value"
              >
                <Star
                  :class="[
                    'size-8',
                    value <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/50',
                  ]"
                />
              </button>
              <span class="ml-1 text-sm font-medium">
                {{ rating }} sao — {{ ratingLabels[rating - 1] }}
              </span>
            </div>
          </fieldset>

          <div>
            <label for="review-content" class="block text-sm font-semibold">
              Chia sẻ trải nghiệm của bạn
              <span class="font-normal text-muted-foreground">
                (không bắt buộc)
              </span>
            </label>
            <Textarea
              id="review-content"
              v-model="content"
              maxlength="2000"
              placeholder="Nội dung sách, chất lượng in ấn hoặc trải nghiệm nhận hàng..."
              class="mt-2 min-h-36 max-h-56 resize-y overflow-y-auto [scrollbar-color:var(--bookora-green)_transparent] [scrollbar-width:thin] focus-visible:border-[var(--bookora-green)]/35 focus-visible:ring-1 focus-visible:ring-[var(--bookora-green)]/15"
            />
            <p class="mt-1 text-right text-xs text-muted-foreground">
              {{ content.length }}/2000
            </p>
          </div>
        </form>
      </ScrollArea>

      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6">
        <Button
          variant="outline"
          type="button"
          :disabled="mutation.isPending.value"
          @click="updateOpen(false)"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          form="review-form"
          :disabled="mutation.isPending.value"
        >
          <LoaderCircle
            v-if="mutation.isPending.value"
            class="size-4 animate-spin"
          />
          {{
            mutation.isPending.value
              ? "Đang lưu..."
              : review
                ? "Lưu đánh giá"
                : "Gửi đánh giá"
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
