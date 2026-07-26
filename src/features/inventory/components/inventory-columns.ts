import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import type {
  BranchProductStockResponseDto,
  InventoryMovementResponseDto,
  InventoryProductStockResponseDto,
  InventoryStockVariantResponseDto,
  InventoryStocksListSortBy,
  StockReceiptListItemResponseDto,
  StockReceiptsListSortBy,
} from "@/api/generated/models";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { RouterLink } from "vue-router";
import CategoryThumbnail from "@/features/categories/components/CategoryThumbnail.vue";
import {
  formatDateTime,
  formatMoney,
  receiptStatusLabel,
  stockStateLabel,
} from "../utils/inventory-format";

function header<T>(column: Column<T, unknown>, title: string) {
  return h(DataTableColumnHeader<T>, { column, title, mode: { type: "sort" } });
}

export interface InventoryStockTableRow {
  id: string;
  rowType: "product" | "variant";
  productId: string;
  productName: string;
  thumbnailUrl: string | null;
  variantId?: string;
  variantName?: string;
  sku?: string;
  optionSummary?: string | null;
  variantCount: number;
  quantity: number;
  lowStockThreshold?: number;
  stockState: InventoryProductStockResponseDto["stockState"];
  updatedAt: string;
  isSimple: boolean;
  actionVariant?: InventoryStockVariantResponseDto;
  children?: InventoryStockTableRow[];
}

export function createGroupedStockColumns(): ColumnDef<
  InventoryStockTableRow,
  unknown
>[] {
  return [
    {
      accessorKey: "productName",
      header: ({ column }) => header(column, "Sản phẩm"),
      cell: ({ row }) => {
        const item = row.original;
        if (item.rowType === "variant") {
          const label =
            item.optionSummary || item.variantName || item.productName;
          return h(
            "div",
            { class: "min-w-0", title: `${label} · ${item.sku ?? ""}` },
            [
              h("p", { class: "truncate font-medium" }, label),
              h(
                "p",
                { class: "truncate font-mono text-xs text-muted-foreground" },
                item.sku,
              ),
            ],
          );
        }

        return h("div", { class: "flex min-w-0 items-center gap-3" }, [
          h(CategoryThumbnail, {
            src: item.thumbnailUrl,
            alt: item.productName,
          }),
          h("div", { class: "min-w-0" }, [
            h(
              "p",
              { class: "truncate font-medium", title: item.productName },
              item.productName,
            ),
            h(
              "p",
              { class: "truncate text-xs text-muted-foreground" },
              item.isSimple ? item.sku : `${item.variantCount} biến thể`,
            ),
          ]),
        ]);
      },
      meta: { title: "Sản phẩm" },
      size: 420,
    },
    {
      id: "variantCount",
      header: "Biến thể",
      cell: ({ row }) =>
        row.original.rowType === "variant"
          ? "Biến thể"
          : row.original.isSimple
            ? "ĐƠN"
            : row.original.variantCount,
      meta: { title: "Biến thể" },
      size: 130,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => header(column, "Tổng tồn"),
      cell: ({ row }) =>
        h(
          "span",
          {
            class:
              "block whitespace-nowrap text-right font-medium tabular-nums",
          },
          row.original.quantity,
        ),
      meta: { title: "Tổng tồn" },
      size: 130,
    },
    {
      accessorKey: "stockState",
      header: "Trạng thái",
      cell: ({ row }) => {
        const item = row.original;
        const label =
          item.rowType === "product" &&
          !item.isSimple &&
          item.stockState === "LOW_STOCK"
            ? "Có biến thể sắp hết"
            : stockStateLabel[item.stockState];
        return h(
          Badge,
          {
            variant:
              item.stockState === "OUT_OF_STOCK" ? "destructive" : "secondary",
          },
          () => label,
        );
      },
      meta: { title: "Trạng thái" },
      size: 190,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => header(column, "Cập nhật"),
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap" },
          formatDateTime(row.original.updatedAt),
        ),
      meta: { title: "Cập nhật" },
      size: 180,
    },
  ];
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

export function isStockSortBy(
  value: string,
): value is InventoryStocksListSortBy {
  return value in stockSortByColumn;
}

