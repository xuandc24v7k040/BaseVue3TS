<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useRoute, useRouter } from "vue-router";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Pencil,
  Star,
  Trash2,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  CustomerReviewDto,
  PendingReviewOpportunityDto,
} from "@/api/generated/models";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReviewFormDialog from "@/features/engagement/components/ReviewFormDialog.vue";
import {
  deleteReview,
  engagementKeys,
  listMyReviews,
  listPendingReviews,
} from "@/features/engagement/api/engagement-api";
import { publishEngagementChange } from "@/features/engagement/state/engagement-sync";
import { customerOrderKeys } from "@/features/orders/api/customer-orders-api";
import { formatDateTime } from "@/lib/date-format";

type ReviewTab = "pending" | "written";

const route = useRoute();
const router = useRouter();
const activeTab = computed<ReviewTab>({
  get: () => (firstQueryValue(route.query.tab) === "written" ? "written" : "pending"),
  set: (tab) => {
    if (tab === activeTab.value) return;
    void router.push({ query: { ...route.query, tab } });
  },
});
const orderId = computed(() => firstQueryValue(route.query.orderId) || undefined);
const page = ref(1);
const pendingPage = ref(1);
const dialogOpen = ref(false);
const deleteOpen = ref(false);
const pendingDeleteId = ref<string | null>(null);
const deleteTrigger = ref<HTMLButtonElement | null>(null);
const selectedReview = ref<CustomerReviewDto | null>(null);
const selectedOpportunity = ref<PendingReviewOpportunityDto | null>(null);
const expanded = ref<Set<string>>(new Set());
const queryClient = useQueryClient();
const mineParams = computed(() => ({
  page: page.value,
  limit: 10,
  ...(orderId.value ? { orderId: orderId.value } : {}),
}));
const pendingParams = computed(() => ({
  page: pendingPage.value,
  limit: 10,
  ...(orderId.value ? { orderId: orderId.value } : {}),
}));
const mine = useQuery({
  queryKey: computed(() => engagementKeys.mine(mineParams.value)),
  queryFn: ({ signal }) => listMyReviews(mineParams.value, signal),
  placeholderData: (previous) => previous,
});
const pending = useQuery({
  queryKey: computed(() => engagementKeys.pending(pendingParams.value)),
  queryFn: ({ signal }) => listPendingReviews(pendingParams.value, signal),
  placeholderData: (previous) => previous,
});
const remove = useMutation({
  mutationFn: deleteReview,
  onSuccess: () => {
    if ((mine.data.value?.items.length ?? 0) <= 1 && page.value > 1) {
      page.value -= 1;
    }
    deleteOpen.value = false;
    pendingDeleteId.value = null;
    restoreDeleteTriggerFocus();
    void queryClient.invalidateQueries({ queryKey: engagementKeys.reviews });
    void queryClient.invalidateQueries({ queryKey: engagementKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.all });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.details });
    publishEngagementChange();
    toast.success("Đã xóa đánh giá.");
  },
  onError: () => toast.error("Không thể xóa đánh giá. Vui lòng thử lại."),
});

watch(orderId, () => {
  page.value = 1;
  pendingPage.value = 1;
  expanded.value = new Set();
});

function firstQueryValue(value: unknown): string {
  return Array.isArray(value)
    ? String(value[0] ?? "").trim()
    : String(value ?? "").trim();
}

function openCreate(item: PendingReviewOpportunityDto): void {
  selectedOpportunity.value = item;
  selectedReview.value = null;
  dialogOpen.value = true;
}

function openEdit(item: CustomerReviewDto): void {
  selectedReview.value = item;
  selectedOpportunity.value = null;
  dialogOpen.value = true;
}

function requestDelete(reviewId: string, event: MouseEvent): void {
  deleteTrigger.value =
    event.currentTarget instanceof HTMLButtonElement
      ? event.currentTarget
      : null;
  pendingDeleteId.value = reviewId;
  deleteOpen.value = true;
}

function confirmDelete(): void {
  if (!pendingDeleteId.value || remove.isPending.value) return;
  remove.mutate(pendingDeleteId.value);
}

function updateDeleteOpen(value: boolean): void {
  if (!value && remove.isPending.value) return;
  deleteOpen.value = value;
  if (!value) {
    pendingDeleteId.value = null;
    restoreDeleteTriggerFocus();
  }
}

function restoreDeleteTriggerFocus(): void {
  const trigger = deleteTrigger.value;
  void nextTick(() => trigger?.focus());
}

function toggleExpanded(reviewId: string): void {
  const next = new Set(expanded.value);
  next.has(reviewId) ? next.delete(reviewId) : next.add(reviewId);
  expanded.value = next;
}

function changePage(kind: ReviewTab, nextPage: number): void {
  if (kind === "pending") pendingPage.value = nextPage;
  else page.value = nextPage;
  expanded.value = new Set();
}

