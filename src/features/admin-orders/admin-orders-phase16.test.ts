import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminOrdersCancel,
  adminOrdersDetail,
  adminOrdersList,
  adminOrdersTransition,
  adminOrdersUpdateInternalNote,
} from "@/api/generated/endpoints/admin-orders/admin-orders";
import {
  cancelAdminOrder,
  getAdminOrder,
  listAdminOrders,
  transitionAdminOrder,
  updateAdminOrderInternalNote,
} from "./api/admin-orders-api";
import { adminOrderKeys } from "./api/admin-order-query-keys";
import { createAdminOrderColumns } from "./components/admin-order-columns";
import columnsSource from "./components/admin-order-columns.ts?raw";
import {
  formatMoney,
  orderStatusLabel,
  paymentMethodLabel,
} from "./utils/admin-order-format";

vi.mock("@/api/generated/endpoints/admin-orders/admin-orders", () => ({
  adminOrdersList: vi.fn(),
  adminOrdersDetail: vi.fn(),
  adminOrdersTransition: vi.fn(),
  adminOrdersCancel: vi.fn(),
  adminOrdersUpdateInternalNote: vi.fn(),
}));

const branchScopedRequest = { branchScoped: true };
const branchScopedListRequest = {
  ...branchScopedRequest,
  paramsSerializer: { indexes: null },
};

describe("Phase 16 admin orders frontend contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps selected branch id in every list and detail cache key", () => {
    const params = { page: 2, limit: 10, status: ["PACKING" as const] };

    expect(adminOrderKeys.list("branch-a", params)).toContain("branch-a");
    expect(adminOrderKeys.detail("branch-a", "order-1")).toContain("branch-a");
    expect(adminOrderKeys.list("branch-a", params)).not.toEqual(
      adminOrderKeys.list("branch-b", params),
    );
  });

  it("sends all reads and mutations through the branch-scoped generated client", async () => {
    vi.mocked(adminOrdersList).mockResolvedValue({
      data: [],
      meta: {},
    } as never);
    vi.mocked(adminOrdersDetail).mockResolvedValue({
      data: { id: "order-1" },
    } as never);
    vi.mocked(adminOrdersTransition).mockResolvedValue({
      data: { id: "order-1" },
    } as never);
    vi.mocked(adminOrdersCancel).mockResolvedValue({
      data: { id: "order-1" },
    } as never);
    vi.mocked(adminOrdersUpdateInternalNote).mockResolvedValue({
      data: { id: "order-1" },
    } as never);

    await listAdminOrders({ page: 1, limit: 10 });
    await getAdminOrder("order-1");
    await transitionAdminOrder("order-1", { targetStatus: "SHIPPING" });
    await cancelAdminOrder("order-1", { reason: "Khách đổi yêu cầu" });
    await updateAdminOrderInternalNote("order-1", { note: "Đóng gói kỹ" });

    expect(adminOrdersList).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      branchScopedListRequest,
      undefined,
    );
    expect(adminOrdersDetail).toHaveBeenCalledWith(
      "order-1",
      branchScopedRequest,
      undefined,
    );
    expect(adminOrdersTransition).toHaveBeenCalledWith(
      "order-1",
      { targetStatus: "SHIPPING" },
      branchScopedRequest,
    );
    expect(adminOrdersCancel).toHaveBeenCalledWith(
      "order-1",
      { reason: "Khách đổi yêu cầu" },
      branchScopedRequest,
    );
    expect(adminOrdersUpdateInternalNote).toHaveBeenCalledWith(
      "order-1",
      { note: "Đóng gói kỹ" },
      branchScopedRequest,
    );
  });

  it("provides Vietnamese labels and VND formatting for the management UI", () => {
    expect(orderStatusLabel.PACKING).toBe("Đang xử lý");
    expect(paymentMethodLabel.VNPAY).toBe("Thanh toán VNPAY");
    expect(formatMoney(67_470_000)).toMatch(/67[.\s]470[.\s]000/);
  });

  it("registers every server filter against a real table column", () => {
    const columnIds = createAdminOrderColumns("branch-admin").map((column) =>
      "accessorKey" in column ? column.accessorKey : column.id,
    );

    expect(columnIds).toEqual(
      expect.arrayContaining(["status", "paymentStatus", "paymentMethod"]),
    );
  });

  it("shows customer receipt as muted helper text below the status badge", () => {
    expect(columnsSource).toContain("row.original.customerReceiptConfirmed");
    expect(columnsSource).toContain("Khách đã nhận");
    expect(columnsSource).toContain(
      'class: "mt-1 truncate text-xs text-muted-foreground"',
    );
    expect(columnsSource).not.toContain("border-teal-200 bg-teal-50");
  });
});
