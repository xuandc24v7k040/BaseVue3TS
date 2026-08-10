<script setup lang="ts">
import { Clock3, Flame, Search, Sparkles, Star, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import type { PublicSearchSuggestionItemDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatSuggestionMetadata,
  highlightSearchText,
} from "@/features/storefront/components/search-suggestion-display";

const props = defineProps<{
  query: string;
  suggestions: PublicSearchSuggestionItemDto[];
  total: number;
  history: string[];
  searchSuggestions: string[];
  activeIndex: number;
  isLoading: boolean;
  isError: boolean;
  mobile?: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
  submit: [query: string];
  removeHistory: [query: string];
  clearHistory: [];
  retry: [];
}>();

const visibleSuggestions = computed(() =>
  props.suggestions.slice(0, props.mobile ? 4 : 5),
);
const visibleSearchSuggestions = computed(() =>
  props.searchSuggestions.slice(0, 5),
);
const priceFormatter = new Intl.NumberFormat("vi-VN");
const hoveredIndex = ref(-1);

function formatPrice(value: number): string {
  return `${priceFormatter.format(value)}đ`;
}

function clearHoveredIndex(index?: number): void {
  if (index === undefined || hoveredIndex.value === index)
    hoveredIndex.value = -1;
}
</script>

<template>
  <section
    class="absolute top-[calc(100%+0.35rem)] z-[70] flex max-h-[min(72dvh,calc(100dvh-7rem))] min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--bookora-border)] bg-background text-left shadow-xl"
    :class="
      mobile
        ? 'left-0 w-full'
        : 'right-0 w-[min(640px,calc(100vw-2rem))] xl:left-0 xl:right-auto xl:w-[min(800px,calc(100vw-2rem))]'
    "
    aria-label="Gợi ý tìm kiếm"
    @mousedown.prevent
    @mouseleave="clearHoveredIndex()"
  >
    <div
      class="h-[min(58dvh,calc(100dvh-10rem),34rem)] min-h-0 shrink-0 overflow-hidden"
      data-search-scroll-body
    >
      <ScrollArea type="auto" class="h-full">
        <div
          class="grid min-h-0"
          :class="
            mobile
              ? 'grid-cols-1'
              : 'md:grid-cols-[minmax(0,1.65fr)_minmax(230px,0.85fr)]'
          "
        >
          <div class="min-w-0 p-4 sm:p-5">
            <h2 class="mb-3 text-sm font-bold">Gợi ý phù hợp</h2>

            <div v-if="isLoading" class="space-y-2" aria-live="polite">
              <div
                v-for="index in mobile ? 3 : 5"
                :key="index"
                class="grid grid-cols-[52px_minmax(0,1fr)] gap-3 rounded-lg p-2"
              >
                <Skeleton class="h-16 w-12 rounded-md" />
                <div class="space-y-2 py-1">
                  <Skeleton class="h-4 w-4/5" />
                  <Skeleton class="h-3 w-3/5" />
                  <Skeleton class="h-4 w-20" />
                </div>
              </div>
              <span class="sr-only">Đang tìm kiếm...</span>
            </div>

            <div
              v-else-if="isError"
              class="rounded-lg border border-dashed p-5 text-center"
            >
              <p class="text-sm">Không thể tải gợi ý tìm kiếm.</p>
              <Button
                type="button"
                variant="link"
                class="mt-1"
                @click="emit('retry')"
              >
                Thử lại
              </Button>
            </div>

            <div
              v-else-if="query.length < 2"
              class="grid min-h-36 place-items-center rounded-lg bg-[var(--bookora-cream)] p-5 text-center"
            >
              <div>
                <Search class="mx-auto size-7 text-[var(--bookora-green)]/55" />
                <p class="mt-2 text-sm font-medium">
                  Nhập ít nhất 2 ký tự để tìm sách.
                </p>
              </div>
            </div>

            <div
              v-else-if="!visibleSuggestions.length"
              class="rounded-lg border border-dashed p-6 text-center"
            >
              <p class="font-semibold">Không tìm thấy sản phẩm phù hợp.</p>
              <p class="mt-1 text-sm text-[var(--bookora-muted)]">
                Thử từ khóa ngắn hơn hoặc kiểm tra lại chính tả.
              </p>
            </div>

            <div
              v-else
              role="listbox"
              aria-label="Sản phẩm gợi ý"
              class="overflow-hidden rounded-lg border border-[var(--bookora-border)]/70"
            >
              <RouterLink
                v-for="(product, index) in visibleSuggestions"
                :id="`search-suggestion-${index}`"
                :key="product.id"
                :to="`/san-pham/${product.slug}`"
                role="option"
                :aria-selected="activeIndex === index"
                :data-hovered="hoveredIndex === index || undefined"
                :data-keyboard-active="activeIndex === index || undefined"
                class="group grid w-full min-w-0 cursor-pointer grid-cols-[52px_minmax(0,1fr)] gap-3 border-b border-[var(--bookora-border)]/60 px-2 py-2 text-left transition-colors duration-150 last:border-b-0 hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--bookora-green)]"
                :class="[
                  hoveredIndex === index ? 'bg-[var(--bookora-soft)]' : '',
                  activeIndex === index && hoveredIndex !== index
                    ? 'bg-[var(--bookora-cream)] ring-1 ring-inset ring-[var(--bookora-green)]/35'
                    : '',
                ]"
                @mouseenter="hoveredIndex = index"
                @mouseleave="clearHoveredIndex(index)"
                @click="emit('dismiss')"
              >
                <img
                  :src="product.primaryImage.url"
                  :alt="
                    product.primaryImage.altText || `Bìa sách ${product.name}`
                  "
                  class="h-16 w-12 rounded object-contain"
                  width="48"
                  height="64"
                />
                <span class="min-w-0 self-center">
                  <span class="flex min-w-0 items-start gap-2">
                    <span
                      class="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-5 transition-colors duration-150 group-hover:text-[var(--bookora-green)]"
                    >
                      <template
                        v-for="(segment, segmentIndex) in highlightSearchText(
                          product.name,
                          query,
                        )"
                        :key="`${segmentIndex}-${segment.text}`"
                      >
                        <mark
                          v-if="segment.matched"
                          class="rounded-[3px] bg-amber-100 px-0.5 text-inherit"
                          >{{ segment.text }}</mark
                        ><template v-else>{{ segment.text }}</template>
                      </template>
                    </span>
                    <span
                      v-if="product.isBestMatch"
                      data-search-badge="best-match"
                      class="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md bg-emerald-100 px-2 text-[11px] font-semibold text-emerald-800"
                    >
                      <Star class="size-3 fill-current" /> Đúng nhất
                    </span>
                    <span
                      v-else-if="product.isBestSeller"
                      data-search-badge="best-seller"
                      class="inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md bg-amber-100 px-2 text-[11px] font-semibold text-amber-800"
                    >
                      <Flame class="size-3 fill-current" /> Bán chạy
                    </span>
                  </span>
                  <span
                    data-search-metadata
                    class="mt-0.5 block truncate text-xs text-[var(--bookora-muted)]"
                  >
                    {{ formatSuggestionMetadata(product) }}
                  </span>
                  <strong
                    class="mt-1 block text-sm text-[var(--bookora-green)]"
                  >
                    {{ formatPrice(product.price.current) }}
                  </strong>
                </span>
              </RouterLink>
            </div>
          </div>

          <aside
            class="min-w-0 border-t border-[var(--bookora-border)] p-4 sm:p-5 md:border-l md:border-t-0"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="flex items-center gap-2 text-sm font-bold">
                <Clock3 class="size-4 text-[var(--bookora-muted)]" /> Tìm kiếm
                gần đây
              </h2>
              <button
                v-if="history.length"
                type="button"
                class="cursor-pointer text-xs text-[var(--bookora-green)] hover:underline"
                @click="emit('clearHistory')"
              >
                Xóa tất cả
              </button>
            </div>
            <ul v-if="history.length" class="mt-2 space-y-0.5">
              <li
                v-for="item in history.slice(0, 6)"
                :key="item"
                class="group flex min-w-0 items-center gap-1 rounded-md hover:bg-[var(--bookora-cream)]"
              >
                <button
                  type="button"
                  class="min-h-9 min-w-0 flex-1 cursor-pointer truncate px-2 text-left text-sm"
                  @click="emit('submit', item)"
                >
                  {{ item }}
                </button>
                <button
                  type="button"
                  :aria-label="`Xóa ${item} khỏi lịch sử tìm kiếm`"
                  class="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-[var(--bookora-muted)] hover:text-red-600"
                  @click="emit('removeHistory', item)"
                >
                  <X class="size-3.5" />
                </button>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-[var(--bookora-muted)]">
              Chưa có tìm kiếm gần đây.
            </p>

            <h2
              v-if="visibleSearchSuggestions.length"
              class="mt-5 flex items-center gap-2 text-sm font-bold"
            >
              <Sparkles class="size-4 text-[var(--bookora-green)]" /> Gợi ý tìm
              kiếm
            </h2>
            <div
              v-if="visibleSearchSuggestions.length"
              class="mt-3 flex flex-wrap gap-2"
            >
              <button
                v-for="keyword in visibleSearchSuggestions"
                :key="keyword"
                type="button"
                class="min-h-9 cursor-pointer rounded-lg border border-[var(--bookora-border)] bg-[var(--bookora-cream)] px-3 text-xs transition-colors hover:border-[var(--bookora-green)]/35 hover:text-[var(--bookora-green)]"
                @click="emit('submit', keyword)"
              >
                {{ keyword }}
              </button>
            </div>
          </aside>
        </div>
      </ScrollArea>
    </div>

    <button
      v-if="query"
      type="button"
      class="min-h-12 shrink-0 cursor-pointer border-t border-[var(--bookora-border)] bg-[var(--bookora-cream)] px-4 py-2 text-center text-sm font-semibold text-[var(--bookora-green)] transition-colors hover:bg-[var(--bookora-soft)]"
      @click="emit('submit', query)"
    >
      Xem tất cả {{ total > suggestions.length ? `${total} ` : "" }}kết quả cho
      “{{ query }}” →
    </button>
  </section>
</template>
