<script setup lang="ts">
import { Heart, Search, ShoppingCart, UserRound, X } from "@lucide/vue";
import { onClickOutside } from "@vueuse/core";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { LocationQueryRaw } from "vue-router";
import { toast } from "vue-sonner";
import type { PublicProductListItemDto } from "@/api/generated/models";
import BranchSelector from "@/components/client/layout/BranchSelector.vue";
import ClientBrand from "@/components/client/layout/ClientBrand.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasSessionHint } from "@/features/auth/session-hint";
import {
  useStorefrontCategoriesQuery,
  useStorefrontSearchSuggestionsQuery,
} from "@/features/storefront/api/storefront-api";
import CategoryMegaMenu from "@/features/storefront/components/CategoryMegaMenu.vue";
import LiveSearchPanel from "@/features/storefront/components/LiveSearchPanel.vue";
import MobileCategorySheet from "@/features/storefront/components/MobileCategorySheet.vue";
import {
  normalizeSearchText,
  useSearchHistory,
} from "@/features/storefront/composables/use-search-history";
import { useAuthStore } from "@/stores/auth.store";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";
import { useCartQuery } from "@/features/cart/api/cart-api";

interface HeaderLink {
  label: string;
  href: string;
}

const navigationLinks: HeaderLink[] = [
  { label: "Sách mới", href: "/books?sort=newest" },
  { label: "Sách bán chạy", href: "/books?sort=popular" },
  {
    label: "Sách sắp phát hành",
    href: "/books?upcoming=true&sort=release_asc",
  },
  { label: "Tác giả", href: "/books" },
  { label: "Nhà xuất bản", href: "/books" },
  { label: "Khuyến mãi", href: "/books?onSale=true" },
];
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const storefrontBranchStore = useStorefrontBranchStore();
const cartQuery = useCartQuery(
  computed(
    () =>
      authStore.user?.type === "CUSTOMER" &&
      Boolean(storefrontBranchStore.selectedBranchId),
  ),
);
const cartQuantity = computed(() => cartQuery.data.value?.totalQuantity ?? 0);
const categoriesQuery = useStorefrontCategoriesQuery();
const searchSuggestions = computed(() => {
  const categoryNames = (categoriesQuery.data.value ?? []).flatMap(
    (category) => [
      category.name,
      ...category.children.map((child) => child.name),
    ],
  );
  return [...new Set(categoryNames.map((name) => name.trim()).filter(Boolean))].slice(
    0,
    5,
  );
});
const initialRouteQuery = Array.isArray(route.query.q)
  ? route.query.q[0]
  : route.query.q;
const searchQuery = ref(typeof initialRouteQuery === "string" ? initialRouteQuery : "");
const debouncedSearchQuery = ref(normalizeSearchText(searchQuery.value));
const activeSearchTarget = ref<"desktop" | "mobile" | null>(null);
const activeSuggestionIndex = ref(-1);
const desktopSearchRoot = ref<HTMLElement | null>(null);
const mobileSearchRoot = ref<HTMLElement | null>(null);
const searchHistory = useSearchHistory();
const suggestionsQuery = useStorefrontSearchSuggestionsQuery(
  debouncedSearchQuery,
  5,
);
const suggestions = computed(() => suggestionsQuery.data.value?.items ?? []);
const suggestionTotal = computed(() => suggestionsQuery.data.value?.total ?? 0);
const isSuggestionLoading = computed(
  () =>
    debouncedSearchQuery.value.length >= 2 &&
    suggestionsQuery.isFetching.value,
);
const isSuggestionError = computed(
  () =>
    debouncedSearchQuery.value.length >= 2 && suggestionsQuery.isError.value,
);
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let lastSuggestionErrorQuery = "";
const showAccountSkeleton = computed(
  () =>
    hasSessionHint() &&
    authStore.status === "unknown" &&
    !authStore.bootstrapError,
);
const accountTarget = computed(() => {
  if (authStore.user?.type === "CUSTOMER") return "/account";
  if (authStore.user?.type === "SYSTEM") return "/super-admin/dashboard";
  if (authStore.user?.type === "BRANCH") return "/branch-admin/dashboard";
  return "/login";
});
const accountPrimaryLabel = computed(
  () => authStore.user?.fullName || "Đăng nhập",
);
const accountSecondaryLabel = computed(() =>
  authStore.user
    ? authStore.user.type === "CUSTOMER"
      ? "Tài khoản"
      : "Quản trị"
    : "Tài khoản",
);