function clearOrderFilter(): void {
  const query = { ...route.query };
  delete query.orderId;
  void router.push({ query });
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <header>
      <h1 class="text-2xl font-bold">Đánh giá của tôi</h1>
      <p class="mt-1 text-muted-foreground">
        Quản lý các đánh giá sản phẩm bạn đã thực hiện và các sản phẩm có thể
        đánh giá.
      </p>
    </header>

    <div
      v-if="orderId"
      class="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm"
    >
      <p class="min-w-0 break-words">
        Đang xem đánh giá của đơn hàng đã chọn.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="shrink-0"
        @click="clearOrderFilter"
      >
        Xem tất cả
      </Button>
    </div>

    <Tabs v-model="activeTab">
      <ScrollArea
        type="auto"
        scrollbar-orientation="horizontal"
        class="w-full min-w-0 max-w-full border-b"
      >
        <TabsList class="h-auto w-max rounded-none bg-transparent p-0">
          <TabsTrigger
            value="pending"
            class="flex-none rounded-none border-b-2 border-transparent bg-transparent px-5 py-3 shadow-none data-[state=active]:border-[var(--bookora-green)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bookora-green)] data-[state=active]:shadow-none"
          >
            Chờ đánh giá ({{ pending.data.value?.totalItems ?? 0 }})
          </TabsTrigger>
          <TabsTrigger
            value="written"
            class="flex-none rounded-none border-b-2 border-transparent bg-transparent px-5 py-3 shadow-none data-[state=active]:border-[var(--bookora-green)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bookora-green)] data-[state=active]:shadow-none"
          >
            Đã đánh giá ({{ mine.data.value?.totalItems ?? 0 }})
          </TabsTrigger>
        </TabsList>
      </ScrollArea>

      <TabsContent value="pending" class="mt-5">
        <div
          v-if="pending.isPending.value"
          class="grid min-h-48 place-items-center"
        >
          <LoaderCircle class="size-7 animate-spin" />
        </div>
        <Card
          v-else-if="!pending.data.value?.items.length"
          class="grid min-h-48 place-items-center p-8 text-center text-muted-foreground"
        >
          {{
            orderId
              ? "Đơn hàng này không còn sản phẩm chờ đánh giá."
              : "Bạn không có sản phẩm nào đang chờ đánh giá."
          }}
        </Card>
        <Card v-else class="min-w-0 gap-0 overflow-hidden py-0 shadow-none">
          <article
            v-for="item in pending.data.value.items"
            :key="`${item.orderId}-${item.product.id}`"
            class="grid min-w-0 gap-4 border-b p-4 last:border-0 sm:grid-cols-[4.5rem_minmax(0,1fr)] lg:grid-cols-[4.5rem_minmax(0,1.2fr)_minmax(12rem,0.9fr)_12rem] lg:items-center"
          >
            <img
              v-if="item.product.imageUrl"
              :src="item.product.imageUrl"
              :alt="item.product.name"
              class="h-24 w-16 rounded border object-cover"
            />
            <span
              v-else
              class="grid h-24 w-16 place-items-center rounded border bg-muted"
            >
              <BookOpen class="size-6 text-muted-foreground" />
            </span>
            <div class="min-w-0">
              <p
                class="line-clamp-2 break-words font-semibold [overflow-wrap:anywhere]"
              >
                {{ item.product.name }}
              </p>
            </div>
            <div class="min-w-0 border-l-0 text-sm lg:border-l lg:pl-6">
              <p class="font-medium">Đơn hàng</p>
              <p
                class="mt-1 break-words text-[var(--bookora-green)] [overflow-wrap:anywhere]"
              >
                {{ item.orderCode }}
              </p>
              <time
                :datetime="item.completedAt"
                class="mt-1 block text-muted-foreground"
              >
                Hoàn thành: {{ formatDateTime(item.completedAt) }}
              </time>
            </div>
            <div class="text-left lg:text-center">
              <Button type="button" @click="openCreate(item)">
                <Star class="size-4" /> Đánh giá ngay
              </Button>
              <p class="mt-2 text-xs text-muted-foreground">
                Chia sẻ trải nghiệm của bạn
              </p>
            </div>
          </article>
        </Card>
        <nav
          v-if="(pending.data.value?.totalPages ?? 0) > 1"
          class="mt-5 flex items-center justify-center gap-2"
          aria-label="Phân trang sản phẩm chờ đánh giá"
        >
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Trang chờ đánh giá trước"
            :disabled="pendingPage <= 1 || pending.isFetching.value"
            @click="changePage('pending', pendingPage - 1)"
          >
            <ChevronLeft class="size-4" />
          </Button>
          <span class="px-3 text-sm">
            {{ pendingPage }} / {{ pending.data.value?.totalPages }}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Trang chờ đánh giá sau"
            :disabled="
              pendingPage >= (pending.data.value?.totalPages ?? 1) ||
              pending.isFetching.value
            "
            @click="changePage('pending', pendingPage + 1)"
          >
            <ChevronRight class="size-4" />
          </Button>
        </nav>
      </TabsContent>

      <TabsContent value="written" class="mt-5">
        <div
          v-if="mine.isPending.value"
          class="grid min-h-48 place-items-center"
        >
          <LoaderCircle class="size-7 animate-spin" />
        </div>
        <Card
          v-else-if="!mine.data.value?.items.length"
          class="grid min-h-48 place-items-center p-8 text-center text-muted-foreground"
        >
          {{
            orderId
              ? "Bạn chưa viết đánh giá nào cho đơn hàng này."
              : "Bạn chưa viết đánh giá nào."
          }}
        </Card>
        <Card v-else class="min-w-0 gap-0 overflow-hidden py-0 shadow-none">
          <article
            v-for="item in mine.data.value.items"
            :key="item.id"
            class="grid min-w-0 gap-4 border-b p-4 last:border-0 sm:grid-cols-[4.5rem_minmax(0,1fr)] xl:grid-cols-[4.5rem_minmax(12rem,0.9fr)_minmax(15rem,1.3fr)_auto] xl:items-center"
          >
            <img
              v-if="item.product.imageUrl"
              :src="item.product.imageUrl"
              :alt="item.product.name"
              class="h-24 w-16 rounded border object-cover"
            />
            <span
              v-else
              class="grid h-24 w-16 place-items-center rounded border bg-muted"
            >
              <BookOpen class="size-6 text-muted-foreground" />
            </span>

            <div class="min-w-0">
              <p
                class="line-clamp-2 break-words font-semibold [overflow-wrap:anywhere]"
              >
                {{ item.product.name }}
              </p>
              <p
                class="mt-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]"
              >
                Mã: {{ item.orderCode }}
              </p>
            </div>

            <div
              class="min-w-0 sm:col-start-2 xl:col-start-auto xl:border-l xl:pl-5"
            >
              <div
                class="flex text-amber-400"
                :aria-label="`${item.rating} trên 5 sao`"
              >
                <Star
                  v-for="value in 5"
                  :key="value"
                  :class="[
                    'size-4',
                    value <= item.rating
                      ? 'fill-current'
                      : 'fill-muted text-muted',
                  ]"
                />
              </div>
              <time
                :datetime="item.createdAt"
                class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
              >
                <Clock3 class="size-3.5" />
                {{ formatDateTime(item.createdAt) }}
              </time>
              <p
                :class="!expanded.has(item.id) && 'line-clamp-2'"
                class="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]"
              >
                {{ item.content?.trim() || "Không có nội dung đánh giá." }}
              </p>
              <Button
                v-if="(item.content?.length ?? 0) > 140"
                type="button"
                variant="link"
                class="h-auto px-0 py-1 text-xs"
                @click="toggleExpanded(item.id)"
              >
                {{ expanded.has(item.id) ? "Thu gọn" : "Xem thêm" }}
              </Button>
            </div>

            <div
              class="flex items-center justify-end gap-2 sm:col-span-2 xl:col-span-1"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                @click="openEdit(item)"
              >
                <Pencil class="size-4" /> Sửa
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                class="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                @click="requestDelete(item.id, $event)"
              >
                <Trash2 class="size-4" /> Xóa
              </Button>
            </div>
          </article>
        </Card>

        <nav
          v-if="(mine.data.value?.totalPages ?? 0) > 1"
          class="mt-5 flex items-center justify-center gap-2"
          aria-label="Phân trang đánh giá đã viết"
        >
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Trang đánh giá đã viết trước"
            :disabled="page <= 1 || mine.isFetching.value"
            @click="changePage('written', page - 1)"
          >
            <ChevronLeft class="size-4" />
          </Button>
          <span class="px-3 text-sm">
            {{ page }} / {{ mine.data.value?.totalPages }}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Trang đánh giá đã viết sau"
            :disabled="
              page >= (mine.data.value?.totalPages ?? 1) ||
              mine.isFetching.value
            "
            @click="changePage('written', page + 1)"
          >
            <ChevronRight class="size-4" />
          </Button>
        </nav>
      </TabsContent>
    </Tabs>

    <ReviewFormDialog
      v-model:open="dialogOpen"
      :review="selectedReview"
      :opportunity="selectedOpportunity"
    />

    <AlertDialog :open="deleteOpen" @update:open="updateDeleteOpen">
      <AlertDialogContent class="z-[51]">
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa đánh giá này?</AlertDialogTitle>
          <AlertDialogDescription>
            Đánh giá sẽ bị xóa khỏi tài khoản và trang sản phẩm. Bạn có thể đánh
            giá lại sản phẩm từ đơn hàng đủ điều kiện sau đó.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button" :disabled="remove.isPending.value">
            Hủy
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            :disabled="remove.isPending.value"
            class="bg-red-600 text-white hover:bg-red-700"
            @click="confirmDelete"
          >
            <LoaderCircle
              v-if="remove.isPending.value"
              class="size-4 animate-spin"
            />
            {{ remove.isPending.value ? "Đang xóa..." : "Xóa đánh giá" }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
