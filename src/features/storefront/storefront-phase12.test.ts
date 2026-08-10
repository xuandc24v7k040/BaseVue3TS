// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import ProductGallery from "@/features/storefront/components/ProductGallery.vue";
import productGallerySource from "@/features/storefront/components/ProductGallery.vue?raw";

vi.mock("embla-carousel-vue", async () => {
  const { ref } = await import("vue");

  type SelectListener = (api: TestCarouselApi) => void;
  interface TestCarouselApi {
    canScrollNext: () => boolean;
    canScrollPrev: () => boolean;
    off: (event: string, listener: SelectListener) => TestCarouselApi;
    on: (event: string, listener: SelectListener) => TestCarouselApi;
    reInit: () => void;
    scrollNext: () => void;
    scrollPrev: () => void;
    scrollTo: (index: number) => void;
    selectedScrollSnap: () => number;
  }

  return {
    default: () => {
      let selectedIndex = 0;
      const selectListeners = new Set<SelectListener>();
      const api: TestCarouselApi = {
        canScrollNext: () => true,
        canScrollPrev: () => true,
        off: (event, listener) => {
          if (event === "select") selectListeners.delete(listener);
          return api;
        },
        on: (event, listener) => {
          if (event === "select") selectListeners.add(listener);
          return api;
        },
        reInit: () => {},
        scrollNext: () => api.scrollTo((selectedIndex + 1) % 3),
        scrollPrev: () => api.scrollTo((selectedIndex + 2) % 3),
        scrollTo: (index) => {
          selectedIndex = index;
          selectListeners.forEach((listener) => listener(api));
        },
        selectedScrollSnap: () => selectedIndex,
      };

      return [ref(null), ref(api)];
    },
  };
});
import ProductVariantSelector from "@/features/storefront/components/ProductVariantSelector.vue";
import { queryClient } from "@/lib/query-client";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";

const VueEasyLightboxStub = defineComponent({
  name: "VueEasyLightbox",
  props: {
    visible: Boolean,
    imgs: { type: Array, default: () => [] },
    index: { type: Number, default: 0 },
  },
  emits: ["hide", "on-index-change"],
  template: `
    <div v-if="visible" data-testid="easy-lightbox" :data-index="index" :data-count="imgs.length">
      <button type="button" aria-label="Lightbox tiếp theo" @click="$emit('on-index-change', index, (index + 1) % imgs.length)">Tiếp</button>
      <button type="button" aria-label="Đóng lightbox" @click="$emit('hide')">Đóng</button>
    </div>
  `,
});

const galleryGlobal = {
  stubs: { VueEasyLightbox: VueEasyLightboxStub },
};

const branches = [
  {
    id: "01J00000000000000000000000",
    code: "can-tho",
    name: "Cần Thơ",
    address: "Ninh Kiều",
    province: "Cần Thơ",
    ward: null,
  },
  {
    id: "01J00000000000000000000001",
    code: "hau-giang",
    name: "Hậu Giang",
    address: "Vị Thanh",
    province: "Hậu Giang",
    ward: null,
  },
];

describe("storefront branch context", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });
  afterEach(() => vi.restoreAllMocks());

  it("restores a valid branch and falls back deterministically for a stale branch", () => {
    localStorage.setItem("bookora.storefront.selected_branch", branches[1]!.id);
    const restored = useStorefrontBranchStore();
    restored.initialize(branches);
    expect(restored.selectedBranchId).toBe(branches[1]!.id);

    localStorage.setItem("bookora.storefront.selected_branch", "stale-branch");
    setActivePinia(createPinia());
    const fallback = useStorefrontBranchStore();
    fallback.initialize(branches);
    expect(fallback.selectedBranchId).toBe(branches[0]!.id);
    expect(localStorage.getItem("bookora.storefront.selected_branch")).toBe(
      branches[0]!.id,
    );
  });

  it("invalidates only availability queries when the storefront branch changes", async () => {
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();
    const store = useStorefrontBranchStore();
    store.initialize(branches);
    await store.select(branches[1]!.id);
    expect(invalidate).toHaveBeenCalledOnce();
    const filters = invalidate.mock.calls[0]?.[0];
    const predicate = (typeof filters === "function" ? filters() : filters)
      ?.predicate;
    expect(
      predicate?.({ queryKey: ["storefront-availability"] } as never),
    ).toBe(true);
    expect(predicate?.({ queryKey: ["storefront", "products"] } as never)).toBe(
      false,
    );
  });
});