watch(searchQuery, (value) => {
  activeSuggestionIndex.value = -1;
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchQuery.value = normalizeSearchText(value);
  }, 300);
});

watch(
  () => route.query.q,
  (value) => {
    const next = Array.isArray(value) ? value[0] : value;
    const normalized = typeof next === "string" ? next : "";
    if (normalized === searchQuery.value) return;
    searchQuery.value = normalized;
    debouncedSearchQuery.value = normalizeSearchText(normalized);
  },
);

watch(
  () => suggestionsQuery.isError.value,
  (isError) => {
    const query = debouncedSearchQuery.value;
    if (!isError || !activeSearchTarget.value || lastSuggestionErrorQuery === query)
      return;
    lastSuggestionErrorQuery = query;
    toast.error("Không thể tải gợi ý tìm kiếm. Vui lòng thử lại.");
  },
);

onClickOutside(desktopSearchRoot, () => {
  if (activeSearchTarget.value === "desktop") activeSearchTarget.value = null;
});
onClickOutside(mobileSearchRoot, () => {
  if (activeSearchTarget.value === "mobile") activeSearchTarget.value = null;
});
onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
});

async function submitSearch(value = searchQuery.value): Promise<void> {
  const query = normalizeSearchText(value);
  if (!query) return;

  searchQuery.value = query;
  debouncedSearchQuery.value = query;
  if (!searchHistory.add(query)) {
    toast.error("Không thể cập nhật lịch sử tìm kiếm.");
  }
  const nextQuery: LocationQueryRaw =
    route.path === "/books" ? { ...route.query, q: query } : { q: query };
  delete nextQuery.page;
  delete nextQuery.search;
  activeSearchTarget.value = null;
  activeSuggestionIndex.value = -1;
  await router.push({ path: "/books", query: nextQuery });
}

function focusSearch(target: "desktop" | "mobile"): void {
  activeSearchTarget.value = target;
  activeSuggestionIndex.value = -1;
}

function clearSearchInput(): void {
  searchQuery.value = "";
  debouncedSearchQuery.value = "";
  activeSuggestionIndex.value = -1;
}

function dismissSearchPanel(): void {
  activeSearchTarget.value = null;
  activeSuggestionIndex.value = -1;
}

async function selectSuggestion(product: PublicProductListItemDto): Promise<void> {
  dismissSearchPanel();
  await router.push(`/books/${product.slug}`);
}

function handleSearchKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    activeSearchTarget.value = null;
    activeSuggestionIndex.value = -1;
    return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter")
    return;
  if (event.key === "Enter") {
    const product = suggestions.value[activeSuggestionIndex.value];
    if (!product) return;
    event.preventDefault();
    void selectSuggestion(product);
    return;
  }
  if (!suggestions.value.length) return;
  event.preventDefault();
  const direction = event.key === "ArrowDown" ? 1 : -1;
  activeSuggestionIndex.value =
    (activeSuggestionIndex.value + direction + suggestions.value.length) %
    suggestions.value.length;
}

function removeSearchHistory(value: string): void {
  if (!searchHistory.remove(value)) {
    toast.error("Không thể cập nhật lịch sử tìm kiếm.");
  }
}

function clearSearchHistory(): void {
  if (!searchHistory.clear()) {
    toast.error("Không thể cập nhật lịch sử tìm kiếm.");
  }
}

function openWishlist(): void {
  void router.push("/account/wishlist");
}

async function openCart(): Promise<void> {
  if (authStore.user?.type !== "CUSTOMER") {
    toast.info("Vui lòng đăng nhập để xem giỏ hàng.");
    await router.push({ path: "/login", query: { returnTo: "/cart" } });
    return;
  }
  await router.push("/cart");
}
</script>

