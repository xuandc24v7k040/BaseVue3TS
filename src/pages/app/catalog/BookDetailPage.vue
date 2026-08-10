<script setup lang="ts">
import { BookOpen, Minus, Plus, ShoppingCart, Star, Zap } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStorefrontAvailabilityQuery,
  useStorefrontProductDetailQuery,
} from "@/features/storefront/api/storefront-api";
import ProductAvailability from "@/features/storefront/components/ProductAvailability.vue";
import ProductGallery from "@/features/storefront/components/ProductGallery.vue";
import ProductVariantSelector from "@/features/storefront/components/ProductVariantSelector.vue";
import RelatedProductsSection from "@/features/storefront/components/RelatedProductsSection.vue";
import RecentlyViewedSection from "@/features/storefront/components/RecentlyViewedSection.vue";
import PublicReviewSection from "@/features/engagement/components/PublicReviewSection.vue";
import WishlistButton from "@/features/engagement/components/WishlistButton.vue";
import { formatProductDate } from "@/features/products/utils/product-date";
import { useProductSeo } from "@/features/storefront/composables/use-product-seo";
import { useVariantSelection } from "@/features/storefront/composables/use-variant-selection";
import { useRecentlyViewed } from "@/features/storefront/composables/use-recently-viewed";
import type { VariantQuantities } from "@/features/storefront/composables/use-variant-selection";
import { storefrontErrorMessage } from "@/features/storefront/utils/storefront-error";
import { buildPrimaryCategoryBreadcrumb } from "@/features/storefront/utils/product-breadcrumb";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCartActions } from "@/features/cart/api/cart-api";
import { cartErrorMessage } from "@/features/cart/utils/cart-error";
import { resolveProductMetadata } from "@/features/storefront/utils/resolved-product-metadata";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const cartActions = useCartActions();
const recentlyViewed = useRecentlyViewed();
const slug = computed(() => String(route.params.slug ?? ""));
const detailQuery = useStorefrontProductDetailQuery(slug);
const product = computed(() => detailQuery.data.value ?? null);
const categoryBreadcrumbItems = computed(() =>
  product.value ? buildPrimaryCategoryBreadcrumb(product.value) : [],
);
const branchStore = useStorefrontBranchStore();
const availabilityQuery = useStorefrontAvailabilityQuery(
  computed(() => branchStore.selectedBranchId),
  computed(() => product.value?.id ?? ""),
);
const variantQuantities = computed<VariantQuantities | null>(() => {
  if (!availabilityQuery.isSuccess.value || !availabilityQuery.data.value) {
    return null;
  }
  return Object.fromEntries(
    availabilityQuery.data.value.variants.map((variant) => [
      variant.variantId,
      variant.availableQuantity,
    ]),
  );
});
const availabilityState = computed<"loading" | "error" | "success">(() =>
  availabilityQuery.isError.value
    ? "error"
    : availabilityQuery.isSuccess.value
      ? "success"
      : "loading",
);
const { selectedVariantId, selectedVariant, displayedVariant, selectVariant } =
  useVariantSelection(product, variantQuantities);
const selectedAvailability = computed(() =>
  availabilityQuery.data.value?.variants.find(
    (variant) => variant.variantId === selectedVariantId.value,
  ),
);
const availableQuantity = computed(
  () => selectedAvailability.value?.availableQuantity ?? 0,
);
const canOrder = computed(
  () =>
    availabilityQuery.isSuccess.value &&
    Boolean(selectedVariant.value) &&
    availableQuantity.value > 0,
);
const quantity = ref(1);
const cartPending = ref(false);
const activeTab = ref<"description" | "details" | "reviews">("description");
const priceFormatter = new Intl.NumberFormat("vi-VN");
const gallery = computed(() =>
  displayedVariant.value?.media.length
    ? displayedVariant.value.media
    : (product.value?.generalMedia ?? []),
);
const isSimpleProduct = computed(
  () =>
    product.value?.options.length === 0 && product.value.variants.length === 1,
);
const resolvedMetadata = computed(() =>
  product.value && displayedVariant.value
    ? resolveProductMetadata(product.value.attributes, displayedVariant.value)
    : [],
);

watch(availableQuantity, (nextQuantity) => {
  quantity.value =
    nextQuantity > 0 ? Math.min(quantity.value, nextQuantity) : 1;
});

watch(
  [() => product.value?.id, () => authStore.status],
  ([productId, authStatus]) => {
    if (!productId || authStatus === "unknown") return;
    if (!recentlyViewed.add(productId)) {
      toast.error("Không thể cập nhật lịch sử sản phẩm đã xem.");
    }
  },
  { immediate: true },
);

useProductSeo(computed(() => product.value?.seo ?? null));

