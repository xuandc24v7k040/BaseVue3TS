import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import type { Permission } from "../types";
import {
  formatPermissionAction,
  formatPermissionLabel,
  formatPermissionResource,
} from "../utils/permission-labels";

function header(column: Column<Permission, unknown>, title: string) {
  return h(DataTableColumnHeader<Permission>, {
    column,
    title,
    mode: { type: "sort" },
  });
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatPermissionDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function createPermissionColumns(): ColumnDef<Permission, unknown>[] {
  const simple = (
    key: keyof Permission,
    title: string,
    size: number,
  ): ColumnDef<Permission, unknown> => ({
    accessorKey: key,
    header: ({ column }) => header(column, title),
    meta: { title },
    size,
  });
  return [
    {
      ...simple("code", "Quyền", 260),
      cell: ({ row }) =>
        h("div", { class: "w-full min-w-0 overflow-hidden" }, [
          h(
            "p",
            {
              class: "truncate font-medium",
              title: formatPermissionLabel(row.original),
            },
            formatPermissionLabel(row.original),
          ),
          h(
            "p",
            {
              class:
                "truncate whitespace-nowrap font-mono text-xs text-muted-foreground",
              title: row.original.code,
            },
            row.original.code,
          ),
        ]),
    },
    {
      ...simple("name", "Tên", 220),
      cell: ({ row }) =>
        h(
          "span",
          {
            class: "block w-full truncate font-medium",
            title: row.original.name,
          },
          row.original.name,
        ),
    },
    {
      ...simple("resource", "Tài nguyên", 160),
      cell: ({ row }) =>
        h(
          "span",
          { class: "block w-full truncate", title: row.original.resource },
          formatPermissionResource(row.original.resource),
        ),
    },
    {
      ...simple("action", "Hành động", 200),
      cell: ({ row }) =>
        h(
          "span",
          { class: "block w-full truncate", title: row.original.action },
          formatPermissionAction(row.original.action),
        ),
    },
    simple("guardName", "Guard", 100),
    {
      ...simple("description", "Mô tả", 280),
      cell: ({ row }) =>
        h(
          "span",
          {
            class: "block w-full truncate",
            title: row.original.description ?? "",
          },
          row.original.description || "—",
        ),
    },
    {
      ...simple("createdAt", "Ngày tạo", 170),
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap" },
          formatPermissionDate(row.original.createdAt),
        ),
    },
    {
      ...simple("updatedAt", "Ngày cập nhật", 170),
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap" },
          formatPermissionDate(row.original.updatedAt),
        ),
    },
  ];
}
