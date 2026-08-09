// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { ScrollArea } from "@/components/ui/scroll-area";
import LiveSearchPanel from "@/features/storefront/components/LiveSearchPanel.vue";

const RouterLinkStub = {
  props: {
    to: { type: String, required: true },
  },
  template: '<a :href="to"><slot /></a>',
};

const routerLinkGlobal = {
  stubs: { RouterLink: RouterLinkStub },
};

const baseProduct = {
  id: "01J00000000000000000000000",
  name: "Chú Thuật Hồi Chiến",
  slug: "chu-thuat-hoi-chien",
  authors: [{ id: "author", name: "J. K. Rowling", slug: "j-k-rowling" }],
  publisher: { id: "publisher", name: "Nhà xuất bản Kim Đồng", slug: "kim-dong" },
  primaryImage: { id: "media", url: "/cover.webp", altText: null, sortOrder: 0, isPrimary: true },
  price: { current: 29_000, original: 30_000, onSale: true, discountPercent: 3 },
  releaseDate: null,
  rank: null,
  averageRating: 4.8,
  reviewCount: 5,
  isBestMatch: true,
  isBestSeller: false,
};

function mountPanel(activeIndex = -1) {
  return mount(LiveSearchPanel, {
    props: {
      query: "chu",
      suggestions: [
        baseProduct,
        { ...baseProduct, id: "second", name: "Chú Bé Mang Pyjama Sọc", isBestMatch: false, isBestSeller: true },
      ],
      total: 2,
      history: [],
      searchSuggestions: ["Văn học", "Tiểu thuyết"],
      activeIndex,
      isLoading: false,
      isError: false,
    },
    global: routerLinkGlobal,
  });
}

describe("LiveSearchPanel", () => {
  it("clears mouse hover without clearing keyboard selection", async () => {
    const wrapper = mountPanel(0);
    const rows = wrapper.findAll('[role="option"]');

    await rows[1]?.trigger("mouseenter");
    expect(rows[1]?.attributes("data-hovered")).toBe("true");
    expect(rows[0]?.attributes("data-keyboard-active")).toBe("true");

    await rows[1]?.trigger("mouseleave");
    expect(rows[1]?.attributes("data-hovered")).toBeUndefined();
    expect(rows[0]?.attributes("data-keyboard-active")).toBe("true");
  });

  it("renders original highlighted text, metadata and badge priority", () => {
    const wrapper = mountPanel();

    expect(wrapper.find("mark").text()).toBe("Chú");
    expect(wrapper.text()).toContain("J. K. Rowling · Nhà xuất bản Kim Đồng");
    expect(wrapper.find('[data-search-badge="best-match"]').text()).toContain("Đúng nhất");
    expect(wrapper.find('[data-search-badge="best-seller"]').text()).toContain("Bán chạy");
    expect(wrapper.text()).not.toMatch(/Còn hàng|Sắp hết hàng|Sắp về hàng/u);
  });

  it("renders metadata fallback while keeping the price on the next line", () => {
    const wrapper = mount(LiveSearchPanel, {
      props: {
        query: "chu",
        suggestions: [{ ...baseProduct, authors: [], publisher: null }],
        total: 1,
        history: [],
        searchSuggestions: [],
        activeIndex: -1,
        isLoading: false,
        isError: false,
      },
      global: routerLinkGlobal,
    });
    const row = wrapper.find('[role="option"]');
    const metadata = row.find("[data-search-metadata]");
    const price = row.find("strong");

    expect(metadata.text()).toBe("Đang cập nhật");
    expect(price.text()).toBe("29.000đ");
    expect(metadata.element.nextElementSibling).toBe(price.element);
  });

  it("keeps the result CTA outside an automatic ScrollArea", () => {
    const wrapper = mountPanel();
    const scrollBody = wrapper.get('[data-search-scroll-body]');
    const cta = wrapper.get("section > button");

    expect(scrollBody.classes()).toContain("overflow-hidden");
    expect(wrapper.getComponent(ScrollArea).props("type")).toBe("auto");
    expect(scrollBody.find("section > button").exists()).toBe(false);
    expect(cta.text()).toContain("Xem tất cả");
  });

  it("renders product suggestions as links without emitting navigation", async () => {
    const wrapper = mountPanel();
    const rows = wrapper.findAll('a[role="option"]');

    expect(rows).toHaveLength(2);
    expect(rows[0]?.attributes("href")).toBe(
      "/books/chu-thuat-hoi-chien",
    );
    await rows[0]?.trigger("click");
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("renders and submits supplied search suggestions", async () => {
    const wrapper = mountPanel();

    expect(wrapper.text()).toContain("Gợi ý tìm kiếm");
    expect(wrapper.text()).not.toContain("Từ khóa phổ biến");
    const suggestion = wrapper
      .findAll("button")
      .find((button) => button.text().trim() === "Văn học");
    await suggestion?.trigger("click");
    expect(wrapper.emitted("submit")).toContainEqual(["Văn học"]);
  });

  it("shows at most five search suggestions", async () => {
    const wrapper = mountPanel();
    await wrapper.setProps({
      searchSuggestions: ["One", "Two", "Three", "Four", "Five", "Six"],
    });

    const text = wrapper.text();
    expect(
      ["One", "Two", "Three", "Four", "Five"].every((item) =>
        text.includes(item),
      ),
    ).toBe(true);
    expect(text).not.toContain("Six");
  });
});
