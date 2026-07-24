import {
  CustomerOrderResponseDtoPaymentStatus,
  CustomerOrderResponseDtoStatus,
} from "@/api/generated/models";
import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusLabel,
  paymentStatusLabel,
} from "./order-status";

describe("order status presentation", () => {
  it("covers every generated order status", () => {
    expect(Object.keys(ORDER_STATUS_LABELS).sort()).toEqual(
      Object.values(CustomerOrderResponseDtoStatus).sort(),
    );
    expect(orderStatusLabel("PENDING_PAYMENT")).toBe("Chờ thanh toán");
  });

  it("covers every generated payment status", () => {
    expect(Object.keys(PAYMENT_STATUS_LABELS).sort()).toEqual(
      Object.values(CustomerOrderResponseDtoPaymentStatus).sort(),
    );
    expect(paymentStatusLabel("PENDING")).toBe("Chờ thanh toán");
  });

  it("never exposes an unknown raw enum", () => {
    expect(orderStatusLabel("NEW_BACKEND_STATUS")).toBe("Không xác định");
    expect(paymentStatusLabel("NEW_BACKEND_STATUS")).toBe("Không xác định");
  });
});
