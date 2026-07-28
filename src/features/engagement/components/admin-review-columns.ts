import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import { Star } from "@lucide/vue";
import type { AdminReviewDto } from "@/api/generated/models";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { formatDateTime } from "@/lib/date-format";

function sortableHeader<T>(column: Column<T, unknown>, title: string) {
  return h(DataTableColumnHeader<T>, {
    column,
    title,
    mode: { type: "sort" },
  });
}

function staticHeader<T>(column: Column<T, unknown>, title: string) {
  return h(DataTableColumnHeader<T>, {
    column,
    title,
    mode: { type: "none" },
  });
}

export const adminReviewColumns: ColumnDef<AdminReviewDto, unknown>[] = [
  {
    id: "productName",
    accessorFn: (row) => row.product.name,
    header: ({ column }) => sortableHeader(column, "Sản phẩm"),
    cell: ({ row }) =>
      h("div", { class: "min-w-52 max-w-72" }, [
        h(
          "p",
          { class: "truncate font-semibold", title: row.original.product.name },
          row.original.product.name,
        ),
        h(
          "p",
          {
            class: "truncate text-xs text-muted-foreground",
            title: row.original.orderCode,
          },
          row.original.orderCode,
        ),
      ]),
    meta: { title: "Sản phẩm" },
    size: 280,
  },
  {
    id: "customerName",
    accessorFn: (row) => row.customerName,
    header: ({ column }) => sortableHeader(column, "Khách hàng"),
    cell: ({ row }) =>
      h("div", { class: "min-w-44 max-w-60" }, [
        h(
          "p",
          { class: "truncate font-medium", title: row.original.customerName },
          row.original.customerName,
        ),
        h(
          "p",
          {
            class: "truncate text-xs text-muted-foreground",
            title: row.original.customerEmail,
          },
          row.original.customerEmail,
        ),
      ]),
    meta: { title: "Khách hàng" },
    size: 240,
  },
  {
    accessorKey: "rating",
    header: ({ column }) => sortableHeader(column, "Số sao"),
    cell: ({ row }) =>
      h(
        "div",
        {
          class: "flex items-center gap-0.5 text-amber-500",
          "aria-label": `${row.original.rating} trên 5 sao`,
        },
        Array.from({ length: 5 }, (_, index) =>
          h(Star, {
            class: [
              "size-4",
              index < row.original.rating
                ? "fill-current"
                : "text-muted-foreground/30",
            ],
            "aria-hidden": "true",
          }),
        ),
      ),
    meta: { title: "Số sao" },
    size: 150,
  },
  {
    accessorKey: "content",
    header: ({ column }) => staticHeader(column, "Nội dung"),
    cell: ({ row }) =>
      h(
        "p",
        {
          class:
            "line-clamp-3 min-w-64 max-w-96 whitespace-pre-wrap break-words text-sm",
          title: row.original.content ?? undefined,
        },
        row.original.content || "Không có nội dung",
      ),
    meta: { title: "Nội dung" },
    size: 360,
    enableSorting: false,
  },
  {
    accessorKey: "branchName",
    header: ({ column }) => sortableHeader(column, "Chi nhánh"),
    cell: ({ row }) =>
      h(
        "span",
        {
          class: "block min-w-36 max-w-56 truncate",
          title: row.original.branchName,
        },
        row.original.branchName,
      ),
    meta: { title: "Chi nhánh" },
    size: 200,
  },
  {
    accessorKey: "isVisible",
    header: ({ column }) => sortableHeader(column, "Trạng thái"),
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: "outline",
          class: row.original.isVisible
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-600",
        },
        () => (row.original.isVisible ? "Đang hiển thị" : "Đang ẩn"),
      ),
    meta: { title: "Trạng thái" },
    size: 160,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => sortableHeader(column, "Ngày đánh giá"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "whitespace-nowrap" },
        formatDateTime(row.original.createdAt),
      ),
    meta: { title: "Ngày đánh giá" },
    size: 180,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => sortableHeader(column, "Cập nhật lúc"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "whitespace-nowrap" },
        formatDateTime(row.original.updatedAt),
      ),
    meta: { title: "Cập nhật lúc" },
    size: 180,
  },
];
