<script setup lang="ts">
import { ChevronLeft, ChevronRight, X } from "@lucide/vue";
import { useResizeObserver } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorefrontProductSummariesQuery } from "@/features/storefront/api/storefront-api";
import { useRecentlyViewed } from "@/features/storefront/composables/use-recently-viewed";

const props = defineProps<{
  excludeProductId?: string;
  subtitle?: string;
}>();

const history = useRecentlyViewed();
const allIds = computed(() =>
  history.entries.value.map((entry) => entry.productId),
);
const renderIds = computed(() =>
  allIds.value.filter((id) => id !== props.excludeProductId),
);
const summariesQuery = useStorefrontProductSummariesQuery(allIds);
const products = computed(() => {
  const allowed = new Set(
    history.entries.value
      .map((entry) => entry.productId)
      .filter((id) => id !== props.excludeProductId),
  );
  return (summariesQuery.data.value ?? []).filter((product) =>
    allowed.has(product.id),
  );
});
const scroller = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
let errorToastShown = false;

function updateScrollControls(): void {
  const element = scroller.value;
  if (!element) return;
  canScrollLeft.value = element.scrollLeft > 4;
  canScrollRight.value =
    element.scrollLeft + element.clientWidth < element.scrollWidth - 4;
}

function scroll(direction: -1 | 1): void {
  const element = scroller.value;
  if (!element) return;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  element.scrollBy({
    left: direction * Math.max(260, element.clientWidth * 0.82),
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

function remove(productId: string): void {
  if (!history.remove(productId)) {
    toast.error("Không thể cập nhật lịch sử sản phẩm đã xem.");
  }
}

function clearHistory(): void {
  if (!history.clear()) {
    toast.error("Không thể cập nhật lịch sử sản phẩm đã xem.");
    return;
  }
  toast.success("Đã xóa lịch sử sản phẩm đã xem.");
}

watch(
  () => summariesQuery.isSuccess.value,
  (isSuccess) => {
    if (!isSuccess) return;
    const validIds = (summariesQuery.data.value ?? []).map(
      (product) => product.id,
    );
    if (!history.reconcile(validIds)) {
      toast.error("Không thể cập nhật lịch sử sản phẩm đã xem.");
    }
  },
);

watch(
  () => summariesQuery.isError.value,
  (isError) => {
    if (!isError || errorToastShown) return;
    errorToastShown = true;
    toast.error("Không thể tải sản phẩm đã xem. Vui lòng thử lại.");
  },
);

watch(products, async () => {
  await nextTick();
  updateScrollControls();
});
onMounted(updateScrollControls);
useResizeObserver(scroller, updateScrollControls);
</script>

<template>
  <Transition name="recent-section">
    <section
      v-if="renderIds.length"
      class="min-w-0 overflow-hidden rounded-xl border border-[var(--bookora-border)] bg-background p-3 sm:p-4"
      aria-labelledby="recently-viewed-title"
    >
      <div class="mb-2.5 flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 id="recently-viewed-title" class="text-lg font-bold">
            Sản phẩm đã xem
          </h2>
          <p v-if="subtitle" class="mt-0.5 text-sm text-[var(--bookora-muted)]">
            {{ subtitle }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 cursor-pointer px-2 py-1 text-sm text-[var(--bookora-green)] underline-offset-4 transition-colors duration-150 hover:text-[var(--bookora-green-hover)] hover:underline"
          @click="clearHistory"
        >
          Xóa lịch sử
        </button>
      </div>

      <div
        v-if="summariesQuery.isPending.value && !summariesQuery.data.value"
        class="flex gap-3 overflow-hidden px-10"
      >
        <Skeleton
          v-for="index in 4"
          :key="index"
          class="h-28 w-[min(82vw,300px)] shrink-0 rounded-lg sm:w-[300px] lg:w-[calc((100%_-_3rem)/4)] lg:min-w-[260px]"
        />
      </div>

      <div
        v-else-if="summariesQuery.isError.value"
        class="rounded-lg border border-dashed p-6 text-center"
      >
        <p class="text-sm">Không thể tải sản phẩm đã xem.</p>
        <Button type="button" variant="link" @click="summariesQuery.refetch()">
          Thử lại
        </Button>
      </div>

      <div v-else-if="products.length" class="relative min-w-0">
        <Button
          v-if="canScrollLeft"
          type="button"
          size="icon"
          variant="outline"
          aria-label="Xem sản phẩm trước"
          class="absolute left-0 top-1/2 z-10 size-9 -translate-y-1/2 cursor-pointer rounded-full bg-background shadow-sm transition-colors duration-150 hover:border-[var(--bookora-green)]/45 hover:text-[var(--bookora-green)] disabled:cursor-not-allowed"
          @click="scroll(-1)"
        >
          <ChevronLeft class="size-4" />
        </Button>
        <div
          ref="scroller"
          class="recent-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-10 py-1"
          @scroll.passive="updateScrollControls"
        >
          <TransitionGroup name="recent-card">
            <article
              v-for="product in products"
              :key="product.id"
              class="group relative grid h-28 w-[min(82vw,300px)] shrink-0 snap-start grid-cols-[68px_minmax(0,1fr)] gap-2.5 rounded-lg border border-[var(--bookora-border)] bg-background p-2.5 pr-9 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:border-[var(--bookora-green)]/60 hover:shadow-sm sm:w-[300px] lg:w-[calc((100%_-_3rem)/4)] lg:min-w-[260px]"
            >
              <RouterLink
                :to="`/san-pham/${product.slug}`"
                class="flex h-full items-center justify-center overflow-hidden rounded-md bg-[var(--bookora-cream)] p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
              >
                <img
                  :src="product.primaryImage.url"
                  :alt="
                    product.primaryImage.altText || `Bìa sách ${product.name}`
                  "
                  class="h-full w-full object-contain"
                  width="68"
                  height="96"
                  loading="lazy"
                />
              </RouterLink>
              <div class="flex min-w-0 flex-col justify-center">
                <RouterLink
                  :to="`/san-pham/${product.slug}`"
                  class="line-clamp-2 text-sm font-semibold leading-5 group-hover:text-[var(--bookora-green)] focus-visible:outline-none focus-visible:underline"
                >
                  {{ product.name }}
                </RouterLink>
                <p class="mt-1 truncate text-xs text-[var(--bookora-muted)]">
                  {{
                    product.authors.map((author) => author.name).join(", ") ||
                    product.publisher?.name ||
                    "Đang cập nhật"
                  }}
                </p>
                <strong
                  class="mt-2 whitespace-nowrap text-sm text-[var(--bookora-green)]"
                >
                  {{
                    new Intl.NumberFormat("vi-VN").format(
                      product.price.current,
                    )
                  }}đ
                </strong>
              </div>
              <button
                type="button"
                :aria-label="`Xóa ${product.name} khỏi sản phẩm đã xem`"
                class="absolute right-1.5 top-1.5 grid size-8 cursor-pointer place-items-center text-[var(--bookora-muted)] transition-colors duration-150 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]/40"
                @click="remove(product.id)"
              >
                <X class="size-3.5" />
              </button>
            </article>
          </TransitionGroup>
        </div>
        <Button
          v-if="canScrollRight"
          type="button"
          size="icon"
          variant="outline"
          aria-label="Xem sản phẩm tiếp theo"
          class="absolute right-0 top-1/2 z-10 size-9 -translate-y-1/2 cursor-pointer rounded-full bg-background shadow-sm transition-colors duration-150 hover:border-[var(--bookora-green)]/45 hover:text-[var(--bookora-green)] disabled:cursor-not-allowed"
          @click="scroll(1)"
        >
          <ChevronRight class="size-4" />
        </Button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.recent-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.recent-scrollbar::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.recent-section-enter-active,
.recent-section-leave-active,
.recent-card-enter-active,
.recent-card-leave-active {
  transition:
    opacity 170ms ease,
    transform 170ms ease;
}

.recent-section-enter-from,
.recent-section-leave-to,
.recent-card-enter-from,
.recent-card-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .recent-section-enter-active,
  .recent-section-leave-active,
  .recent-card-enter-active,
  .recent-card-leave-active {
    transition: none;
  }
}
</style>