describe("variant and gallery UI", () => {
  const options = [
    {
      id: "option-cover",
      name: "Bìa",
      code: "COVER",
      presentationType: "TEXT" as const,
      sortOrder: 1,
      values: [
        {
          id: "hard",
          label: "Bìa cứng",
          value: "HARD",
          colorCode: null,
          imageUrl: null,
          sortOrder: 1,
        },
        {
          id: "soft",
          label: "Bìa mềm",
          value: "SOFT",
          colorCode: null,
          imageUrl: null,
          sortOrder: 2,
        },
        {
          id: "missing",
          label: "Không khả dụng",
          value: "MISSING",
          colorCode: null,
          imageUrl: null,
          sortOrder: 3,
        },
      ],
    },
  ];
  const price = {
    current: 100_000,
    original: 100_000,
    onSale: false,
    discountPercent: 0,
  };
  const variants = [
    {
      id: "variant-hard",
      name: "Bìa cứng",
      isDefault: true,
      price,
      isbn: null,
      publicationYear: null,
      pageCount: null,
      weightGram: 350,
      packageSize: null,
      optionValues: [{ optionId: "option-cover", optionValueId: "hard" }],
      media: [],
    },
    {
      id: "variant-soft",
      name: "Bìa mềm",
      isDefault: false,
      price,
      isbn: null,
      publicationYear: null,
      pageCount: null,
      weightGram: 350,
      packageSize: null,
      optionValues: [{ optionId: "option-cover", optionValueId: "soft" }],
      media: [],
    },
  ];

  it("resolves valid option combinations and disables unavailable values", async () => {
    const wrapper = mount(ProductVariantSelector, {
      props: {
        options,
        variants,
        modelValue: "variant-hard",
        variantQuantities: {
          "variant-hard": 5,
          "variant-soft": 2,
        },
        availabilityState: "success",
      },
    });
    const buttons = wrapper.findAll("button");
    expect(
      buttons
        .find((button) => button.text().includes("Không khả dụng"))
        ?.attributes("disabled"),
    ).toBeDefined();
    await buttons
      .find((button) => button.text().includes("Bìa mềm"))
      ?.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["variant-soft"]);
  });

  it("disables only an out-of-stock variant and ignores its click", async () => {
    const wrapper = mount(ProductVariantSelector, {
      props: {
        options,
        variants,
        modelValue: "variant-hard",
        variantQuantities: {
          "variant-hard": 5,
          "variant-soft": 0,
        },
        availabilityState: "success",
      },
    });
    const hard = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Bìa cứng"));
    const soft = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Bìa mềm"));

    expect(hard?.attributes("disabled")).toBeUndefined();
    expect(soft?.attributes("disabled")).toBeDefined();
    expect(soft?.attributes("aria-disabled")).toBe("true");
    expect(soft?.classes()).toContain("disabled:opacity-40");
    await soft?.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("resets the selected image when the resolved gallery changes", async () => {
    const media = [
      {
        id: "one",
        url: "/one.webp",
        altText: "Một",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "two",
        url: "/two.webp",
        altText: "Hai",
        sortOrder: 1,
        isPrimary: false,
      },
    ];
    const wrapper = mount(ProductGallery, {
      props: { media, productName: "Sách" },
      global: galleryGlobal,
    });
    await wrapper.findAll('button[aria-label^="Xem ảnh"]')[1]?.trigger("click");
    expect(wrapper.find('img[alt="Hai"]').exists()).toBe(true);
    await wrapper.setProps({
      media: [
        {
          id: "variant",
          url: "/variant.webp",
          altText: "Variant",
          sortOrder: 0,
          isPrimary: true,
        },
      ],
    });
    expect(wrapper.find('img[alt="Variant"]').exists()).toBe(true);
  });

  it("keeps thumbnails separate and opens vue-easy-lightbox at the active index", async () => {
    const media = [
      {
        id: "one",
        url: "/one.webp",
        altText: "Một",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "two",
        url: "/two.webp",
        altText: "Hai",
        sortOrder: 1,
        isPrimary: false,
      },
    ];
    const wrapper = mount(ProductGallery, {
      props: { media, productName: "Sách" },
      global: galleryGlobal,
    });

    await wrapper.findAll('button[aria-label^="Xem ảnh"]')[1]?.trigger("click");
    expect(
      wrapper
        .find<HTMLImageElement>('[aria-hidden="false"] button[aria-label^="Phóng to ảnh"] img')
        .attributes("src"),
    ).toBe("/two.webp");
    expect(wrapper.find('[data-testid="easy-lightbox"]').exists()).toBe(false);

    await wrapper
      .find('[aria-hidden="false"] button[aria-label^="Phóng to ảnh"]')
      .trigger("click");
    expect(
      wrapper.get('[data-testid="easy-lightbox"]').attributes("data-index"),
    ).toBe("1");
    await wrapper.get('button[aria-label="Đóng lightbox"]').trigger("click");

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Phóng to"))
      ?.trigger("click");
    expect(
      wrapper.get('[data-testid="easy-lightbox"]').attributes("data-index"),
    ).toBe("1");
    await wrapper
      .get('button[aria-label="Lightbox tiếp theo"]')
      .trigger("click");
    expect(
      wrapper
        .find<HTMLImageElement>('[aria-hidden="false"] button[aria-label^="Phóng to ảnh"] img')
        .attributes("src"),
    ).toBe("/one.webp");
  });

  it.each([
    [4, null],
    [5, "+2"],
    [8, "+5"],
    [12, "+9"],
  ])(
    "caps a %i-image gallery at four thumbnail slots",
    (count, overflowLabel) => {
      const media = Array.from({ length: count }, (_, index) => ({
        id: `image-${index}`,
        url: `/image-${index}.webp`,
        altText: `Ảnh ${index + 1}`,
        sortOrder: index,
        isPrimary: index === 0,
      }));
      const wrapper = mount(ProductGallery, {
        props: { media, productName: "Sách" },
        global: galleryGlobal,
      });

      expect(wrapper.findAll('button[aria-label^="Xem ảnh "]')).toHaveLength(
        count > 4 ? 3 : count,
      );
      expect(wrapper.findAll('button[aria-label^="Xem thêm "]')).toHaveLength(
        count > 4 ? 1 : 0,
      );
      if (overflowLabel) {
        expect(wrapper.get('button[aria-label^="Xem thêm "]').text()).toContain(
          overflowLabel,
        );
      }
    },
  );

  it("opens the complete gallery from +N without changing the active image", async () => {
    const media = Array.from({ length: 8 }, (_, index) => ({
      id: `image-${index}`,
      url: `/image-${index}.webp`,
      altText: `Ảnh ${index + 1}`,
      sortOrder: index,
      isPrimary: index === 0,
    }));
    const wrapper = mount(ProductGallery, {
      props: { media, productName: "Sách" },
      global: galleryGlobal,
    });

    await wrapper
      .findAll('button[aria-label^="Xem ảnh "]')[2]
      ?.trigger("click");
    expect(
      wrapper
        .find<HTMLImageElement>('[aria-hidden="false"] button[aria-label^="Phóng to ảnh"] img')
        .attributes("src"),
    ).toBe("/image-2.webp");

    await wrapper.get('button[aria-label="Xem thêm 5 ảnh"]').trigger("click");
    const lightbox = wrapper.get('[data-testid="easy-lightbox"]');
    expect(lightbox.attributes("data-index")).toBe("2");
    expect(lightbox.attributes("data-count")).toBe("8");

    await wrapper
      .get('button[aria-label="Lightbox tiếp theo"]')
      .trigger("click");
    expect(
      wrapper
        .find<HTMLImageElement>('[aria-hidden="false"] button[aria-label^="Phóng to ảnh"] img')
        .attributes("src"),
    ).toBe("/image-3.webp");
  });

  it("hides main-gallery navigation when there is only one image", () => {
    const wrapper = mount(ProductGallery, {
      props: {
        media: [
          {
            id: "one",
            url: "/one.webp",
            altText: "Một",
            sortOrder: 0,
            isPrimary: true,
          },
        ],
        productName: "Sách",
      },
      global: galleryGlobal,
    });

    expect(wrapper.find('button[aria-label="Ảnh trước"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Ảnh tiếp theo"]').exists()).toBe(
      false,
    );
  });

  it("keeps the final image correct during rapid gallery navigation", async () => {
    const media = Array.from({ length: 3 }, (_, index) => ({
      id: `rapid-${index}`,
      url: `/rapid-${index}.webp`,
      altText: `Nhanh ${index + 1}`,
      sortOrder: index,
      isPrimary: index === 0,
    }));
    const wrapper = mount(ProductGallery, {
      props: { media, productName: "Sách" },
      global: galleryGlobal,
    });
    const next = wrapper.get('button[aria-label="Ảnh tiếp theo"]');

    await next.trigger("click");
    await next.trigger("click");
    await next.trigger("click");
    await next.trigger("click");
    await next.trigger("click");

    expect(
      wrapper
        .find<HTMLImageElement>('[aria-hidden="false"] button[aria-label^="Phóng to ảnh"] img')
        .attributes("src"),
    ).toBe("/rapid-2.webp");
    expect(
      wrapper
        .get('[aria-hidden="false"] button[aria-label^="Phóng to ảnh"]')
        .attributes("aria-label"),
    ).toContain("ảnh 3");
    expect(
      wrapper.get('button[aria-label="Xem ảnh 3"]').attributes("aria-current"),
    ).toBe("true");
  });

  it("uses the shared carousel and removes the custom transition engine", () => {
    expect(productGallerySource).toContain("<Carousel");
    expect(productGallerySource).toContain("<CarouselContent");
    expect(productGallerySource).toContain("<CarouselItem");
    expect(productGallerySource).toContain('carouselApi.value.scrollNext()');
    expect(productGallerySource).toContain('carouselApi.value.scrollPrev()');
    expect(productGallerySource).not.toContain("<Transition");
    expect(productGallerySource).not.toContain("imageTransitionName");
    expect(productGallerySource).not.toContain("gallery-next-enter-active");
    expect(productGallerySource).toContain(
      "cursor-pointer overflow-hidden rounded-lg",
    );
    expect(productGallerySource).toContain("disabled:cursor-not-allowed");
  });
});