function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} đ`;
}

async function addToCart(buyNow = false): Promise<void> {
  if (authStore.user?.type !== "CUSTOMER") {
    toast.info("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
    await router.push({
      path: "/login",
      query: { returnTo: `/san-pham/${slug.value}` },
    });
    return;
  }
  if (!branchStore.selectedBranchId) {
    toast.error("Vui lòng chọn chi nhánh.");
    return;
  }
  if (!selectedVariant.value) {
    toast.error("Vui lòng chọn phiên bản sản phẩm.");
    return;
  }
  if (!canOrder.value || quantity.value < 1) return;

  cartPending.value = true;
  try {
    await cartActions.add(
      {
        productVariantId: selectedVariant.value.id,
        quantity: quantity.value,
      },
      buyNow ? "BUY_NOW" : "ADD_ITEM",
    );
    toast.success("Đã thêm sản phẩm vào giỏ hàng.");
    if (buyNow) await router.push("/cart");
  } catch (error: unknown) {
    toast.error(cartErrorMessage(error));
  } finally {
    cartPending.value = false;
  }
}
</script>

<template>
  <div class="w-full min-w-0">
    <div v-if="detailQuery.isPending.value" class="space-y-5">
      <Skeleton class="h-6 w-2/3" />
      <div class="grid gap-6 lg:grid-cols-3">
        <Skeleton class="aspect-[4/5]" /><Skeleton class="h-[560px]" /><Skeleton
          class="h-[420px]"
        />
      </div>
    </div>
    <div
      v-else-if="detailQuery.isError.value"
      class="grid min-h-[55vh] place-items-center rounded-2xl border border-dashed bg-background p-8 text-center"
    >
      <div>
        <BookOpen class="mx-auto size-16 text-[var(--bookora-green)]/45" />
        <h1 class="mt-4 text-2xl font-bold">Không tìm thấy sản phẩm</h1>
        <p class="mt-2 text-sm text-[var(--bookora-muted)]">
          {{
            storefrontErrorMessage(
              detailQuery.error.value,
              "Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng kinh doanh.",
            )
          }}
        </p>
        <Button as-child class="mt-5"
          ><RouterLink to="/san-pham"
            >Quay lại danh sách sản phẩm</RouterLink
          ></Button
        >
      </div>
    </div>
    <div v-else-if="product && displayedVariant" class="space-y-6">
      <nav
        aria-label="Breadcrumb"
        class="flex flex-wrap items-center gap-2 text-sm text-[var(--bookora-muted)]"
      >
        <RouterLink to="/">Trang chủ</RouterLink><span>/</span
        ><RouterLink to="/san-pham">Sản phẩm</RouterLink
        ><template
          v-for="category in categoryBreadcrumbItems"
          :key="category.id"
          ><span>/</span
          ><RouterLink :to="category.to">{{
            category.label
          }}</RouterLink></template
        ><span>/</span
        ><span aria-current="page" class="text-[var(--bookora-ink)]">{{
          product.name
        }}</span>
      </nav>

      <div
        class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_340px]"
      >
        <ProductGallery :media="gallery" :product-name="product.name" />
        <section class="min-w-0 rounded-xl bg-background p-1 sm:p-5 xl:p-1">
          <div class="flex min-w-0 items-start gap-3">
            <h1
              class="min-w-0 flex-1 break-words text-3xl font-bold tracking-tight [overflow-wrap:anywhere]"
            >
              {{ product.name }}
            </h1>
            <WishlistButton
              :product-id="product.id"
              class="mt-0.5 size-10 shrink-0 rounded-full border border-[var(--bookora-border)] bg-background text-[var(--bookora-green)] shadow-sm"
            />
          </div>
          <dl
            class="mt-5 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm"
          >
            <dt class="text-[var(--bookora-muted)]">Tác giả:</dt>
            <dd class="font-medium text-[var(--bookora-green)]">
              {{
                product.authors.map((author) => author.name).join(", ") ||
                "Đang cập nhật"
              }}
            </dd>
            <dt class="text-[var(--bookora-muted)]">Nhà xuất bản:</dt>
            <dd>{{ product.publisher?.name ?? "Đang cập nhật" }}</dd>
            <dt class="text-[var(--bookora-muted)]">Thể loại:</dt>
            <dd>
              {{
                product.categories.map((category) => category.name).join(", ")
              }}
            </dd>
          </dl>
          <p
            class="mt-4 flex items-center gap-1 text-sm text-[var(--bookora-muted)]"
          >
            <Star class="size-4 fill-amber-400 text-amber-400" />{{
              product.averageRating?.toFixed(1) ?? "Chưa có đánh giá"
            }}<span v-if="product.reviewCount"
              >({{ product.reviewCount }})</span
            >
          </p>
          <div class="mt-5 flex flex-wrap items-baseline gap-3">
            <strong class="text-3xl text-red-600">{{
              formatPrice(displayedVariant.price.current)
            }}</strong
            ><del
              v-if="displayedVariant.price.onSale"
              class="text-sm text-[var(--bookora-muted)]"
              >{{ formatPrice(displayedVariant.price.original) }}</del
            ><span
              v-if="displayedVariant.price.onSale"
              class="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white"
              >-{{ displayedVariant.price.discountPercent }}%</span
            >
          </div>
          <p
            v-if="product.releaseDate"
            class="mt-2 text-sm text-[var(--bookora-green)]"
          >
            Ngày phát hành:
            {{ formatProductDate(product.releaseDate) }}
          </p>
          <div class="mt-5 rounded-lg bg-[var(--bookora-soft)] p-3 text-sm">
            Bạn sẽ tích lũy Bookora Xu cho đơn hàng này trong giai đoạn thanh
            toán.
          </div>

          <template v-if="!isSimpleProduct">
            <div v-if="product.options.length" class="mt-6">
              <ProductVariantSelector
                :options="product.options"
                :variants="product.variants"
                :model-value="selectedVariantId"
                :variant-quantities="variantQuantities"
                :availability-state="availabilityState"
                @update:model-value="selectVariant"
              />
            </div>
            <p v-else class="mt-6 text-sm">
              <span class="font-semibold">Phiên bản:</span>
              {{ displayedVariant.name }}
            </p>
          </template>

          <div class="mt-6 flex items-center gap-4">
            <span class="text-sm font-semibold">Số lượng</span>
            <div class="flex items-center rounded-lg border">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Giảm số lượng"
                :disabled="!canOrder || quantity <= 1"
                @click="quantity--"
                ><Minus class="size-4" /></Button
              ><span class="w-10 text-center text-sm">{{ quantity }}</span
              ><Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Tăng số lượng"
                :disabled="!canOrder || quantity >= availableQuantity"
                @click="quantity++"
                ><Plus class="size-4"
              /></Button>
            </div>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              class="h-12 border-[var(--bookora-green)] text-[var(--bookora-green)]"
              :disabled="!canOrder || cartPending"
              @click="addToCart(false)"
              ><ShoppingCart class="size-5" /> Thêm vào giỏ hàng</Button
            ><Button
              type="button"
              class="h-12 bg-red-600 text-white hover:bg-red-700"
              :disabled="!canOrder || cartPending"
              @click="addToCart(true)"
              ><Zap class="size-5" /> Mua ngay</Button
            >
          </div>
        </section>
        <ProductAvailability
          class="lg:col-span-2 xl:col-span-1"
          :product-id="product.id"
          :product-slug="product.slug"
          :variant-id="selectedVariant?.id ?? displayedVariant.id"
        />
      </div>

      <RecentlyViewedSection :exclude-product-id="product.id" />

      <div
        class="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <section
          class="min-w-0 rounded-xl border border-[var(--bookora-border)] bg-background p-5 sm:p-6"
        >
          <div class="flex gap-6 border-b">
            <button
              type="button"
              class="border-b-2 px-2 pb-3 text-sm font-semibold"
              :class="
                activeTab === 'description'
                  ? 'border-[var(--bookora-green)] text-[var(--bookora-green)]'
                  : 'border-transparent'
              "
              @click="activeTab = 'description'"
            >
              Mô tả sản phẩm</button
            ><button
              type="button"
              class="border-b-2 px-2 pb-3 text-sm font-semibold"
              :class="
                activeTab === 'details'
                  ? 'border-[var(--bookora-green)] text-[var(--bookora-green)]'
                  : 'border-transparent'
              "
              @click="activeTab = 'details'"
            >
              Thông tin chi tiết</button
            ><button
              type="button"
              class="border-b-2 px-2 pb-3 text-sm font-semibold"
              :class="
                activeTab === 'reviews'
                  ? 'border-[var(--bookora-green)] text-[var(--bookora-green)]'
                  : 'border-transparent'
              "
              @click="activeTab = 'reviews'"
            >
              Đánh giá
            </button>
          </div>
          <div
            v-if="activeTab === 'description'"
            class="prose prose-sm mt-5 max-w-none leading-7"
            v-html="
              product.description ||
              product.shortDescription ||
              'Thông tin mô tả đang được cập nhật.'
            "
          />
          <PublicReviewSection
            v-else-if="activeTab === 'reviews'"
            :product-id="product.id"
          />
          <dl v-else class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div
              v-for="attribute in resolvedMetadata"
              :key="attribute.key"
              class="rounded-lg bg-[var(--bookora-cream)] p-3"
            >
              <dt class="text-[var(--bookora-muted)]">{{ attribute.label }}</dt>
              <dd class="mt-1 font-semibold">
                {{ attribute.value }}
              </dd>
            </div>
          </dl>
        </section>
        <RelatedProductsSection
          :product-id="product.id"
          :category-slug="product.primaryCategory?.slug"
        />
      </div>
    </div>
  </div>
</template>