<template>
  <header
    class="bookora-client-theme border-b border-[var(--bookora-border)] bg-[var(--bookora-canvas)] text-[var(--bookora-ink)]"
  >
    <div class="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
      <div
        class="hidden min-h-24 grid-cols-[210px_minmax(280px,1fr)_auto] items-center gap-7 lg:grid"
      >
        <ClientBrand />

        <form
          ref="desktopSearchRoot"
          role="search"
          class="relative flex min-w-0"
          @submit.prevent="submitSearch()"
        >
          <label for="desktop-book-search" class="sr-only">Tìm kiếm sách</label>
          <Input
            id="desktop-book-search"
            v-model="searchQuery"
            aria-label="Tìm kiếm sách"
            role="combobox"
            :aria-expanded="activeSearchTarget === 'desktop'"
            aria-controls="desktop-search-suggestions"
            :aria-activedescendant="
              activeSuggestionIndex >= 0
                ? `search-suggestion-${activeSuggestionIndex}`
                : undefined
            "
            placeholder="Bạn đang tìm sách gì?"
            class="h-12 rounded-r-none border-[var(--bookora-border)] bg-background px-5 pr-11 shadow-none focus-visible:z-10 focus-visible:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/20"
            autocomplete="off"
            @focus="focusSearch('desktop')"
            @keydown="handleSearchKeydown"
          />
          <button
            v-if="searchQuery"
            type="button"
            aria-label="Xóa từ khóa tìm kiếm"
            class="absolute right-14 top-1/2 z-20 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-[var(--bookora-muted)] hover:text-[var(--bookora-ink)]"
            @click="clearSearchInput"
          >
            <X class="size-4" />
          </button>
          <Button
            type="submit"
            aria-label="Tìm kiếm"
            class="h-12 w-14 rounded-l-none bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
          >
            <Search aria-hidden="true" class="size-5" />
          </Button>
          <Transition name="search-panel">
            <LiveSearchPanel
              v-if="activeSearchTarget === 'desktop'"
              id="desktop-search-suggestions"
              :query="normalizeSearchText(searchQuery)"
              :suggestions="suggestions"
              :total="suggestionTotal"
              :history="searchHistory.history.value"
              :search-suggestions="searchSuggestions"
              :active-index="activeSuggestionIndex"
              :is-loading="isSuggestionLoading"
              :is-error="isSuggestionError"
              @dismiss="dismissSearchPanel"
              @submit="submitSearch"
              @remove-history="removeSearchHistory"
              @clear-history="clearSearchHistory"
              @retry="suggestionsQuery.refetch()"
            />
          </Transition>
        </form>

        <div class="flex items-center gap-5">
          <div
            v-if="showAccountSkeleton"
            class="flex min-h-11 w-32 items-center gap-2"
            aria-label="Đang kiểm tra tài khoản"
          >
            <Skeleton class="size-6 rounded-full" />
            <div class="space-y-1">
              <Skeleton class="h-4 w-20" /><Skeleton class="h-3 w-16" />
            </div>
          </div>
          <RouterLink
            v-else
            :to="accountTarget"
            class="flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          >
            <UserRound aria-hidden="true" class="size-6" :stroke-width="1.6" />
            <span>
              <span class="block max-w-32 truncate text-sm font-semibold">{{
                accountPrimaryLabel
              }}</span>
              <span class="block text-xs text-[var(--bookora-muted)]">{{
                accountSecondaryLabel
              }}</span>
            </span>
          </RouterLink>
          <button
            type="button"
            class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            @click="openWishlist"
          >
            <Heart aria-hidden="true" class="size-6" :stroke-width="1.6" />
            <span class="hidden flex-col items-start text-left xl:flex">
              <span class="block text-sm font-semibold">Yêu thích</span>
              <span class="block text-xs text-[var(--bookora-muted)]"
                >Danh sách yêu thích</span
              >
            </span>
          </button>
          <button
            type="button"
            class="relative flex min-h-11 cursor-pointer items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            @click="openCart"
          >
            <ShoppingCart
              aria-hidden="true"
              class="size-7"
              :stroke-width="1.6"
            />
            <span
              v-if="cartQuantity > 0"
              class="absolute -top-1 left-4 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-5 text-white"
              aria-label="Số lượng sản phẩm trong giỏ"
              >{{ cartQuantity > 99 ? "99+" : cartQuantity }}</span
            >
            <span class="hidden xl:block text-sm font-semibold">Giỏ hàng</span>
          </button>
        </div>
      </div>

      <div class="grid gap-3 py-3 lg:hidden">
        <div class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
          <MobileCategorySheet
            :categories="categoriesQuery.data.value ?? []"
            :links="navigationLinks"
            :account-target="accountTarget"
            :account-label="accountPrimaryLabel"
          />

          <ClientBrand compact />

          <button
            type="button"
            aria-label="Yêu thích"
            class="grid size-11 cursor-pointer place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            @click="openWishlist"
          >
            <Heart aria-hidden="true" class="size-5.5" />
          </button>
          <button
            type="button"
            aria-label="Giỏ hàng"
            class="relative grid size-11 cursor-pointer place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            @click="openCart"
          >
            <ShoppingCart aria-hidden="true" class="size-6" />
            <span
              v-if="cartQuantity > 0"
              class="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-5 text-white"
              >{{ cartQuantity > 99 ? "99+" : cartQuantity }}</span
            >
          </button>
        </div>

        <form
          ref="mobileSearchRoot"
          role="search"
          class="relative flex min-w-0"
          @submit.prevent="submitSearch()"
        >
          <label for="mobile-book-search" class="sr-only">Tìm kiếm sách</label>
          <Input
            id="mobile-book-search"
            v-model="searchQuery"
            aria-label="Tìm kiếm sách"
            role="combobox"
            :aria-expanded="activeSearchTarget === 'mobile'"
            aria-controls="mobile-search-suggestions"
            :aria-activedescendant="
              activeSuggestionIndex >= 0
                ? `search-suggestion-${activeSuggestionIndex}`
                : undefined
            "
            placeholder="Bạn đang tìm sách gì?"
            class="h-11 min-w-0 rounded-r-none border-[var(--bookora-border)] bg-background pr-10 shadow-none focus-visible:z-10 focus-visible:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/20"
            autocomplete="off"
            @focus="focusSearch('mobile')"
            @keydown="handleSearchKeydown"
          />
          <button
            v-if="searchQuery"
            type="button"
            aria-label="Xóa từ khóa tìm kiếm"
            class="absolute right-12 top-1/2 z-20 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-[var(--bookora-muted)] hover:text-[var(--bookora-ink)]"
            @click="clearSearchInput"
          >
            <X class="size-4" />
          </button>
          <Button
            type="submit"
            aria-label="Tìm kiếm"
            class="h-11 w-12 rounded-l-none bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
          >
            <Search aria-hidden="true" class="size-5" />
          </Button>
          <Transition name="search-panel">
            <LiveSearchPanel
              v-if="activeSearchTarget === 'mobile'"
              id="mobile-search-suggestions"
              mobile
              :query="normalizeSearchText(searchQuery)"
              :suggestions="suggestions"
              :total="suggestionTotal"
              :history="searchHistory.history.value"
              :search-suggestions="searchSuggestions"
              :active-index="activeSuggestionIndex"
              :is-loading="isSuggestionLoading"
              :is-error="isSuggestionError"
              @dismiss="dismissSearchPanel"
              @submit="submitSearch"
              @remove-history="removeSearchHistory"
              @clear-history="clearSearchHistory"
              @retry="suggestionsQuery.refetch()"
            />
          </Transition>
        </form>

        <BranchSelector />
      </div>

      <div
        class="hidden min-h-16 items-center gap-6 border-t border-[var(--bookora-border)]/70 lg:flex"
      >
        <CategoryMegaMenu :categories="categoriesQuery.data.value ?? []" />

        <nav
          aria-label="Điều hướng mua sắm"
          class="flex min-w-0 flex-1 items-center justify-around gap-4"
        >
          <RouterLink
            v-for="link in navigationLinks"
            :key="link.label"
            :to="link.href"
            class="whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold transition-colors hover:text-[var(--bookora-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          >
            {{ link.label }}
          </RouterLink>
        </nav>

        <BranchSelector />
      </div>
    </div>
  </header>
</template>

<style scoped>
.search-panel-enter-active,
.search-panel-leave-active {
  transition:
    opacity 170ms ease,
    transform 170ms ease;
}

.search-panel-enter-from,
.search-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .search-panel-enter-active,
  .search-panel-leave-active {
    transition: none;
  }
}
</style>
