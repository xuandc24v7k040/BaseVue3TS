// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RelatedProductsSection from "./RelatedProductsSection.vue";

const relatedQuery = vi.hoisted(() => ({
  data: { value: undefined as unknown[] | undefined },
  isPending: { value: false },
  isError: { value: false },
}));

vi.mock("@/features/storefront/api/storefront-api", () => ({
  useStorefrontRelatedProductsQuery: () => relatedQuery,
}));

function product(id: string) {
  return {
    id,
    name: `Sản phẩm ${id}`,
    slug: `san-pham-${id}`,
  };
}

function mountSection(productId = "current") {
  return mount(RelatedProductsSection, {
    props: { productId },
    global: {
      stubs: {
        RouterLink: { props: ["to"], template: "<a><slot /></a>" },
        Carousel: { template: "<div data-carousel><slot /></div>" },
        CarouselContent: { template: "<div><slot /></div>" },
        CarouselItem: { template: "<div><slot /></div>" },
        CarouselPrevious: {
          template: "<button data-carousel-previous><slot /></button>",
        },
        CarouselNext: {
          template: "<button data-carousel-next><slot /></button>",
        },
        ProductCard: {
          props: ["product"],
          template:
            '<article data-product-card :data-product-id="product.id" />',
        },
        Skeleton: {
          template: '<div data-testid="related-product-skeleton" />',
        },
      },
    },
  });
}

describe("RelatedProductsSection", () => {
  beforeEach(() => {
    relatedQuery.data.value = undefined;
    relatedQuery.isPending.value = false;
    relatedQuery.isError.value = false;
  });

  it("renders three stable skeletons while loading", () => {
    relatedQuery.isPending.value = true;

    const wrapper = mountSection();

    expect(
      wrapper.findAll('[data-testid="related-product-skeleton"]'),
    ).toHaveLength(3);
  });

  it("defensively removes current/duplicate products and renders at most three cards", () => {
    relatedQuery.data.value = [
      product("current"),
      product("a"),
      product("a"),
      product("b"),
      product("c"),
      product("d"),
    ];

    const wrapper = mountSection();
    const cards = wrapper.findAll("[data-product-card]");

    expect(cards.map((card) => card.attributes("data-product-id"))).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(wrapper.find("[data-carousel-previous]").exists()).toBe(true);
    expect(wrapper.find("[data-carousel-next]").exists()).toBe(true);
  });

  it.each([
    ["empty", [], false],
    ["error", undefined, true],
  ])("hides the non-critical section on %s", (_case, data, isError) => {
    relatedQuery.data.value = data;
    relatedQuery.isError.value = isError;

    expect(mountSection().find("section").exists()).toBe(false);
  });
});