export function isReceiptSortBy(
  value: string,
): value is StockReceiptsListSortBy {
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
        h(
          "div",
          {
            class: "min-w-0",
            title: `${row.original.productName} · ${row.original.variantName}`,
          },
          [
            h("p", { class: "truncate font-medium" }, row.original.productName),
            h(
              "p",
              { class: "truncate text-xs text-muted-foreground" },
              row.original.variantName,
            ),
          ],
        ),
      meta: { title: "Sản phẩm / biến thể" },
      size: 320,
    },
    {
      accessorKey: "sku",
      header: ({ column }) => header(column, "SKU"),
      cell: ({ row }) =>
        h(
          "span",
          {
            class: "block truncate font-mono text-xs",
            title: row.original.sku,
          },
          row.original.sku,
        ),
      meta: { title: "SKU" },
      size: 220,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => header(column, "Tồn hiện tại"),
      cell: ({ row }) =>
        h(
          "span",
          { class: "block whitespace-nowrap text-right tabular-nums" },
          row.original.quantity,
        ),
      meta: { title: "Tồn hiện tại" },
      size: 130,
    },
    {
      accessorKey: "lowStockThreshold",
      header: ({ column }) => header(column, "Ngưỡng cảnh báo"),
      cell: ({ row }) =>
        h(
          "span",
          { class: "block whitespace-nowrap text-right tabular-nums" },
          row.original.lowStockThreshold,
        ),
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

export function createReceiptColumns(
  routePrefix: "super-admin" | "branch-admin",
): ColumnDef<StockReceiptListItemResponseDto, unknown>[] {
  return [
    {
      accessorKey: "code",
      header: ({ column }) => header(column, "Mã phiếu"),
      cell: ({ row }) =>
        h(
          RouterLink,
          {
            class:
              "block truncate font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            title: row.original.code,
            to: {
              name: `${routePrefix}-stock-receipt-detail`,
              params: { id: row.original.id },
            },
            onClick: (event: MouseEvent) => event.stopPropagation(),
          },
          () => row.original.code,
        ),
      meta: { title: "Mã phiếu" },
      size: 270,
    },
    {
      accessorKey: "supplier",
      header: "Nhà cung cấp",
      cell: ({ row }) =>
        h(
          "span",
          {
            class: "block truncate",
            title: row.original.supplier?.name ?? "Không có",
          },
          row.original.supplier?.name ?? "Không có",
        ),
      meta: { title: "Nhà cung cấp" },
      size: 260,
    },
    {
      accessorKey: "itemCount",
      header: "Số dòng",
      cell: ({ row }) =>
        h(
          "span",
          { class: "block whitespace-nowrap text-right tabular-nums" },
          row.original.itemCount,
        ),
      meta: { title: "Số dòng" },
      size: 100,
    },
    {
      accessorKey: "totalQuantity",
      header: "Tổng SL",
      cell: ({ row }) =>
        h(
          "span",
          { class: "block whitespace-nowrap text-right tabular-nums" },
          row.original.totalQuantity,
        ),
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

export const movementTypeLabel = {
  MANUAL_ADJUSTMENT: "Điều chỉnh thủ công",
  STOCK_RECEIPT_CONFIRMED: "Xác nhận phiếu nhập",
  ORDER_STOCK_DEDUCTED: "Trừ tồn đơn hàng",
  ORDER_STOCK_RESTORED: "Hoàn tồn đơn hàng",
} as const;

export function createMovementColumns(): ColumnDef<
  InventoryMovementResponseDto,
  unknown
>[] {
  return [
    {
      id: "product",
      header: "Sản phẩm",
      cell: ({ row }) => {
        const movement = row.original;
        const details = movement.variant.isDefault
          ? movement.variant.sku
          : `${movement.variant.name} · ${movement.variant.sku}`;
        return h(
          "div",
          { class: "min-w-0", title: `${movement.product.name} · ${details}` },
          [
            h(
              "p",
              { class: "line-clamp-2 font-medium" },
              movement.product.name,
            ),
            h(
              "p",
              { class: "truncate text-xs text-muted-foreground" },
              details,
            ),
          ],
        );
      },
      meta: { title: "Sản phẩm" },
      size: 330,
    },
    {
      accessorKey: "quantityChange",
      header: "Thay đổi",
      cell: ({ row }) =>
        h(
          "span",
          {
            class: `whitespace-nowrap font-medium tabular-nums ${
              row.original.quantityChange > 0
                ? "text-emerald-600"
                : "text-destructive"
            }`,
          },
          `${row.original.quantityChange > 0 ? "+" : ""}${row.original.quantityChange}`,
        ),
      meta: { title: "Thay đổi" },
      size: 110,
    },
    {
      id: "beforeAfter",
      header: "Trước → Sau",
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap tabular-nums" },
          `${row.original.beforeQuantity} → ${row.original.afterQuantity}`,
        ),
      meta: { title: "Trước → Sau" },
      size: 140,
    },
    {
      accessorKey: "type",
      header: "Loại biến động",
      cell: ({ row }) =>
        h(
          Badge,
          { variant: "secondary" },
          () => movementTypeLabel[row.original.type],
        ),
      meta: { title: "Loại biến động" },
      size: 210,
    },
    {
      accessorKey: "reason",
      header: "Lý do",
      cell: ({ row }) =>
        h(
          "p",
          {
            class: "line-clamp-2 max-w-64",
            title: row.original.reason ?? undefined,
          },
          row.original.reason ?? "—",
        ),
      meta: { title: "Lý do" },
      size: 260,
    },
    {
      id: "source",
      header: "Nguồn",
      cell: ({ row }) => {
        const sourceLabel =
          row.original.source.type === "DIRECT_ADJUSTMENT"
            ? "Điều chỉnh trực tiếp"
            : row.original.source.type === "STOCK_RECEIPT"
              ? "Phiếu nhập"
              : "Đơn hàng";
        return h(
          "div",
          { class: "min-w-0", title: row.original.source.code ?? sourceLabel },
          [
            h("p", { class: "font-medium" }, sourceLabel),
            row.original.source.code
              ? h(
                  "p",
                  { class: "truncate font-mono text-xs text-muted-foreground" },
                  row.original.source.code,
                )
              : null,
          ],
        );
      },
      meta: { title: "Nguồn" },
      size: 220,
    },
    {
      id: "actor",
      header: "Người thao tác",
      cell: ({ row }) =>
        row.original.actor
          ? h(
              "div",
              {
                class: "min-w-0",
                title: `${row.original.actor.name} · ${row.original.actor.email}`,
              },
              [
                h(
                  "p",
                  { class: "truncate font-medium" },
                  row.original.actor.name,
                ),
                h(
                  "p",
                  { class: "truncate text-xs text-muted-foreground" },
                  row.original.actor.email,
                ),
              ],
            )
          : h("span", "Hệ thống"),
      meta: { title: "Người thao tác" },
      size: 240,
    },
    {
      accessorKey: "createdAt",
      header: "Cập nhật",
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap" },
          formatDateTime(row.original.createdAt),
        ),
      meta: { title: "Cập nhật" },
      size: 175,
    },
  ];
}
