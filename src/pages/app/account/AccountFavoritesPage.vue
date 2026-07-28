<script setup lang="ts">
import { computed, ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  LoaderCircle,
  Star,
} from "@lucide/vue";
import { RouterLink } from "vue-router";
import { toast } from "vue-sonner";
import type { WishlistListDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  engagementKeys,
  listWishlist,
  setWishlist,
} from "@/features/engagement/api/engagement-api";
import { setLocalWishlistStatus } from "@/features/engagement/composables/use-wishlist-status";
import { publishEngagementChange } from "@/features/engagement/state/engagement-sync";
import { formatDateTime } from "@/lib/date-format";

const page = ref(1);
const params = computed(() => ({ page: page.value, limit: 4 }));
const queryClient = useQueryClient();
const query = useQuery({
  queryKey: computed(() => engagementKeys.wishlistList(params.value)),
  queryFn: ({ signal }) => listWishlist(params.value, signal),
  placeholderData: (previous) => previous,
});
const removeMutation = useMutation({
  mutationFn: (productId: string) => setWishlist(productId, false),
  onMutate: async (productId) => {
    await queryClient.cancelQueries({ queryKey: engagementKeys.wishlist });
    const snapshots = queryClient.getQueriesData<WishlistListDto>({
      queryKey: engagementKeys.wishlist,
    });
    for (const [key, data] of snapshots) {
      if (!data) continue;
      const items = data.items.filter((item) => item.product.id !== productId);
      queryClient.setQueryData<WishlistListDto>(key, {
        ...data,
        items,
        totalItems: Math.max(
          0,
          data.totalItems - (items.length < data.items.length ? 1 : 0),
        ),
      });
    }
    setLocalWishlistStatus(productId, false);
    return { snapshots };
  },
  onSuccess: () => {
    if (!query.data.value?.items.length && page.value > 1) page.value -= 1;
    void queryClient.invalidateQueries({ queryKey: engagementKeys.dashboard });
    publishEngagementChange();
    toast.success("Đã xóa sách khỏi danh sách yêu thích.");
  },
  onError: (_error, productId, context) => {
    for (const [key, data] of context?.snapshots ?? []) {
      queryClient.setQueryData(key, data);
    }
    setLocalWishlistStatus(productId, true);
    toast.error("Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.");
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: engagementKeys.wishlist });
  },
});
const money = new Intl.NumberFormat("vi-VN");
</script>

