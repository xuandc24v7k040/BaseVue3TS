<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "@lucide/vue";
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { toast } from "vue-sonner";
import type {
  PublicFacetItemDto,
  StorefrontProductsListSort,
} from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStorefrontCategoriesQuery,
  useStorefrontProductsQuery,
} from "@/features/storefront/api/storefront-api";
import ProductCard from "@/features/storefront/components/ProductCard.vue";
import ProductCategoryFilterTree from "@/features/storefront/components/ProductCategoryFilterTree.vue";
import ProductFilterCheckbox from "@/features/storefront/components/ProductFilterCheckbox.vue";
import { useProductFilters } from "@/features/storefront/composables/use-product-filters";
import { storefrontErrorMessage } from "@/features/storefront/utils/storefront-error";

const { params, view, update, toggleList, reset } = useProductFilters();
const productsQuery = useStorefrontProductsQuery(params);
const categoriesQuery = useStorefrontCategoriesQuery();
const mobileFiltersOpen = ref(false);
const priceError = ref("");

const data = computed(() => productsQuery.data.value);
const activeCategory = computed(() => {
  const slug = params.value.categorySlug;
  for (const root of categoriesQuery.data.value ?? []) {
    if (root.slug === slug) return root;
    const child = root.children.find((item) => item.slug === slug);
    if (child) return child;
  }
  return null;
});

function setSort(value: unknown): void {
  void update({ sort: String(value) as StorefrontProductsListSort });
}

function setPageSize(value: unknown): void {
  void update({ pageSize: Number(value) });
}

function setPrice(key: "priceMin" | "priceMax", event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  const number = value === "" ? undefined : Number(value);
  const other =
    key === "priceMin" ? params.value.priceMax : params.value.priceMin;
  if (number !== undefined && (!Number.isFinite(number) || number < 0)) {
    priceError.value =
      key === "priceMin"
        ? "Giá tối thiểu không hợp lệ."
        : "Giá tối đa không hợp lệ.";
    return;
  }
  if (
    number !== undefined &&
    other !== undefined &&
    (key === "priceMin" ? number > other : other > number)
  ) {
    priceError.value = "Giá tối thiểu không được lớn hơn giá tối đa.";
    return;
  }
  priceError.value = "";
  void update({ [key]: number });
}

async function resetFilters(): Promise<void> {
  await reset();
  mobileFiltersOpen.value = false;
  toast.success("Đã khôi phục bộ lọc");
}

function isChecked(
  key: "author" | "publisher" | "attribute",
  value: string,
): boolean {
  return params.value[key]?.includes(value) ?? false;
}

function filterItems(
  items: PublicFacetItemDto[],
  limit = 8,
): PublicFacetItemDto[] {
  return items.slice(0, limit);
}
</script>

