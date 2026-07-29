<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MessageSquareText,
  Star,
} from "@lucide/vue";
import type { StorefrontProductReviewsListParams } from "@/api/generated/models";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatRelativeTime } from "@/lib/date-format";
import { engagementKeys, listPublicReviews } from "../api/engagement-api";

type ReviewFilter = "all" | "verified" | "5" | "4" | "3" | "2" | "1";
const PUBLIC_REVIEW_PAGE_SIZE = 4;

const props = defineProps<{ productId: string }>();
const page = ref(1);
const filter = ref<ReviewFilter>("all");
const expanded = ref<Set<string>>(new Set());
const filters: Array<{ value: ReviewFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "verified", label: "Đã mua hàng" },
  { value: "5", label: "5 sao" },
  { value: "4", label: "4 sao" },
  { value: "3", label: "3 sao" },
  { value: "2", label: "2 sao" },
  { value: "1", label: "1 sao" },
];
const params = computed<StorefrontProductReviewsListParams>(() => ({
  page: page.value,
  limit: PUBLIC_REVIEW_PAGE_SIZE,
  rating: /^[1-5]$/.test(filter.value) ? Number(filter.value) : undefined,
  verifiedPurchase: filter.value === "verified" ? true : undefined,
}));
const query = useQuery({
  queryKey: computed(() =>
    engagementKeys.public(props.productId, params.value),
  ),
  queryFn: ({ signal }) =>
    listPublicReviews(props.productId, params.value, signal),
  placeholderData: (previous) => previous,
});
const averageRating = computed(() => query.data.value?.averageRating ?? 0);
const distribution = computed(() => {
  const counts = new Map(
    (query.data.value?.ratingDistribution ?? []).map((item) => [
      item.rating,
      item.count,
    ]),
  );
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: counts.get(rating) ?? 0,
    percentage: query.data.value?.reviewCount
      ? ((counts.get(rating) ?? 0) / query.data.value.reviewCount) * 100
      : 0,
  }));
});

function reviewerInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BK"
  );
}

function changeFilter(value: string): void {
  filter.value = value as ReviewFilter;
  page.value = 1;
  expanded.value = new Set();
}

function changePage(nextPage: number): void {
  page.value = nextPage;
  expanded.value = new Set();
}

function toggle(id: string): void {
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}
</script>

