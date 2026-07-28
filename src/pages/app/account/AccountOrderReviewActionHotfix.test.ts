// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { Tabs } from "@/components/ui/tabs";
import AccountReviewsPage from "./AccountReviewsPage.vue";
import ordersSource from "./AccountOrdersPage.vue?raw";
import reviewsSource from "./AccountReviewsPage.vue?raw";

const mocks = vi.hoisted(() => ({
  deleteReview: vi.fn(),
  listMyReviews: vi.fn(),
  listPendingReviews: vi.fn(),
  publishEngagementChange: vi.fn(),
}));

vi.mock("@/features/engagement/api/engagement-api", () => ({
  deleteReview: mocks.deleteReview,
  listMyReviews: mocks.listMyReviews,
  listPendingReviews: mocks.listPendingReviews,
  engagementKeys: {
    reviews: ["engagement", "reviews"],
    dashboard: ["engagement", "dashboard"],
    mine: (params: unknown) => ["engagement", "reviews", "mine", params],
    pending: (params: unknown) => [
      "engagement",
      "reviews",
      "pending",
      params,
    ],
  },
}));

vi.mock("@/features/engagement/state/engagement-sync", () => ({
  publishEngagementChange: mocks.publishEngagementChange,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listPendingReviews.mockResolvedValue({
    items: [],
    totalItems: 0,
    totalPages: 1,
    page: 1,
    limit: 10,
  });
  mocks.listMyReviews.mockResolvedValue({
    items: [],
    totalItems: 0,
    totalPages: 1,
    page: 1,
    limit: 10,
  });
});

async function mountAt(url: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/account/reviews",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push(url);
  await router.isReady();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const wrapper = mount(AccountReviewsPage, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      stubs: { ReviewFormDialog: true },
    },
  });
  await flushPromises();
  return { router, wrapper };
}

describe("Phase 17 order review action hotfix", () => {
  it("keeps the order card action layout responsive without absolute positioning", () => {
    expect(ordersSource).toContain("reviewAction.type === 'WRITE'");
    expect(ordersSource).toContain("reviewAction.type === 'VIEW'");
    expect(ordersSource).toContain("flex min-w-0 flex-wrap");
    expect(ordersSource).toContain("w-full shrink-0 sm:w-auto");
    expect(ordersSource).not.toContain("absolute");
  });

  it("hydrates written tab and both server filters from the URL", async () => {
    const { router, wrapper } = await mountAt(
      "/account/reviews?tab=written&orderId=order-1",
    );

    expect(mocks.listMyReviews).toHaveBeenCalledWith(
      { page: 1, limit: 10, orderId: "order-1" },
      expect.any(AbortSignal),
    );
    expect(mocks.listPendingReviews).toHaveBeenCalledWith(
      { page: 1, limit: 10, orderId: "order-1" },
      expect.any(AbortSignal),
    );
    expect(wrapper.findComponent(Tabs).props("modelValue")).toBe("written");

    wrapper.findComponent(Tabs).vm.$emit("update:modelValue", "pending");
    await flushPromises();
    expect(router.currentRoute.value.query).toMatchObject({
      tab: "pending",
      orderId: "order-1",
    });
    wrapper.unmount();
  });

  it("falls back to pending and clears only orderId when viewing all", async () => {
    const { router, wrapper } = await mountAt(
      "/account/reviews?tab=invalid&orderId=order-2",
    );

    expect(wrapper.findComponent(Tabs).props("modelValue")).toBe("pending");
    expect(reviewsSource).toContain("delete query.orderId");
    const clearButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Xem tất cả");
    expect(clearButton).toBeDefined();
    await clearButton?.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.orderId).toBeUndefined();
    expect(router.currentRoute.value.query.tab).toBe("invalid");
    wrapper.unmount();
  });
});
