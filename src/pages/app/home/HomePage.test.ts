// @vitest-environment happy-dom

import { mount, RouterLinkStub } from "@vue/test-utils";
import { createPinia } from "pinia";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/pages/app/home/HomePage.vue";

vi.mock("embla-carousel-vue", async () => {
  const { ref } = await import("vue");

  type SelectListener = (api: TestCarouselApi) => void;
  interface TestCarouselApi {
    canScrollNext: () => boolean;
    canScrollPrev: () => boolean;
    off: (event: string, listener: SelectListener) => TestCarouselApi;
    on: (event: string, listener: SelectListener) => TestCarouselApi;
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
        canScrollNext: () => selectedIndex < 2,
        canScrollPrev: () => selectedIndex > 0,
        off: (event, listener) => {
          if (event === "select") selectListeners.delete(listener);
          return api;
        },
        on: (event, listener) => {
          if (event === "select") selectListeners.add(listener);
          return api;
        },
        scrollNext: () => api.scrollTo(Math.min(selectedIndex + 1, 2)),
        scrollPrev: () => api.scrollTo(Math.max(selectedIndex - 1, 0)),
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

vi.mock("@/features/storefront/api/storefront-api", async () => {
  const { ref } = await import("vue");
  const product = (name: string, slug: string, rank: number | null = null) => ({
    id: slug.padEnd(26, "0").slice(0, 26),
    name,
    slug,
    authors: [
      { id: "01J00000000000000000000000", name: "Tác giả", slug: "tac-gia" },
    ],
    publisher: null,
    primaryImage: {
      id: "01J00000000000000000000000",
      url: "/cover.webp",
      altText: null,
      sortOrder: 0,
      isPrimary: true,
    },
    price: {
      current: 80_000,
      original: 100_000,
      onSale: true,
      discountPercent: 20,
    },
    releaseDate: null,
    rank,
  });
  const query = <T>(data: T) => ({
    data: ref(data),
    isPending: ref(false),
    isError: ref(false),
    isSuccess: ref(true),
    error: ref(null),
    refetch: vi.fn(),
  });
  return {
    useStorefrontCategoriesQuery: () =>
      query([
        {
          id: "01J00000000000000000000000",
          name: "Văn học",
          slug: "van-hoc",
          imageUrl: null,
          sortOrder: 1,
          children: [],
        },
      ]),
    useStorefrontHomeQuery: () =>
      query({
        bestSellers: [
          product("Đắc Nhân Tâm", "dac-nhan-tam", 1),
          product("Nhà Giả Kim", "nha-gia-kim", 2),
          product("Atomic Habits", "atomic-habits", 3),
          product("Sapiens", "sapiens", 4),
          product("Think Again", "think-again", 5),
        ],
        newest: [product("Sách mới thật", "sach-moi")],
        upcoming: [
          {
            ...product("Sách sắp phát hành thật", "sap-phat-hanh"),
            releaseDate: "2027-01-01T00:00:00.000Z",
          },
        ],
      }),
    useStorefrontProductSummariesQuery: () => query([]),
  };
});

describe("HomePage", () => {
  it("renders the approved hierarchy from public API data", () => {
    const wrapper = mount(HomePage, {
      global: {
        plugins: [createPinia()],
        stubs: { RouterLink: RouterLinkStub },
      },
    });
    expect(wrapper.text()).toContain("Đọc sách hôm nay");
    expect(wrapper.text()).toContain("Văn học");
    expect(wrapper.text()).toContain("Sách bán chạy");
    expect(wrapper.text()).toContain("Ưu đãi thành viên");
    expect(wrapper.text()).toContain("Sách mới thật");
    expect(wrapper.text()).toContain("Sách sắp phát hành thật");
    expect(wrapper.text()).toContain("Phát hành 01-01-2027");
    expect(wrapper.text()).toContain("Đắc Nhân Tâm");
    expect(wrapper.text()).toContain("Think Again");
    const upcoming = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => link.text().includes("Sách sắp phát hành thật"));
    expect(upcoming?.classes()).toContain("min-h-72");
    expect(upcoming?.find("img").classes()).toContain("h-40");
  });

  it("points primary hero actions to compatible product routes", () => {
    const wrapper = mount(HomePage, {
      global: {
        plugins: [createPinia()],
        stubs: { RouterLink: RouterLinkStub },
      },
    });
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(
      links.find((link) => link.text() === "Khám phá ngay")?.props("to"),
    ).toBe("/san-pham");
    expect(links.find((link) => link.text() === "Sách mới")?.props("to")).toBe(
      "/san-pham?sort=new",
    );
  });

  it("switches directly between all three hero banners through the carousel API", async () => {
    const wrapper = mount(HomePage, {
      global: {
        plugins: [createPinia()],
        stubs: { RouterLink: RouterLinkStub },
      },
    });
    const dots = wrapper.get('[aria-label="Chọn banner"]').findAll("button");
    const track = wrapper.get('[data-testid="home-hero-track"]');

    expect(dots).toHaveLength(3);
    expect(dots[0]?.attributes("aria-current")).toBe("true");

    await dots[2]?.trigger("click");
    await dots[0]?.trigger("click");
    await dots[1]?.trigger("click");

    expect(dots[1]?.attributes("aria-current")).toBe("true");
    const bannerImages = wrapper.findAll(
      '[aria-roledescription="carousel"] img',
    );
    expect(bannerImages).toHaveLength(3);
    expect(bannerImages[0]?.classes()).toEqual(
      expect.arrayContaining(["object-cover", "object-center"]),
    );
    expect(track.classes()).not.toContain("will-change-transform");
    expect(track.attributes("style")).toBeUndefined();
  });

  it("supports the carousel keyboard navigation without custom animation handlers", async () => {
    const wrapper = mount(HomePage, {
      global: {
        plugins: [createPinia()],
        stubs: { RouterLink: RouterLinkStub },
      },
    });
    const carousel = wrapper.get('[aria-label="Banner nổi bật"]');
    const dots = wrapper.get('[aria-label="Chọn banner"]').findAll("button");

    expect(carousel.attributes("tabindex")).toBe("0");
    await carousel.trigger("keydown", { key: "ArrowRight" });
    expect(dots[1]?.attributes("aria-current")).toBe("true");
    await carousel.trigger("keydown", { key: "ArrowLeft" });
    expect(dots[0]?.attributes("aria-current")).toBe("true");
  });

  it("moves one slide at a time with transparent previous and next controls", async () => {
    const wrapper = mount(HomePage, {
      global: {
        plugins: [createPinia()],
        stubs: { RouterLink: RouterLinkStub },
      },
    });
    const previous = wrapper.get<HTMLButtonElement>(
      'button[aria-label="Hiển thị banner trước"]',
    );
    const next = wrapper.get<HTMLButtonElement>(
      'button[aria-label="Hiển thị banner tiếp theo"]',
    );

    expect(previous.element.disabled).toBe(true);
    expect(next.element.disabled).toBe(false);
    expect(next.classes()).toEqual(
      expect.arrayContaining([
        "rounded-full",
        "bg-white/45",
        "backdrop-blur-md",
      ]),
    );

    await next.trigger("click");
    expect(previous.element.disabled).toBe(false);
    expect(
      wrapper
        .get('[aria-label="Hiển thị banner 2"]')
        .attributes("aria-current"),
    ).toBe("true");

    await previous.trigger("click");
    expect(previous.element.disabled).toBe(true);
    expect(
      wrapper
        .get('[aria-label="Hiển thị banner 1"]')
        .attributes("aria-current"),
    ).toBe("true");
  });
});
