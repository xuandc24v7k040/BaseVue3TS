import { describe, expect, it } from "vitest";
import adminDetail from "@/features/admin-orders/pages/AdminOrderDetailPage.vue?raw";
import receiptAction from "@/features/orders/components/CustomerReceiptConfirmationAction.vue?raw";
import customerDetail from "@/pages/app/account/AccountOrderDetailPage.vue?raw";
import mainSource from "@/main.ts?raw";
import {
  ORDER_DETAIL_QUERY_POLICY,
  ORDER_LIST_QUERY_POLICY,
} from "./api/order-query-policy";
import { INVENTORY_LIST_QUERY_POLICY } from "../inventory/api/inventory-query-policy";

describe("customer receipt and focus refetch hotfix", () => {
  it("uses bounded focus and reconnect policies without polling", () => {
    expect(ORDER_DETAIL_QUERY_POLICY).toEqual({
      staleTime: 20_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
    expect(ORDER_LIST_QUERY_POLICY).toEqual({
      staleTime: 45_000,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
      refetchOnReconnect: "always",
    });
    expect(INVENTORY_LIST_QUERY_POLICY).toEqual({
      staleTime: 45_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
    expect(ORDER_DETAIL_QUERY_POLICY).not.toHaveProperty("refetchInterval");
    expect(ORDER_LIST_QUERY_POLICY).not.toHaveProperty("refetchInterval");
    expect(INVENTORY_LIST_QUERY_POLICY).not.toHaveProperty("refetchInterval");
  });

  it("keeps the customer receipt action explicit and status-preserving", () => {
    expect(customerDetail).toContain("allowedActions.confirmReceived");
    expect(customerDetail).toContain("CustomerReceiptConfirmationAction");
    expect(receiptAction).toContain("Xác nhận đã nhận hàng?");
    expect(receiptAction).toContain("confirmCustomerOrderReceived");
    expect(receiptAction).toContain("publishOrderInvalidated(order.id)");
    expect(customerDetail).not.toContain('targetStatus: "COMPLETED"');
    expect(receiptAction).not.toContain('targetStatus: "COMPLETED"');
  });

  it("renders the backend-authoritative waiting state and receipt timeline event", () => {
    expect(adminDetail).toContain("WAITING_CUSTOMER_RECEIPT");
    expect(adminDetail).toContain("Đang chờ khách hàng xác nhận đã nhận hàng.");
    expect(adminDetail).toContain("CUSTOMER_RECEIPT_CONFIRMED");
    expect(adminDetail).toContain("Khách hàng đã xác nhận nhận hàng");
  });

  it("invalidates both customer and selected-branch admin order caches cross-tab", () => {
    expect(mainSource).toContain("customerOrderKeys.all");
    expect(mainSource).toContain("customerOrderKeys.detail(orderId)");
    expect(mainSource).toContain("adminOrderKeys.lists");
    expect(mainSource).toContain("adminOrderKeys.detail");
  });
});
