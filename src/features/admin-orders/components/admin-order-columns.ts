import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import { RouterLink } from "vue-router";
import type { AdminOrderListItemDto } from "@/api/generated/models";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import {
  formatDateTime,
  formatMoney,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "../utils/admin-order-format";

function header<T>(column: Column<T, unknown>, title: string) {
  return h(DataTableColumnHeader<T>, { column, title, mode: { type: "sort" } });
}

function badgeClass(value: string): string {
  if (["COMPLETED", "PAID"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["CANCELLED", "FAILED", "PAYMENT_FAILED", "REFUNDED"].includes(value)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["PACKING", "SHIPPING", "CONFIRMED"].includes(value)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function createAdminOrderColumns(
  routePrefix: "super-admin" | "branch-admin",
): ColumnDef<AdminOrderListItemDto, unknown>[] {
  return [
    {
      accessorKey: "orderCode",
      header: ({ column }) => header(column, "Đơn hàng"),
      cell: ({ row }) =>
        h("div", { class: "min-w-0" }, [
          h(
            RouterLink,
            {
              to: {
                name: `${routePrefix}-order-detail`,
                params: { id: row.original.id },
              },
              class:
                "block truncate font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline",
              onClick: (event: MouseEvent) => event.stopPropagation(),
            },
            () => row.original.orderCode,
          ),
          h(
            "p",
            { class: "truncate text-xs text-muted-foreground" },
            `${row.original.customerDisplay} · ${row.original.itemLineCount} mặt hàng · ${row.original.totalQuantity} sản phẩm`,
          ),
        ]),
      meta: { title: "Đơn hàng" },
      size: 390,
    },
    {
      accessorKey: "status",
      header: ({ column }) => header(column, "Trạng thái"),
      cell: ({ row }) =>
        h("div", { class: "min-w-0" }, [
          h(
            Badge,
            { variant: "outline", class: badgeClass(row.original.status) },
            () => orderStatusLabel[row.original.status] ?? row.original.status,
          ),
          ...(row.original.customerReceiptConfirmed
            ? [
                h(
                  "p",
                  {
                    class: "mt-1 truncate text-xs text-muted-foreground",
                  },
                  "Khách đã nhận",
                ),
              ]
            : []),
        ]),
      meta: { title: "Trạng thái" },
      size: 180,
    },
    {
      id: "payment",
      header: "Thanh toán",
      cell: ({ row }) =>
        h("div", { class: "min-w-0" }, [
          h(
            Badge,
            {
              variant: "outline",
              class: badgeClass(row.original.paymentStatus),
            },
            () =>
              paymentStatusLabel[row.original.paymentStatus] ??
              row.original.paymentStatus,
          ),
          h(
            "p",
            { class: "mt-1 truncate text-xs text-muted-foreground" },
            paymentMethodLabel[row.original.paymentMethod] ??
              row.original.paymentMethod,
          ),
        ]),
      meta: { title: "Thanh toán" },
      size: 220,
    },
    {
      accessorKey: "paymentStatus",
      header: "Trạng thái thanh toán",
      meta: { title: "Trạng thái thanh toán" },
    },
    {
      accessorKey: "paymentMethod",
      header: "Phương thức thanh toán",
      meta: { title: "Phương thức thanh toán" },
    },
    {
      accessorKey: "totalAmount",
      header: ({ column }) => header(column, "Tổng tiền"),
      cell: ({ row }) =>
        h(
          "span",
          {
            class:
              "block whitespace-nowrap text-right font-semibold tabular-nums",
          },
          formatMoney(row.original.totalAmount),
        ),
      meta: { title: "Tổng tiền" },
      size: 170,
    },
    {
      accessorKey: "placedAt",
      header: ({ column }) => header(column, "Ngày đặt"),
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap" },
          formatDateTime(row.original.placedAt),
        ),
      meta: { title: "Ngày đặt" },
      size: 180,
    },
  ];
}
