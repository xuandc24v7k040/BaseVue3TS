import { describe, expect, it } from "vitest";
import { customerOrderStatusLabel } from "./order-status";

describe("customer order display status", () => {
  it.each([
    ["SHIPPING", false, "Đang giao hàng"],
    ["SHIPPING", true, "Đã nhận hàng"],
    ["COMPLETED", true, "Hoàn thành"],
  ])("maps %s receipt=%s to %s", (status, confirmed, label) => {
    expect(customerOrderStatusLabel(status, confirmed)).toBe(label);
  });
});