<template>
  <div class="mt-5 min-w-0 space-y-4">
    <Card
      class="grid min-w-0 gap-6 p-5 shadow-sm md:grid-cols-[18rem_minmax(0,1fr)] md:p-7"
    >
      <div
        class="flex flex-col items-center justify-center border-b pb-6 text-center md:border-b-0 md:border-r md:pb-0 md:pr-7"
      >
        <div class="flex items-end">
          <strong class="text-6xl font-bold tracking-tight">{{
            averageRating.toFixed(1)
          }}</strong>
          <span class="mb-1 text-2xl font-semibold text-muted-foreground"
            >/5</span
          >
        </div>
        <div
          class="mt-4 flex gap-1 text-amber-400"
          :aria-label="`${averageRating.toFixed(1)} trên 5 sao`"
        >
          <Star
            v-for="value in 5"
            :key="value"
            :class="[
              'size-7',
              value <= Math.round(averageRating) && 'fill-current',
            ]"
          />
        </div>
        <p class="mt-4 text-sm text-muted-foreground">
          {{ query.data.value?.reviewCount ?? 0 }} lượt đánh giá
        </p>
      </div>

      <div class="grid content-center gap-3">
        <div
          v-for="item in distribution"
          :key="item.rating"
          class="grid grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-sm"
        >
          <span class="inline-flex items-center gap-1 font-medium">
            {{ item.rating }}
            <Star class="size-4 fill-amber-400 text-amber-400" />
          </span>
          <Progress :model-value="item.percentage" class="h-2.5" />
          <span class="text-right text-muted-foreground">
            {{ item.count }} đánh giá
          </span>
        </div>
      </div>
    </Card>

    <div class="min-w-0 space-y-3">
      <h3 class="font-semibold">Lọc đánh giá</h3>
      <div class="w-full min-w-0 max-w-full">
        <RadioGroup
          :model-value="filter"
          class="!flex min-w-0 flex-wrap gap-2"
          aria-label="Lọc đánh giá sản phẩm"
          @update:model-value="changeFilter(String($event))"
        >
          <label
            v-for="item in filters"
            :key="item.value"
            class="inline-flex h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-full border px-5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-[var(--bookora-green)]"
            :class="
              filter === item.value
                ? 'border-[var(--bookora-green)] bg-[var(--bookora-soft)] text-[var(--bookora-green)]'
                : 'border-[var(--bookora-border)] bg-background hover:border-[var(--bookora-green)]/50'
            "
          >
            <RadioGroupItem :value="item.value" class="sr-only" />
            {{ item.label }}
          </label>
        </RadioGroup>
      </div>
      <RadioGroup
        :model-value="filter"
        class="hidden"
        aria-label="Lọc đánh giá sản phẩm"
        @update:model-value="changeFilter(String($event))"
      >
        <label
          v-for="item in filters"
          :key="item.value"
          class="inline-flex h-9 cursor-pointer items-center justify-center whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-[var(--bookora-green)]"
          :class="
            filter === item.value
              ? 'border-[var(--bookora-green)] bg-[var(--bookora-soft)] text-[var(--bookora-green)]'
              : 'border-[var(--bookora-border)] bg-background hover:border-[var(--bookora-green)]/50'
          "
        >
          <RadioGroupItem :value="item.value" class="sr-only" />
          {{ item.label }}
        </label>
      </RadioGroup>
    </div>

    <div class="relative rounded-xl border bg-background px-5 sm:px-6">
      <div
        v-if="query.isFetching.value && query.data.value"
        class="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow"
      >
        <LoaderCircle class="size-3.5 animate-spin" /> Đang cập nhật
      </div>
      <div
        v-if="query.isPending.value"
        class="grid place-items-center py-12"
      >
        <LoaderCircle class="size-7 animate-spin text-[var(--bookora-green)]" />
      </div>
      <div
        v-else-if="query.isError.value"
        class="grid place-items-center py-10 text-center"
      >
        <div>
          <p class="font-medium">Không thể tải đánh giá.</p>
          <Button type="button" class="mt-3" @click="query.refetch()">
            Thử lại
          </Button>
        </div>
      </div>
      <div
        v-else-if="!query.data.value?.items.length"
        class="grid place-items-center py-10 text-center"
      >
        <div>
          <MessageSquareText
            class="mx-auto size-11 text-[var(--bookora-green)]/55"
          />
          <p class="mt-3 font-semibold">Chưa có đánh giá phù hợp</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Hãy thử chọn một bộ lọc khác để xem thêm đánh giá.
          </p>
        </div>
      </div>
      <template v-else>
        <article
          v-for="item in query.data.value?.items"
          :key="item.id"
          class="grid min-w-0 gap-4 border-b py-6 last:border-0 md:grid-cols-[16rem_minmax(0,1fr)]"
        >
          <div class="flex min-w-0 items-center gap-3 md:items-start">
            <Avatar class="size-12 shrink-0">
              <AvatarImage
                v-if="item.reviewer.avatarUrl"
                :src="item.reviewer.avatarUrl"
                :alt="item.reviewer.displayName"
              />
              <AvatarFallback
                class="bg-[var(--bookora-green)] text-sm font-semibold text-white"
              >
                {{ reviewerInitials(item.reviewer.displayName) }}
              </AvatarFallback>
            </Avatar>
            <strong class="min-w-0 break-words">{{
              item.reviewer.displayName
            }}</strong>
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div
                class="flex text-amber-400"
                :aria-label="`${item.rating} trên 5 sao`"
              >
                <Star
                  v-for="value in 5"
                  :key="value"
                  :class="[
                    'size-5',
                    value <= item.rating
                      ? 'fill-current'
                      : 'fill-muted text-muted',
                  ]"
                />
              </div>
              <span
                v-if="item.verifiedPurchase"
                class="inline-flex items-center gap-1 text-sm font-medium text-[var(--bookora-green)]"
              >
                <CheckCircle2 class="size-4" /> Đã mua hàng
              </span>
            </div>
            <p
              :class="!expanded.has(item.id) && 'line-clamp-4'"
              class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]"
            >
              {{ item.content?.trim() || "Không có nội dung đánh giá." }}
            </p>
            <Button
              v-if="(item.content?.length ?? 0) > 260"
              type="button"
              variant="link"
              class="h-auto px-0 py-1 text-sm text-[var(--bookora-green)]"
              @click="toggle(item.id)"
            >
              {{ expanded.has(item.id) ? "Thu gọn" : "Xem thêm" }}
            </Button>
            <time
              :datetime="item.createdAt"
              class="mt-3 flex items-start gap-2 text-xs text-muted-foreground"
            >
              <Clock3 class="mt-0.5 size-4 shrink-0" />
              <span>
                Đánh giá được đăng {{ formatRelativeTime(item.createdAt) }}
              </span>
            </time>
          </div>
        </article>
      </template>
    </div>

    <nav
      v-if="(query.data.value?.totalPages ?? 0) > 1"
      class="flex items-center justify-center gap-2"
      aria-label="Phân trang đánh giá"
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Trang đánh giá trước"
        :disabled="page <= 1 || query.isFetching.value"
        @click="changePage(page - 1)"
      >
        <ChevronLeft class="size-4" />
      </Button>
      <span class="px-3 text-sm">
        {{ page }} / {{ query.data.value?.totalPages }}
      </span>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Trang đánh giá sau"
        :disabled="
          page >= (query.data.value?.totalPages ?? 1) || query.isFetching.value
        "
        @click="changePage(page + 1)"
      >
        <ChevronRight class="size-4" />
      </Button>
    </nav>
  </div>
</template>
