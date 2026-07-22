import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import type {
  BranchProductStockResponseDto,
  InventoryStocksListSortBy,
  StockReceiptListItemResponseDto,
  StockReceiptsListSortBy,
} from "@/api/generated/models";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { RouterLink } from "vue-router";
import {
  formatDateTime,
  formatMoney,
  receiptStatusLabel,
  stockStateLabel,
} from "../utils/inventory-format";

function header<T>(column: Column<T, unknown>, title: string) {
  return h(DataTableColumnHeader<T>, { column, title, mode: { type: "sort" } });
}

export const stockSortByColumn = {
  productName: "productName",
  sku: "sku",
  quantity: "quantity",
  lowStockThreshold: "lowStockThreshold",
  updatedAt: "updatedAt",
} as const satisfies Record<string, InventoryStocksListSortBy>;

export const receiptSortByColumn = {
  code: "code",
  status: "status",
  createdAt: "createdAt",
  confirmedAt: "confirmedAt",
} as const satisfies Record<string, StockReceiptsListSortBy>;

export function isStockSortBy(value: string): value is InventoryStocksListSortBy {
  return value in stockSortByColumn;
}

export function isReceiptSortBy(value: string): value is StockReceiptsListSortBy {
  return value in receiptSortByColumn;
}

export function createStockColumns(): ColumnDef<
  BranchProductStockResponseDto,
  unknown
>[] {
  return [
    {
      accessorKey: "productName",
      header: ({ column }) => header(column, "Sản phẩm / biến thể"),
      cell: ({ row }) =>
        h("div", { class: "min-w-0", title: `${row.original.productName} · ${row.original.variantName}` }, [
          h("p", { class: "truncate font-medium" }, row.original.productName),
          h(
            "p",
            { class: "truncate text-xs text-muted-foreground" },
            row.original.variantName,
          ),
        ]),
      meta: { title: "Sản phẩm / biến thể" },
      size: 320,
    },
    {
      accessorKey: "sku",
      header: ({ column }) => header(column, "SKU"),
      cell: ({ row }) => h("span", { class: "block truncate font-mono text-xs", title: row.original.sku }, row.original.sku),
      meta: { title: "SKU" },
      size: 220,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => header(column, "Tồn hiện tại"),
      cell: ({ row }) => h("span", { class: "block whitespace-nowrap text-right tabular-nums" }, row.original.quantity),
      meta: { title: "Tồn hiện tại" },
      size: 130,
    },
    {
      accessorKey: "lowStockThreshold",
      header: ({ column }) => header(column, "Ngưỡng cảnh báo"),
      cell: ({ row }) => h("span", { class: "block whitespace-nowrap text-right tabular-nums" }, row.original.lowStockThreshold),
      meta: { title: "Ngưỡng cảnh báo" },
      size: 170,
    },
    {
      accessorKey: "stockState",
      header: "Trạng thái",
      cell: ({ row }) =>
        h(
          Badge,
          {
            variant:
              row.original.stockState === "OUT_OF_STOCK"
                ? "destructive"
                : "secondary",
          },
          () => stockStateLabel[row.original.stockState],
        ),
      meta: { title: "Trạng thái" },
      size: 130,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => header(column, "Cập nhật"),
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
      meta: { title: "Cập nhật" },
      size: 175,
    },
  ];
}

export function createReceiptColumns(routePrefix: "super-admin" | "branch-admin"): ColumnDef<
  StockReceiptListItemResponseDto,
  unknown
>[] {
  return [
    {
      accessorKey: "code",
      header: ({ column }) => header(column, "Mã phiếu"),
      cell: ({ row }) => h(RouterLink, {
        class: "block truncate font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        title: row.original.code,
        to: { name: `${routePrefix}-stock-receipt-detail`, params: { id: row.original.id } },
        onClick: (event: MouseEvent) => event.stopPropagation(),
      }, () => row.original.code),
      meta: { title: "Mã phiếu" },
      size: 270,
    },
    {
      accessorKey: "supplier",
      header: "Nhà cung cấp",
      cell: ({ row }) => h("span", { class: "block truncate", title: row.original.supplier?.name ?? "Không có" }, row.original.supplier?.name ?? "Không có"),
      meta: { title: "Nhà cung cấp" },
      size: 260,
    },
    {
      accessorKey: "itemCount",
      header: "Số dòng",
      cell: ({ row }) => h("span", { class: "block whitespace-nowrap text-right tabular-nums" }, row.original.itemCount),
      meta: { title: "Số dòng" },
      size: 100,
    },
    {
      accessorKey: "totalQuantity",
      header: "Tổng SL",
      cell: ({ row }) => h("span", { class: "block whitespace-nowrap text-right tabular-nums" }, row.original.totalQuantity),
      meta: { title: "Tổng SL" },
      size: 110,
    },
    {
      accessorKey: "totalCostAmount",
      header: "Tổng tiền",
      cell: ({ row }) => formatMoney(row.original.totalCostAmount),
      meta: { title: "Tổng tiền" },
      size: 170,
    },
    {
      accessorKey: "status",
      header: ({ column }) => header(column, "Trạng thái"),
      cell: ({ row }) =>
        h(
          Badge,
          {
            variant:
              row.original.status === "CANCELLED" ? "destructive" : "secondary",
          },
          () => receiptStatusLabel[row.original.status],
        ),
      meta: { title: "Trạng thái" },
      size: 140,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => header(column, "Ngày tạo"),
      cell: ({ row }) => formatDateTime(row.original.createdAt),
      meta: { title: "Ngày tạo" },
      size: 175,
    },
  ];
}
