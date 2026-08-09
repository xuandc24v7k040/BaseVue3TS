// @vitest-environment happy-dom

import { mount, RouterLinkStub } from "@vue/test-utils";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecentlyViewedSection from "@/features/storefront/components/RecentlyViewedSection.vue";

const mocks = vi.hoisted(() => ({
  entries: undefined as unknown as { value: Array<{ productId: string; viewedAt: number }> },
  remove: vi.fn(),
  clear: vi.fn(),
  reconcile: vi.fn(() => true),
}));

vi.mock("@vueuse/core", () => ({ useResizeObserver: vi.fn() }));
vi.mock("vue-sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/features/storefront/composables/use-recently-viewed", async () => {
  const { ref } = await import("vue");
  mocks.entries = ref([{ productId: "product", viewedAt: 1 }]);
  mocks.remove.mockImplementation((productId: string) => {
    mocks.entries.value = mocks.entries.value.filter((entry) => entry.productId !== productId);
    return true;
  });
  mocks.clear.mockImplementation(() => {
    mocks.entries.value = [];
    return true;
  });
  return {
    useRecentlyViewed: () => ({
      entries: mocks.entries,
      remove: mocks.remove,
      clear: mocks.clear,
      reconcile: mocks.reconcile,
    }),
  };
});
vi.mock("@/features/storefront/api/storefront-api", async () => {
  const { ref } = await import("vue");
  return {
    useStorefrontProductSummariesQuery: () => ({
      data: ref([
        {
          id: "product",
          name: "Sách đã xem",
          slug: "sach-da-xem",
          authors: [],
          publisher: null,
          primaryImage: { id: "media", url: "/cover.webp", altText: null, sortOrder: 0, isPrimary: true },
          price: { current: 80_000, original: 80_000, onSale: false, discountPercent: 0 },
          releaseDate: null,
          rank: null,
          averageRating: null,
          reviewCount: 0,
        },
      ]),
      isPending: ref(false),
      isError: ref(false),
      isSuccess: ref(true),
      refetch: vi.fn(),
    }),
  };
});

describe("RecentlyViewedSection", () => {
  beforeEach(() => {
    mocks.entries.value = [{ productId: "product", viewedAt: 1 }];
    vi.clearAllMocks();
  });

  it("removes one item and hides the section when history becomes empty", async () => {
    const wrapper = mount(RecentlyViewedSection, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });

    expect(wrapper.find(".recent-scrollbar").classes()).toContain("overflow-x-auto");
    await wrapper.get('button[aria-label="Xóa Sách đã xem khỏi sản phẩm đã xem"]').trigger("click");
    await nextTick();

    expect(mocks.remove).toHaveBeenCalledWith("product");
    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("clears all history immediately", async () => {
    const wrapper = mount(RecentlyViewedSection, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    });

    const clearButton = wrapper.findAll("button").find((button) => button.text() === "Xóa lịch sử");
    await clearButton?.trigger("click");
    await nextTick();

    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(wrapper.find("section").exists()).toBe(false);
  });
});