<template>
  <div class="w-full min-w-0">
    <nav
      aria-label="Breadcrumb"
      class="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--bookora-muted)]"
    >
      <RouterLink to="/" class="hover:text-[var(--bookora-green)]"
        >Trang chủ</RouterLink
      ><span>/</span>
      <RouterLink to="/san-pham" class="hover:text-[var(--bookora-green)]"
        >Sản phẩm</RouterLink
      >
      <template v-if="activeCategory"
        ><span>/</span
        ><span aria-current="page">{{ activeCategory.name }}</span></template
      >
    </nav>

    <div class="grid min-w-0 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        class="hidden self-start rounded-xl border border-[var(--bookora-border)] bg-background p-5 lg:sticky lg:top-4 lg:block"
      >
        <div class="space-y-5">
          <section>
            <h2 class="mb-3 font-bold uppercase">Nhóm sản phẩm</h2>
            <div v-if="categoriesQuery.isPending.value" class="space-y-2">
              <Skeleton v-for="i in 6" :key="i" class="h-7" />
            </div>
            <ProductCategoryFilterTree
              v-else
              :categories="categoriesQuery.data.value ?? []"
              :active-slug="params.categorySlug"
              @select="(slug) => update({ category: slug })"
            />
          </section>
          <section class="border-t pt-4">
            <h2 class="mb-3 font-bold uppercase">Giá</h2>
            <div class="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min="0"
                :model-value="params.priceMin"
                placeholder="Từ"
                aria-label="Giá tối thiểu"
                @change="setPrice('priceMin', $event)"
              />
              <Input
                type="number"
                min="0"
                :model-value="params.priceMax"
                placeholder="Đến"
                aria-label="Giá tối đa"
                @change="setPrice('priceMax', $event)"
              />
            </div>
            <p v-if="priceError" role="alert" class="mt-2 text-xs text-red-600">
              {{ priceError }}
            </p>
            <ProductFilterCheckbox
              id="desktop-on-sale"
              class="mt-3"
              :checked="Boolean(params.onSale)"
              label="Đang khuyến mãi"
              @change="(checked) => update({ onSale: checked || undefined })"
            />
            <ProductFilterCheckbox
              id="desktop-upcoming"
              class="mt-2"
              :checked="Boolean(params.upcoming)"
              label="Sắp phát hành"
              @change="(checked) => update({ upcoming: checked || undefined })"
            />
          </section>
          <section v-if="data?.facets.authors.length" class="border-t pt-4">
            <h2 class="mb-3 font-bold uppercase">Tác giả</h2>
            <ProductFilterCheckbox
              v-for="item in filterItems(data.facets.authors)"
              :id="`desktop-author-${item.value}`"
              :key="item.value"
              class="mb-2"
              :checked="isChecked('author', item.value)"
              :label="item.label"
              :count="item.count"
              @change="(checked) => toggleList('author', item.value, checked)"
            />
          </section>
          <section v-if="data?.facets.publishers.length" class="border-t pt-4">
            <h2 class="mb-3 font-bold uppercase">Nhà xuất bản</h2>
            <ProductFilterCheckbox
              v-for="item in filterItems(data.facets.publishers)"
              :id="`desktop-publisher-${item.value}`"
              :key="item.value"
              class="mb-2"
              :checked="isChecked('publisher', item.value)"
              :label="item.label"
              :count="item.count"
              @change="
                (checked) => toggleList('publisher', item.value, checked)
              "
            />
          </section>
          <Button
            type="button"
            variant="outline"
            class="w-full"
            @click="resetFilters"
            ><RotateCcw class="size-4" /> Đặt lại bộ lọc</Button
          >
        </div>
      </aside>

      <section class="min-w-0">
        <div
          class="mb-4 rounded-xl border border-[var(--bookora-border)] bg-background p-4 sm:p-5"
        >
          <div
            class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
          >
            <div>
              <h1 class="text-2xl font-bold text-[var(--bookora-green)]">
                {{
                  params.q
                    ? `Kết quả cho “${params.q}”`
                    : (activeCategory?.name ?? "Tất cả sản phẩm")
                }}
              </h1>
              <p class="text-sm text-[var(--bookora-muted)]">
                {{ data?.totalItems ?? 0 }} sản phẩm
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Sheet v-model:open="mobileFiltersOpen">
                <SheetTrigger as-child
                  ><Button type="button" variant="outline" class="lg:hidden"
                    ><SlidersHorizontal class="size-4" /> Bộ lọc</Button
                  ></SheetTrigger
                >
                <SheetContent
                  side="left"
                  class="grid h-dvh w-[min(92vw,390px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 p-0"
                >
                  <SheetHeader class="border-b p-5 text-left"
                    ><SheetTitle>Bộ lọc sản phẩm</SheetTitle
                    ><SheetDescription
                      >Chọn danh mục và điều kiện phù hợp.</SheetDescription
                    ></SheetHeader
                  >
                  <ScrollArea class="min-h-0 p-5">
                    <div class="space-y-5">
                      <section>
                        <h3 class="mb-2 font-semibold">Danh mục</h3>
                        <ProductCategoryFilterTree
                          :categories="categoriesQuery.data.value ?? []"
                          :active-slug="params.categorySlug"
                          @select="(slug) => update({ category: slug })"
                        />
                      </section>
                      <section v-if="data">
                        <h3 class="mb-2 font-semibold">Tác giả</h3>
                        <ProductFilterCheckbox
                          v-for="item in filterItems(data.facets.authors)"
                          :id="`mobile-author-${item.value}`"
                          :key="item.value"
                          class="mb-2"
                          :checked="isChecked('author', item.value)"
                          :label="item.label"
                          :count="item.count"
                          @change="
                            (checked) =>
                              toggleList('author', item.value, checked)
                          "
                        />
                      </section>
                      <section v-if="data?.facets.publishers.length">
                        <h3 class="mb-2 font-semibold">Nhà xuất bản</h3>
                        <ProductFilterCheckbox
                          v-for="item in filterItems(data.facets.publishers)"
                          :id="`mobile-publisher-${item.value}`"
                          :key="item.value"
                          class="mb-2"
                          :checked="isChecked('publisher', item.value)"
                          :label="item.label"
                          :count="item.count"
                          @change="
                            (checked) =>
                              toggleList('publisher', item.value, checked)
                          "
                        />
                      </section>
                      <ProductFilterCheckbox
                        id="mobile-on-sale"
                        :checked="Boolean(params.onSale)"
                        label="Đang khuyến mãi"
                        @change="
                          (checked) => update({ onSale: checked || undefined })
                        "
                      />
                      <ProductFilterCheckbox
                        id="mobile-upcoming"
                        :checked="Boolean(params.upcoming)"
                        label="Sắp phát hành"
                        @change="
                          (checked) =>
                            update({ upcoming: checked || undefined })
                        "
                      />
                    </div>
                  </ScrollArea>
                  <SheetFooter class="border-t p-4"
                    ><Button
                      type="button"
                      variant="outline"
                      @click="resetFilters"
                      >Đặt lại</Button
                    ><Button type="button" @click="mobileFiltersOpen = false"
                      >Xem kết quả</Button
                    ></SheetFooter
                  >
                </SheetContent>
              </Sheet>
              <Select :model-value="params.sort" @update:model-value="setSort"
                ><SelectTrigger class="w-40" aria-label="Sắp xếp"
                  ><SelectValue /></SelectTrigger
                ><SelectContent
                  ><SelectItem v-if="params.q" value="relevance"
                    >Liên quan nhất</SelectItem
                  ><SelectItem value="popular">Phổ biến</SelectItem
                  ><SelectItem value="newest">Mới nhất</SelectItem
                  ><SelectItem value="price_asc">Giá tăng dần</SelectItem
                  ><SelectItem value="price_desc">Giá giảm dần</SelectItem
                  ><SelectItem value="name_asc">Tên A–Z</SelectItem
                  ><SelectItem value="release_asc"
                    >Sắp phát hành</SelectItem
                  ></SelectContent
                ></Select
              >
              <Select
                :model-value="String(params.pageSize)"
                @update:model-value="setPageSize"
                ><SelectTrigger class="w-32" aria-label="Số sản phẩm"
                  ><SelectValue /></SelectTrigger
                ><SelectContent
                  ><SelectItem value="12">12 sản phẩm</SelectItem
                  ><SelectItem value="24">24 sản phẩm</SelectItem
                  ><SelectItem value="36"
                    >36 sản phẩm</SelectItem
                  ></SelectContent
                ></Select
              >
              <div class="flex rounded-lg border">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  :aria-pressed="view === 'grid'"
                  aria-label="Xem dạng lưới"
                  :class="
                    view === 'grid'
                      ? 'bg-[var(--bookora-green)] text-white'
                      : ''
                  "
                  @click="view = 'grid'"
                  ><Grid2X2 class="size-4" /></Button
                ><Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  :aria-pressed="view === 'list'"
                  aria-label="Xem dạng danh sách"
                  :class="
                    view === 'list'
                      ? 'bg-[var(--bookora-green)] text-white'
                      : ''
                  "
                  @click="view = 'list'"
                  ><List class="size-4"
                /></Button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="productsQuery.isPending.value"
          class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Skeleton v-for="i in 12" :key="i" class="aspect-[3/5] rounded-xl" />
        </div>
        <div
          v-else-if="productsQuery.isError.value"
          class="rounded-xl border border-dashed bg-background p-10 text-center"
        >
          <p>
            {{
              storefrontErrorMessage(
                productsQuery.error.value,
                "Không thể tải sản phẩm.",
              )
            }}
          </p>
          <Button type="button" class="mt-3" @click="productsQuery.refetch()"
            >Thử lại</Button
          >
        </div>
        <div
          v-else-if="!data?.items.length"
          class="rounded-xl border border-dashed bg-background p-12 text-center"
        >
          <Search class="mx-auto size-10 text-[var(--bookora-muted)]" />
          <h2 class="mt-3 text-lg font-semibold">
            {{
              params.q
                ? "Không tìm thấy sản phẩm phù hợp."
                : "Không tìm thấy sản phẩm phù hợp"
            }}
          </h2>
          <p class="mt-1 text-sm text-[var(--bookora-muted)]">
            {{
              params.q
                ? "Thử từ khóa ngắn hơn hoặc kiểm tra lại chính tả."
                : "Hãy thử bộ lọc khác."
            }}
          </p>
          <Button
            type="button"
            variant="outline"
            class="mt-4"
            @click="params.q ? update({ q: undefined }) : resetFilters()"
            >{{ params.q ? "Xóa tìm kiếm" : "Xóa bộ lọc" }}</Button
          >
        </div>
        <div
          v-else
          :class="
            view === 'grid'
              ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4'
              : 'grid gap-3'
          "
        >
          <ProductCard
            v-for="product in data.items"
            :key="product.id"
            :product="product"
            :view="view"
          />
        </div>

        <nav
          v-if="data && data.totalPages > 1"
          aria-label="Phân trang sản phẩm"
          class="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Trang trước"
            :disabled="data.page <= 1"
            @click="update({ page: data.page - 1 }, false)"
            ><ChevronLeft class="size-4" /></Button
          ><Button
            v-for="page in Array.from(
              { length: Math.min(data.totalPages, 7) },
              (_, i) => i + 1,
            )"
            :key="page"
            type="button"
            size="icon"
            :variant="page === data.page ? 'default' : 'outline'"
            :aria-current="page === data.page ? 'page' : undefined"
            @click="update({ page }, false)"
            >{{ page }}</Button
          ><Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Trang tiếp"
            :disabled="data.page >= data.totalPages"
            @click="update({ page: data.page + 1 }, false)"
            ><ChevronRight class="size-4"
          /></Button>
        </nav>
      </section>
    </div>
  </div>
</template>
