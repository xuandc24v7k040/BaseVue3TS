import { describe, expect, it, vi } from "vitest";
import type { CustomerOrdersListParams } from "@/api/generated/models";
import {
  confirmCustomerOrderReceived,
  customerOrderKeys,
  listCustomerOrders,
} from "./customer-orders-api";

const { customerOrderConfirmReceivedMock, customerOrdersListMock } = vi.hoisted(
  () => ({
    customerOrderConfirmReceivedMock: vi.fn(),
    customerOrdersListMock: vi.fn(),
  }),
);

vi.mock("@/api/generated/endpoints/customer-orders/customer-orders", () => ({
  customerOrderCancel: vi.fn(),
  customerOrderConfirmReceived: customerOrderConfirmReceivedMock,
  customerOrderDetail: vi.fn(),
  customerOrdersList: customerOrdersListMock,
}));

describe("customer orders API adapter", () => {
  it("passes multi-status filters and server pagination without array indexes", async () => {
    const params: CustomerOrdersListParams = {
      status: ["CONFIRMED", "PACKING"],
      page: 2,
      limit: 5,
    };
    const signal = new AbortController().signal;
    customerOrdersListMock.mockResolvedValue({
      data: {
        items: [],
        page: 2,
        limit: 5,
        totalItems: 0,
        totalPages: 1,
      },
    });

    await listCustomerOrders(params, signal);

    expect(customerOrdersListMock).toHaveBeenCalledWith(
      params,
      { paramsSerializer: { indexes: null } },
      signal,
    );
    expect(customerOrderKeys.list(params)).toEqual([
      "customer-orders",
      "list",
      params,
    ]);
  });

  it("uses the dedicated confirm-received command", async () => {
    customerOrderConfirmReceivedMock.mockResolvedValue({
      data: { id: "order-1", status: "SHIPPING" },
    });

    const result = await confirmCustomerOrderReceived("order-1");

    expect(customerOrderConfirmReceivedMock).toHaveBeenCalledWith("order-1");
    expect(result).toMatchObject({ id: "order-1", status: "SHIPPING" });
  });
});
