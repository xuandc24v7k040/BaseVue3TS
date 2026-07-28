// @vitest-environment happy-dom

import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { Tabs } from "@/components/ui/tabs";
import AccountReviewsPage from "./AccountReviewsPage.vue";

const mocks = vi.hoisted(() => ({
  deleteReview: vi.fn(),
  listMyReviews: vi.fn(),
  listPendingReviews: vi.fn(),
  publishEngagementChange: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
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

vi.mock("vue-sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

const writtenReview = {
  id: "review-1",
  orderId: "order-1",
  orderCode: "BK-01",
  product: {
    id: "product-1",
    name: "Sách kiểm thử",
    slug: "sach-kiem-thu",
    imageUrl: null,
  },
  rating: 5,
  content: "Nội dung đánh giá",
  isVisible: true,
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
};

function buttonByText(text: string): HTMLButtonElement {
  const button = [...document.body.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!(button instanceof HTMLButtonElement)) {
    const labels = [...document.body.querySelectorAll("button")].map(
      (candidate) => candidate.textContent?.trim(),
    );
    throw new Error(
      `Không tìm thấy nút "${text}". Các nút hiện có: ${labels.join(" | ")}`,
    );
  }
  return button;
}

async function mountPage(): Promise<{
  wrapper: VueWrapper;
  queryClient: QueryClient;
}> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/account/reviews",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push("/account/reviews");
  await router.isReady();
  const wrapper = mount(AccountReviewsPage, {
    attachTo: document.body,
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      stubs: { ReviewFormDialog: true },
    },
  });
  await flushPromises();
  return { wrapper, queryClient };
}

async function openDeleteDialog(wrapper: VueWrapper): Promise<HTMLButtonElement> {
  wrapper.findComponent(Tabs).vm.$emit("update:modelValue", "written");
  await flushPromises();
  const trigger = buttonByText("Xóa");
  trigger.click();
  await flushPromises();
  expect(document.body.textContent).toContain("Xóa đánh giá này?");
  return trigger;
}

beforeEach(() => {
  mocks.listPendingReviews.mockResolvedValue({
    items: [],
    totalItems: 0,
    totalPages: 0,
    page: 1,
    limit: 10,
  });
  mocks.listMyReviews.mockResolvedValue({
    items: [writtenReview],
    totalItems: 1,
    totalPages: 1,
    page: 1,
    limit: 10,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("AccountReviewsPage review delete AlertDialog", () => {
  it("cancels without calling the API and restores focus to the row action", async () => {
    const { wrapper } = await mountPage();
    const trigger = await openDeleteDialog(wrapper);

    buttonByText("Hủy").click();
    await flushPromises();

    expect(mocks.deleteReview).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Xóa đánh giá này?");
    expect(document.activeElement).toBe(trigger);
    wrapper.unmount();
  });

  it("calls delete once, locks both actions while pending, then closes on success", async () => {
    let resolveDelete!: (value: { id: string }) => void;
    mocks.deleteReview.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const { wrapper, queryClient } = await mountPage();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await openDeleteDialog(wrapper);
    const confirm = buttonByText("Xóa đánh giá");

    confirm.click();
    confirm.click();
    await flushPromises();

    expect(mocks.deleteReview).toHaveBeenCalledTimes(1);
    expect(buttonByText("Đang xóa...").disabled).toBe(true);
    expect(buttonByText("Hủy").disabled).toBe(true);

    resolveDelete({ id: "review-1" });
    await flushPromises();

    expect(document.body.textContent).not.toContain("Xóa đánh giá này?");
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Đã xóa đánh giá.");
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["engagement", "reviews"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["engagement", "dashboard"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["customer-orders"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["customer-order"],
    });
    wrapper.unmount();
  });

  it("keeps the dialog open and unlocks actions after an error", async () => {
    mocks.deleteReview.mockRejectedValue(new Error("delete failed"));
    const { wrapper } = await mountPage();
    await openDeleteDialog(wrapper);

    buttonByText("Xóa đánh giá").click();
    await flushPromises();

    expect(mocks.deleteReview).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Xóa đánh giá này?");
    expect(buttonByText("Xóa đánh giá").disabled).toBe(false);
    expect(buttonByText("Hủy").disabled).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Không thể xóa đánh giá. Vui lòng thử lại.",
    );
    wrapper.unmount();
  });
});
