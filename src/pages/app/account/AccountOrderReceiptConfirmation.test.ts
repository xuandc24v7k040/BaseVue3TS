// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountOrderDetailPage from "./AccountOrderDetailPage.vue";

const {
  invalidateQueriesMock,
  publishOrderInvalidatedMock,
  routerReplaceMock,
  receiptApiMock,
  setQueryDataMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn().mockResolvedValue(undefined),
  publishOrderInvalidatedMock: vi.fn(),
  routerReplaceMock: vi.fn().mockResolvedValue(undefined),
  receiptApiMock: vi.fn(),
  setQueryDataMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

const shippingOrder = {
  id: "order-1",
  orderCode: "BK0001",
  status: "SHIPPING",
  totalAmount: 100_000,
  subtotalAmount: 100_000,
  discountAmount: 0,
  shippingFee: 0,
  receiverName: "Nguyễn An",
  receiverPhone: "0900000000",
  shippingAddress: "Cần Thơ",
  branchName: "Chi nhánh Cần Thơ",
  branchId: "branch-1",
  shippingServiceName: "Nội bộ",
  paymentMethod: "COD",
  paymentStatus: "UNPAID",
  placedAt: "2026-07-27T08:00:00.000Z",
  customerReceiptConfirmation: { confirmed: false, confirmedAt: null },
  allowedActions: {
    cancel: false,
    confirmReceived: true,
    retryPayment: false,
  },
  items: [],
};

vi.mock("@/features/orders/api/customer-orders-api", () => ({
  cancelCustomerOrder: vi.fn(),
  confirmCustomerOrderReceived: receiptApiMock,
  customerOrderKeys: {
    all: ["customer-orders"],
    detail: (id: string) => ["customer-order", id],
  },
  getCustomerOrder: vi.fn(),
}));

vi.mock("@/features/orders/state/order-sync-channel", () => ({
  publishOrderInvalidated: publishOrderInvalidatedMock,
}));

vi.mock("vue-sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

vi.mock("@tanstack/vue-query", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tanstack/vue-query")>();
  return {
    ...original,
    useMutation: (options: {
      mutationFn: () => Promise<unknown>;
      onError?: (error: unknown) => void;
      onSuccess?: (order: typeof shippingOrder) => Promise<void>;
    }) => ({
      mutateAsync: async () => {
        try {
          const result = (await options.mutationFn()) as typeof shippingOrder;
          await options.onSuccess?.(result);
          return result;
        } catch (error) {
          options.onError?.(error);
          throw error;
        }
      },
    }),
    useQuery: () => ({ data: ref(shippingOrder) }),
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
    useRouter: () => ({ replace: routerReplaceMock }),
  };
});

describe("customer receipt confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    receiptApiMock.mockResolvedValue({
      ...shippingOrder,
      customerReceiptConfirmation: {
        confirmed: true,
        confirmedAt: "2026-07-27T09:00:00.000Z",
      },
      allowedActions: {
        ...shippingOrder.allowedActions,
        confirmReceived: false,
      },
    });
    document.body.innerHTML = "";
  });

  it("opens an explicit confirmation dialog without mutating immediately", async () => {
    const wrapper = mount(AccountOrderDetailPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    });

    const action = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Đã nhận hàng"));
    await action?.trigger("click");
    await nextTick();

    expect(receiptApiMock).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Xác nhận đã nhận hàng?");
    wrapper.unmount();
  });

  it("confirms once, invalidates detail/list, publishes sync, and keeps SHIPPING", async () => {
    const wrapper = mount(AccountOrderDetailPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    });
    const action = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Đã nhận hàng"));
    await action?.trigger("click");
    await nextTick();
    const confirm = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Xác nhận đã nhận hàng"),
    );

    confirm?.click();
    confirm?.click();
    await flushPromises();

    expect(receiptApiMock).toHaveBeenCalledOnce();
    expect(receiptApiMock).toHaveBeenCalledWith("order-1");
    expect(setQueryDataMock).toHaveBeenCalledWith(
      ["customer-order", "order-1"],
      expect.objectContaining({ status: "SHIPPING" }),
    );
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(2);
    expect(publishOrderInvalidatedMock).toHaveBeenCalledWith("order-1");
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Đã xác nhận nhận hàng. Đơn hàng đang chờ chi nhánh hoàn tất.",
    );
    expect(routerReplaceMock).toHaveBeenCalledWith({
      name: "customer-account-orders",
      query: { tab: "received", page: "1" },
    });
    wrapper.unmount();
  });

  it("keeps the dialog open and shows Vietnamese feedback on failure", async () => {
    receiptApiMock.mockRejectedValueOnce(new Error("failed"));
    const wrapper = mount(AccountOrderDetailPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: true } },
    });
    const action = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Đã nhận hàng"));
    await action?.trigger("click");
    await nextTick();
    const confirm = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Xác nhận đã nhận hàng"),
    );

    confirm?.click();
    await flushPromises();

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Không thể xác nhận nhận hàng. Vui lòng thử lại.",
    );
    expect(document.body.querySelector('[role="alertdialog"]')).toBeTruthy();
    wrapper.unmount();
  });
});
