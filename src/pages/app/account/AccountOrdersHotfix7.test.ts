// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { computed, reactive, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerOrdersListParams } from "@/api/generated/models";
import { customerOrderKeys } from "@/features/orders/api/customer-orders-api";
import AccountOrdersPage from "./AccountOrdersPage.vue";
import source from "./AccountOrdersPage.vue?raw";

interface MockOrderListResponse {
  items: Record<string, unknown>[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const {
  listCustomerOrdersMock,
  pushMock,
  queryData,
  queryOptions,
  queryResult,
  replaceMock,
  routeQuery,
} = vi.hoisted(() => ({
  listCustomerOrdersMock: vi.fn(),
  pushMock: vi.fn().mockResolvedValue(undefined),
  queryData: {
    current: undefined as
      | { value: MockOrderListResponse | undefined }
      | undefined,
  },
  queryOptions: {
    current: undefined as Record<string, unknown> | undefined,
  },
  queryResult: {
    current: undefined as MockOrderListResponse | undefined,
  },
  replaceMock: vi.fn().mockResolvedValue(undefined),
  routeQuery: {} as Record<string, string>,
}));

vi.mock("@/features/orders/api/customer-orders-api", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/features/orders/api/customer-orders-api")
    >();
  return {
    ...original,
    listCustomerOrders: listCustomerOrdersMock,
  };
});

vi.mock("@tanstack/vue-query", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tanstack/vue-query")>();
  return {
    ...original,
    useQuery: (
      options: Record<string, unknown>,
    ) => {
      queryOptions.current = options;
      const data = ref(queryResult.current);
      queryData.current = data;
      return {
        data,
        isError: ref(false),
        isFetching: ref(false),
        isLoading: ref(false),
        queryKey: computed(() => options.queryKey),
        refetch: vi.fn(),
      };
    },
  };
});

vi.mock("vue-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("vue-router")>();
  return {
    ...original,
    useRoute: () => ({ query: reactive(routeQuery) }),
    useRouter: () => ({ push: pushMock, replace: replaceMock }),
  };
});

function orderFixture(index: number): Record<string, unknown> {
  return {
    id: `order-${index}`,
    orderCode: `BK000${index}`,
    status: "PENDING",
    totalAmount: index * 100_000,
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    placedAt: "2026-07-25T00:00:00.000Z",
    items: [],
  };
}

function mountPage() {
  return mount(AccountOrdersPage, {
    global: {
      stubs: {
        Badge: { template: "<span><slot /></span>" },
        Button: { template: "<button><slot /></button>" },
        RouterLink: { template: "<a><slot /></a>" },
        ScrollArea: { template: "<div><slot /></div>" },
        Skeleton: { template: "<div />" },
      },
    },
  });
}

describe("customer orders tabs and pagination contract", () => {
  beforeEach(() => {
    Object.keys(routeQuery).forEach((key) => delete routeQuery[key]);
    Object.assign(routeQuery, { tab: "all", page: "1" });
    queryResult.current = {
      items: [],
      page: 1,
      limit: 3,
      total: 0,
      totalPages: 1,
    };
    listCustomerOrdersMock.mockReset().mockResolvedValue(queryResult.current);
    queryData.current = undefined;
    queryOptions.current = undefined;
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("covers every real order status without an invented status", () => {
    for (const status of [
      "PENDING_PAYMENT",
      "PAYMENT_FAILED",
      "PENDING",
      "CONFIRMED",
      "PACKING",
      "SHIPPING",
      "COMPLETED",
      "CANCELLED",
      "RETURNED",
    ]) {
      expect(source).toContain(status);
    }
  });

  it("uses server-side page size three and restores tab/page from the URL", () => {
    expect(source).toContain("const ACCOUNT_ORDERS_PAGE_SIZE = 3");
    expect(source).toContain("limit: ACCOUNT_ORDERS_PAGE_SIZE");
    expect(source).toContain('route.query.tab');
    expect(source).toContain('route.query.page');
    expect(source).toContain("customerOrderKeys.list");
    expect(source).not.toContain("slice(0, 3)");
  });

  it("uses the Bookora green token for active, hover and focus tab states", () => {
    expect(source).toContain(
      "'border-[var(--bookora-green)] text-[var(--bookora-green)]'",
    );
    expect(source).toContain("hover:text-[var(--bookora-green)]");
    expect(source).toContain(
      "focus-visible:ring-[var(--bookora-green)]",
    );
    expect(source).not.toContain("'border-red-600 text-red-600'");
    expect(source).not.toContain("focus-visible:ring-red-500");
  });

  it("keeps the tab list usable on narrow screens", () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain("<ScrollArea");
    expect(source).toContain('scrollbar-orientation="horizontal"');
    expect(source).not.toContain("overflow-x-auto");
  });

  it("sends limit 3, includes it in the cache key, and restores the active URL tab", async () => {
    Object.assign(routeQuery, { tab: "pending-payment", page: "2" });
    const wrapper = mountPage();

    const instance = wrapper.vm as unknown as {
      listParams: CustomerOrdersListParams;
    };
    expect(instance.listParams).toEqual({
      status: ["PENDING_PAYMENT"],
      page: 2,
      limit: 3,
    });
    const options = queryOptions.current as {
      queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
      queryKey: { value: readonly unknown[] };
    };
    expect(options.queryKey.value).toEqual(
      customerOrderKeys.list(instance.listParams),
    );
    const controller = new AbortController();
    await options.queryFn({ signal: controller.signal });
    expect(listCustomerOrdersMock).toHaveBeenCalledWith(
      instance.listParams,
      controller.signal,
    );

    const selectedTab = wrapper.get('[role="tab"][aria-selected="true"]');
    expect(selectedTab.attributes("aria-selected")).toBe("true");
    expect(wrapper.findAll('[role="tab"]')[1]?.attributes("aria-selected")).toBe(
      "true",
    );

    wrapper.unmount();
  });

  it("renders server pages as 3, 3 and 1 unique orders for a total of seven", () => {
    const allOrders = Array.from({ length: 7 }, (_, index) =>
      orderFixture(index + 1),
    );
    const renderedOrderIds: string[] = [];

    for (const page of [1, 2, 3]) {
      Object.assign(routeQuery, { tab: "all", page: String(page) });
      queryResult.current = {
        items: allOrders.slice((page - 1) * 3, page * 3),
        page,
        limit: 3,
        total: 7,
        totalPages: 3,
      };

      const wrapper = mountPage();
      const cards = wrapper.findAll("ul > li");
      expect(cards).toHaveLength(page === 3 ? 1 : 3);
      renderedOrderIds.push(
        ...queryResult.current.items.map((order) => String(order.id)),
      );
      wrapper.unmount();
    }

    expect(renderedOrderIds).toHaveLength(7);
    expect(new Set(renderedOrderIds)).toHaveLength(7);
  });

  it("resets page when changing tabs and safely reconciles an out-of-range page", async () => {
    Object.assign(routeQuery, { tab: "all", page: "5" });
    queryResult.current = {
      items: [],
      page: 5,
      limit: 3,
      total: 7,
      totalPages: 0,
    };
    const wrapper = mountPage();
    queryData.current!.value = {
      ...queryResult.current,
      totalPages: 3,
    };
    await flushPromises();

    expect(replaceMock).toHaveBeenCalledWith({
      query: { tab: "all", page: "3" },
    });

    await wrapper.findAll('[role="tab"]')[1]?.trigger("click");
    expect(pushMock).toHaveBeenCalledWith({
      query: { tab: "pending-payment", page: "1" },
    });

    wrapper.unmount();
  });
});
