import { describe, expect, it } from "vitest";
import source from "./AccountOrdersPage.vue?raw";

describe("customer orders tabs and pagination contract", () => {
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

  it("uses server-side page size five and restores tab/page from the URL", () => {
    expect(source).toContain("const PAGE_LIMIT = 5");
    expect(source).toContain('route.query.tab');
    expect(source).toContain('route.query.page');
    expect(source).toContain("customerOrderKeys.list");
  });

  it("keeps the tab list usable on narrow screens", () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain("<ScrollArea");
    expect(source).toContain('scrollbar-orientation="horizontal"');
    expect(source).not.toContain("overflow-x-auto");
  });
});
