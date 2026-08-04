// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountOrderDetailPage from "./AccountOrderDetailPage.vue";

const {
  cancelApiMock,
  invalidateQueriesMock,
  mutationOptions,
  setQueryDataMock,
} = vi.hoisted(() => ({
  cancelApiMock: vi.fn(),
  invalidateQueriesMock: vi.fn().mockResolvedValue(undefined),
  mutationOptions: {
    current: undefined as
      | {
          onError?: () => void;
          onSuccess?: (order: Record<string, unknown>) => Promise<void>;
        }
      | undefined,
  },
  setQueryDataMock: vi.fn(),
}));

vi.mock("@tanstack/vue-query", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tanstack/vue-query")>();
  return {
    ...original,
    useMutation: (options: typeof mutationOptions.current) => {
      mutationOptions.current = options;
      return {
        isPending: ref(false),
        mutateAsync: async () => {
          try {
            const order = await cancelApiMock();
            await options?.onSuccess?.(order);
            return order;
          } catch (error) {
            options?.onError?.();
            throw error;
          }
        },
      };
    },
    useQuery: () => ({
      data: ref({
        id: "order-1",
        orderCode: "BK0001",
        status: "PENDING",
        totalAmount: 100_000,
        subtotalAmount: 100_000,
        discountAmount: 0,
        shippingFee: 0,
        receiverName: "Nguyen Van A",
        receiverPhone: "0900000000",
        shippingAddress: "Can Tho",
        branchName: "Chi nhánh Cần Thơ",
        branchId: "branch-1",
        paymentMethod: "COD",
        paymentStatus: "UNPAID",
        customerReceiptConfirmation: {
          confirmed: false,
          confirmedAt: null,
        },
        allowedActions: {
          cancel: true,
          confirmReceived: false,
          retryPayment: false,
        },
        placedAt: new Date().toISOString(),
        items: [],
      }),
    }),
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
      setQueryData: setQueryDataMock,
    }),
  };
});

vi.mock("vue-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("vue-router")>();
  return {
    ...original,
    useRoute: () => ({ params: { orderId: "order-1" } }),
  };
});

describe("customer order cancellation confirmation", () => {
  beforeEach(() => {
    cancelApiMock.mockReset().mockResolvedValue({
      id: "order-1",
      branchId: "branch-1",
      items: [],
    });
    invalidateQueriesMock.mockClear();
    setQueryDataMock.mockClear();
    document.body.innerHTML = "";
  });

  it("does not mutate when opening or dismissing the dialog", async () => {
    const wrapper = mount(AccountOrderDetailPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    });

    await wrapper.get("button.bg-destructive").trigger("click");
    await nextTick();
    expect(cancelApiMock).not.toHaveBeenCalled();

    const keepButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Không, quay lại"));
    expect(keepButton).toBeTruthy();
    expect(keepButton?.querySelector("button")).toBeNull();
    expect(keepButton?.disabled).toBe(false);
    keepButton?.click();
    await nextTick();
    expect(cancelApiMock).not.toHaveBeenCalled();
    expect(
      document.body
        .querySelector('[role="alertdialog"]')
        ?.getAttribute("data-state"),
    ).toBe("closed");
    wrapper.unmount();
  });

  it("mutates exactly once after explicit confirmation", async () => {
    const wrapper = mount(AccountOrderDetailPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    });

    await wrapper.get("button.bg-destructive").trigger("click");
    await nextTick();
    const confirmButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Xác nhận hủy"));
    expect(confirmButton).toBeTruthy();
    expect(confirmButton?.querySelector("button")).toBeNull();
    expect(confirmButton?.disabled).toBe(false);
    expect(
      document.body.querySelector('[role="alertdialog"]')?.className,
    ).toContain("pointer-events-auto");
    confirmButton?.click();
    await nextTick();

    expect(cancelApiMock).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("prevents a double confirmation while cancellation is pending", async () => {
    let resolveCancellation!: () => void;
    cancelApiMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveCancellation = resolve;
      }),
    );
    const wrapper = mount(AccountOrderDetailPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    });

    await wrapper.get("button.bg-destructive").trigger("click");
    await nextTick();
    const confirmButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Xác nhận hủy"));
    confirmButton?.click();
    confirmButton?.click();
    await nextTick();

    expect(cancelApiMock).toHaveBeenCalledOnce();
    expect(confirmButton?.disabled).toBe(true);
    resolveCancellation();
    await nextTick();
    wrapper.unmount();
  });

  it("keeps the dialog open when cancellation fails", async () => {
    cancelApiMock.mockRejectedValueOnce(new Error("cancel failed"));
    const wrapper = mount(AccountOrderDetailPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    });

    await wrapper.get("button.bg-destructive").trigger("click");
    await nextTick();
    const confirmButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Xác nhận hủy"));
    confirmButton?.click();
    await flushPromises();
    await nextTick();

    expect(cancelApiMock).toHaveBeenCalledOnce();
    expect(document.body.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(confirmButton?.disabled).toBe(false);
    wrapper.unmount();
  });

  it("closes after success and runs the existing invalidation", async () => {
    const wrapper = mount(AccountOrderDetailPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    });

    await wrapper.get("button.bg-destructive").trigger("click");
    await nextTick();
    const confirmButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Xác nhận hủy"));
    confirmButton?.click();
    await nextTick();
    await nextTick();

    expect(cancelApiMock).toHaveBeenCalledOnce();
    expect(setQueryDataMock).toHaveBeenCalledOnce();
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(2);
    expect(
      document.body
        .querySelector('[role="alertdialog"]')
        ?.getAttribute("data-state"),
    ).toBe("closed");
    wrapper.unmount();
  });
});