<template>
  <section class="min-w-0 space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Sách yêu thích</h1>
        <p class="mt-1 text-muted-foreground">
          Những cuốn sách bạn đã lưu để xem lại sau.
        </p>
        <p
          v-if="query.data.value"
          class="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium text-[var(--bookora-green)]"
        >
          <Heart class="size-4" />
          {{ query.data.value.totalItems }} sách yêu thích
        </p>
      </div>
      <Button as-child variant="outline">
        <RouterLink to="/books">
          <BookOpen class="size-4" /> Tiếp tục mua sắm
        </RouterLink>
      </Button>
    </header>

    <div v-if="query.isPending.value" class="grid min-h-64 place-items-center">
      <LoaderCircle class="size-7 animate-spin text-[var(--bookora-green)]" />
    </div>
    <Card v-else-if="query.isError.value" class="p-8 text-center">
      <p>Không thể tải sách yêu thích.</p>
      <Button type="button" class="mt-3" @click="query.refetch()">
        Thử lại
      </Button>
    </Card>
    <Card
      v-else-if="!query.data.value?.items.length"
      class="grid min-h-64 place-items-center p-8 text-center"
    >
      <div>
        <Heart class="mx-auto size-10 text-muted-foreground" />
        <h2 class="mt-3 font-semibold">Danh sách đang trống</h2>
        <p class="text-sm text-muted-foreground">
          Hãy lưu sách bạn quan tâm để xem lại nhanh hơn.
        </p>
        <Button as-child class="mt-4">
          <RouterLink to="/books">Khám phá sách</RouterLink>
        </Button>
      </div>
    </Card>
    <Card v-else class="min-w-0 overflow-hidden gap-0 py-0 shadow-none">
      <article
        v-for="item in query.data.value.items"
        :key="item.id"
        class="grid min-w-0 gap-4 border-b p-4 last:border-0 sm:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[5rem_minmax(0,1.4fr)_minmax(9rem,0.7fr)_minmax(8rem,0.6fr)_auto] lg:items-center"
      >
        <RouterLink
          :to="`/books/${item.product.slug}`"
          class="w-20 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
        >
          <img
            v-if="item.product.imageUrl"
            :src="item.product.imageUrl"
            :alt="`Bìa ${item.product.name}`"
            class="h-28 w-20 rounded border object-cover"
          />
          <span
            v-else
            class="grid h-28 w-20 place-items-center rounded border bg-muted"
          >
            <BookOpen class="size-7 text-muted-foreground" />
          </span>
        </RouterLink>

        <div class="min-w-0">
          <RouterLink
            :to="`/books/${item.product.slug}`"
            class="line-clamp-2 min-h-10 break-words font-semibold leading-5 [overflow-wrap:anywhere] hover:text-[var(--bookora-green)]"
          >
            {{ item.product.name }}
          </RouterLink>
          <p class="mt-1 truncate text-sm text-muted-foreground">
            {{ item.product.authors.join(", ") || "Đang cập nhật tác giả" }}
          </p>
          <p class="mt-2 flex items-center gap-1 text-sm text-amber-600">
            <Star class="size-4 fill-current" />
            {{ item.product.averageRating?.toFixed(1) ?? "Chưa có" }}
            <span class="text-muted-foreground">
              ({{ item.product.reviewCount }})
            </span>
          </p>
        </div>

        <div class="min-w-0">
          <strong class="whitespace-nowrap text-lg text-red-600">
            {{
              item.product.price.current
                ? `${money.format(item.product.price.current)}đ`
                : "Liên hệ"
            }}
          </strong>
          <div
            v-if="item.product.price.onSale"
            class="mt-1 flex flex-wrap items-center gap-2"
          >
            <del class="text-sm text-muted-foreground">
              {{ money.format(item.product.price.original ?? 0) }}đ
            </del>
            <span
              class="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600"
            >
              -{{ item.product.price.discountPercent }}%
            </span>
          </div>
        </div>

        <time
          :datetime="item.createdAt"
          class="break-words text-sm text-muted-foreground"
        >
          Đã thêm<br />
          {{ formatDateTime(item.createdAt) }}
        </time>

        <div
          class="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-1"
        >
          <Button as-child size="sm" variant="outline">
            <RouterLink :to="`/books/${item.product.slug}`">
              Xem chi tiết
            </RouterLink>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            class="shrink-0 text-[var(--bookora-green)] hover:bg-[var(--bookora-soft)] hover:text-[var(--bookora-green-hover)]"
            aria-label="Bỏ khỏi sách yêu thích"
            :disabled="
              removeMutation.isPending.value &&
              removeMutation.variables.value === item.product.id
            "
            @click="removeMutation.mutate(item.product.id)"
          >
            <LoaderCircle
              v-if="
                removeMutation.isPending.value &&
                removeMutation.variables.value === item.product.id
              "
              class="size-5 animate-spin"
            />
            <Heart v-else class="size-5 fill-current" />
          </Button>
        </div>
      </article>
    </Card>

    <nav
      v-if="(query.data.value?.totalPages ?? 0) > 1"
      class="flex items-center justify-center gap-2"
      aria-label="Phân trang sách yêu thích"
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Trang yêu thích trước"
        :disabled="page <= 1 || query.isFetching.value"
        @click="page--"
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
        aria-label="Trang yêu thích sau"
        :disabled="
          page >= (query.data.value?.totalPages ?? 1) || query.isFetching.value
        "
        @click="page++"
      >
        <ChevronRight class="size-4" />
      </Button>
    </nav>
  </section>
</template>
