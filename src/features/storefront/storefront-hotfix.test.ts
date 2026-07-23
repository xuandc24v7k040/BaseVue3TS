// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import axios from "axios";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import generatedParamsSource from "@/api/generated/models/storefrontProductsListParams.ts?raw";
import branchSource from "@/components/client/layout/BranchSelector.vue?raw";
import headerSource from "@/components/client/layout/ClientHeader.vue?raw";
import customerAddressesSource from "@/features/customer-account/composables/use-customer-account.ts?raw";
import ProductCategoryFilterTree from "@/features/storefront/components/ProductCategoryFilterTree.vue";
import ProductFilterCheckbox from "@/features/storefront/components/ProductFilterCheckbox.vue";
import availabilitySource from "@/features/storefront/components/ProductAvailability.vue?raw";
import cardSource from "@/features/storefront/components/ProductCard.vue?raw";
import gallerySource from "@/features/storefront/components/ProductGallery.vue?raw";
import mobileCategoriesSource from "@/features/storefront/components/MobileCategorySheet.vue?raw";
import { useProductFilters } from "@/features/storefront/composables/use-product-filters";
import listingSource from "@/pages/app/catalog/BookListPage.vue?raw";

const categories = [
  {
    id: "root",
    name: "Văn học",
    slug: "van-hoc",
    imageUrl: null,
    sortOrder: 1,
    children: [
      {
        id: "child",
        name: "Tiểu thuyết",
        slug: "tieu-thuyet",
        imageUrl: null,
        sortOrder: 1,
        children: [],
      },
    ],
  },
];

describe("storefront hotfix contracts", () => {
  it("serializes repeated public filters without bracket suffixes", () => {
    const url = axios.getUri({
      url: "/storefront/products",
      params: { author: ["j-k-rowling", "antoine"], publisher: ["kim-dong"] },
      paramsSerializer: { indexes: null },
    });

    expect(url).toContain("author=j-k-rowling&author=antoine");
    expect(url).toContain("publisher=kim-dong");
    expect(url).not.toContain("author%5B%5D");
    expect(generatedParamsSource).toContain("author?: string[];");
  });

  it("maps URL arrays to singular contract keys and resets the page on filter updates", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/books", component: { template: "<div />" } }],
    });
    await router.push("/books?page=4&author=a&author=b&publisher=kim-dong");

    const filtersRef: { current?: ReturnType<typeof useProductFilters> } = {};
    mount(
      {
        setup() {
          filtersRef.current = useProductFilters();
          return {};
        },
        template: "<div />",
      },
      { global: { plugins: [router] } },
    );

    expect(filtersRef.current?.params.value.author).toEqual(["a", "b"]);
    expect(filtersRef.current?.params.value.publisher).toEqual(["kim-dong"]);
    await filtersRef.current?.toggleList("author", "c", true);
    await flushPromises();
    expect(router.currentRoute.value.query.author).toEqual(["a", "b", "c"]);
    expect(router.currentRoute.value.query.page).toBeUndefined();
  });

  it("uses one shared two-level Collapsible category tree", async () => {
    const wrapper = mount(ProductCategoryFilterTree, { props: { categories } });
    expect(wrapper.find('[data-state="open"]').exists()).toBe(false);
    await wrapper.get('button[aria-label="Mở rộng Văn học"]').trigger("click");
    expect(wrapper.text()).toContain("Tiểu thuyết");
    await wrapper.get("button:nth-of-type(1)").trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["van-hoc"]);

    await wrapper.setProps({ activeSlug: "tieu-thuyet" });
    await flushPromises();
    expect(wrapper.find('[data-state="open"]').exists()).toBe(true);
  });

  it("renders filter choices with the shadcn checkbox primitive", async () => {
    const wrapper = mount(ProductFilterCheckbox, {
      props: {
        id: "author-rowling",
        checked: false,
        label: "J. K. Rowling",
        count: 2,
      },
    });
    expect(wrapper.find('button[role="checkbox"]').exists()).toBe(true);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    await wrapper.get('button[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("change")?.[0]).toEqual([true]);
  });

  it("uses project primitives and keeps fixed modal regions outside scrolling bodies", () => {
    const listing = listingSource;
    const gallery = gallerySource;
    const branch = branchSource;
    const mobileCategories = mobileCategoriesSource;

    expect(listing.match(/role="search"/g)).toBeNull();
    expect(listing).toContain("ProductFilterCheckbox");
    expect(listing).not.toContain('type="checkbox"');
    expect(listing).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(gallery).not.toContain("ScrollArea");
    expect(gallery).toContain("overflow-auto");
    expect(gallery).toContain(':style="{ transform: `scale(${zoom})` }"');
    expect(gallery).toContain('@keydown.left.prevent="move(-1)"');
    expect(gallery).toContain('@keydown.right.prevent="move(1)"');
    expect(branch).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(branch.indexOf("<ScrollArea")).toBeLessThan(
      branch.indexOf("<DialogFooter"),
    );
    expect(mobileCategories).toContain("<Collapsible");
    expect(mobileCategories).not.toContain("<details");
  });

  it("keeps the header and cards aligned with the visual contract", () => {
    expect(headerSource).toContain(
      "hidden flex-col items-start text-left xl:flex",
    );
    const card = cardSource;
    expect(card).toContain("bg-muted/20");
    expect(card).not.toContain("rounded-md bg-[var(--bookora-cream)]");
  });

  it("uses customer default addresses for delivery and never presents a branch address as delivery", () => {
    const availability = availabilitySource;
    const addressQuery = customerAddressesSource;

    expect(availability).toContain("address.isDefault");
    expect(availability).toContain("defaultAddress.formattedAddress");
    expect(availability).toContain("path: '/account/addresses'");
    expect(availability).toContain("path: '/login'");
    expect(availability).not.toContain("selectedBranch.address");
    expect(availability).not.toContain("2–4 ngày");
    expect(availability).toMatch(
      /Thời gian dự\s+kiến sẽ được xác nhận khi đặt hàng\./,
    );
    expect(addressQuery).toContain(
      "enabled: computed(() => toValue(options?.enabled ?? true))",
    );
  });
});
