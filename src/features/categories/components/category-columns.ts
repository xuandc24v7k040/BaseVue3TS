import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import type { CategoryTreeNode } from "../types";
import {
  categoryLevelLabel,
  categoryTypeLabel,
} from "../utils/category-labels";
import CategoryStatusBadge from "./CategoryStatusBadge.vue";
import CategoryThumbnail from "./CategoryThumbnail.vue";

function header(column: Column<CategoryTreeNode, unknown>, title: string) {
  return h(DataTableColumnHeader<CategoryTreeNode>, {
    column,
    title,
    mode: { type: "sort" },
  });
}

export function createCategoryColumns(): ColumnDef<
  CategoryTreeNode,
  unknown
>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => header(column, "Tên danh mục"),
      cell: ({ row }) =>
        h("div", { class: "flex min-w-0 items-center gap-3" }, [
          h(CategoryThumbnail, {
            src: row.original.imageUrl,
            alt: row.original.name,
          }),
          h("div", { class: "min-w-0" }, [
            h(
              "span",
              {
                class: "block truncate font-medium",
                title: row.original.name,
              },
              row.original.name,
            ),
            row.original.parent
              ? h(
                  "span",
                  {
                    class: "block truncate text-xs text-muted-foreground",
                    title: `Thuộc: ${row.original.parent.name}`,
                  },
                  `Thuộc: ${row.original.parent.name}`,
                )
              : null,
          ]),
        ]),
      meta: { title: "Tên danh mục" },
      size: 320,
    },
    {
      accessorKey: "type",
      header: ({ column }) => header(column, "Loại"),
      cell: ({ row }) => categoryTypeLabel(row.original.type),
      meta: { title: "Loại" },
      size: 150,
    },
    {
      accessorKey: "level",
      header: ({ column }) => header(column, "Cấp"),
      cell: ({ row }) => categoryLevelLabel(row.original.level),
      meta: { title: "Cấp" },
      size: 145,
      enableSorting: false,
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => header(column, "Trạng thái"),
      cell: ({ row }) =>
        h(CategoryStatusBadge, {
          active: row.original.isActive,
          effectiveActive: row.original.effectiveActive,
        }),
      meta: { title: "Trạng thái" },
      size: 185,
    },
    {
      accessorKey: "sortOrder",
      header: ({ column }) => header(column, "Thứ tự"),
      meta: { title: "Thứ tự" },
      size: 110,
    },
    {
      accessorKey: "childrenCount",
      header: ({ column }) => header(column, "Danh mục con"),
      meta: { title: "Danh mục con" },
      size: 145,
      enableSorting: false,
    },
    {
      accessorKey: "productCount",
      header: ({ column }) => header(column, "Sản phẩm"),
      meta: { title: "Sản phẩm" },
      size: 120,
      enableSorting: false,
    },
  ];
}
