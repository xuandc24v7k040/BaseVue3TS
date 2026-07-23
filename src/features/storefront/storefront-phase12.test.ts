// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductGallery from "@/features/storefront/components/ProductGallery.vue";
import ProductVariantSelector from "@/features/storefront/components/ProductVariantSelector.vue";
import { queryClient } from "@/lib/query-client";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";

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
      weightGram: null,
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
      weightGram: null,
      packageSize: null,
      optionValues: [{ optionId: "option-cover", optionValueId: "soft" }],
      media: [],
    },
  ];

  it("resolves valid option combinations and disables unavailable values", async () => {
    const wrapper = mount(ProductVariantSelector, {
      props: { options, variants, modelValue: "variant-hard" },
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

  it("keeps legacy fullscreen zoom, keyboard navigation and reopen reset behavior", async () => {
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
      attachTo: document.body,
      props: { media, productName: "Sách" },
    });

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Phóng to"))
      ?.trigger("click");
    await flushPromises();
    expect(document.body.querySelector('[data-slot="scroll-area"]')).toBeNull();

    const zoomButton = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Phóng to"]',
    );
    zoomButton?.click();
    await flushPromises();
    expect(
      document.body.querySelector<HTMLImageElement>("img.transition-transform")
        ?.style.transform,
    ).toBe("scale(1.25)");

    document.body
      .querySelectorAll<HTMLButtonElement>('button[aria-label="Ảnh tiếp theo"]')
      .item(1)
      .click();
    await flushPromises();
    expect(
      document.body.querySelector<HTMLImageElement>("img.transition-transform")
        ?.alt,
    ).toBe("Hai");

    document.body
      .querySelector<HTMLButtonElement>('button[aria-label="Đóng xem ảnh"]')
      ?.click();
    await flushPromises();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Phóng to"))
      ?.trigger("click");
    await flushPromises();
    expect(
      document.body.querySelector<HTMLImageElement>("img.transition-transform")
        ?.style.transform,
    ).toBe("scale(1)");

    document.body
      .querySelector<HTMLElement>('[data-slot="dialog-content"]')
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    await flushPromises();
    expect(
      document.body.querySelector('[data-slot="dialog-content"]'),
    ).toBeNull();
    wrapper.unmount();
  });
});
