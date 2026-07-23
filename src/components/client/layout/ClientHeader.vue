<script setup lang="ts">
import { Heart, Search, ShoppingCart, UserRound } from "@lucide/vue";
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import BranchSelector from "@/components/client/layout/BranchSelector.vue";
import ClientBrand from "@/components/client/layout/ClientBrand.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasSessionHint } from "@/features/auth/session-hint";
import { useStorefrontCategoriesQuery } from "@/features/storefront/api/storefront-api";
import CategoryMegaMenu from "@/features/storefront/components/CategoryMegaMenu.vue";
import MobileCategorySheet from "@/features/storefront/components/MobileCategorySheet.vue";
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
const searchQuery = ref("");
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

function submitSearch(): void {
  const query = searchQuery.value.trim();
  if (!query) return;

  void router.push({ path: "/books", query: { search: query } });
}

function deferredWishlist(): void {
  toast.info("Tính năng yêu thích sẽ được hoàn thiện ở giai đoạn tiếp theo", {
    id: "storefront-wishlist-deferred",
  });
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

        <form role="search" class="flex min-w-0" @submit.prevent="submitSearch">
          <label for="desktop-book-search" class="sr-only">Tìm kiếm sách</label>
          <Input
            id="desktop-book-search"
            v-model="searchQuery"
            aria-label="Tìm kiếm sách"
            placeholder="Bạn đang tìm sách gì?"
            class="h-12 rounded-r-none border-[var(--bookora-border)] bg-background px-5 shadow-none focus-visible:z-10 focus-visible:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/20"
          />
          <Button
            type="submit"
            aria-label="Tìm kiếm"
            class="h-12 w-14 rounded-l-none bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
          >
            <Search aria-hidden="true" class="size-5" />
          </Button>
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
            class="flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            @click="deferredWishlist"
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
            class="relative flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
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
            class="grid size-11 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            @click="deferredWishlist"
          >
            <Heart aria-hidden="true" class="size-5.5" />
          </button>
          <button
            type="button"
            aria-label="Giỏ hàng"
            class="relative grid size-11 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
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

        <form role="search" class="flex" @submit.prevent="submitSearch">
          <label for="mobile-book-search" class="sr-only">Tìm kiếm sách</label>
          <Input
            id="mobile-book-search"
            v-model="searchQuery"
            aria-label="Tìm kiếm sách"
            placeholder="Bạn đang tìm sách gì?"
            class="h-11 rounded-r-none border-[var(--bookora-border)] bg-background shadow-none focus-visible:z-10 focus-visible:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/20"
          />
          <Button
            type="submit"
            aria-label="Tìm kiếm"
            class="h-11 w-12 rounded-l-none bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
          >
            <Search aria-hidden="true" class="size-5" />
          </Button>
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
