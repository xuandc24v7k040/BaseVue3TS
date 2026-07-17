import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import { Badge } from "@/components/ui/badge";
import type { Role } from "../types";
import RoleStatusBadge from "./RoleStatusBadge.vue";

function header(column: Column<Role, unknown>, title: string) {
  return h(DataTableColumnHeader<Role>, {
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

export function formatRoleDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function roleTypeLabel(type: Role["type"]): string {
  return { SYSTEM: "Hệ thống", BRANCH: "Chi nhánh", CUSTOMER: "Khách hàng" }[
    type
  ];
}

export function createRoleColumns(): ColumnDef<Role, unknown>[] {
  const simple = (
    key: keyof Role,
    title: string,
    size: number,
  ): ColumnDef<Role, unknown> => ({
    accessorKey: key,
    header: ({ column }) => header(column, title),
    meta: { title },
    size,
  });
  return [
    {
      ...simple("code", "Mã", 180),
      cell: ({ row }) =>
        h(
          "span",
          {
            class:
              "block w-full truncate whitespace-nowrap font-mono font-semibold text-primary",
            title: row.original.code,
          },
          row.original.code,
        ),
    },
    {
      ...simple("name", "Tên vai trò", 220),
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
      ...simple("type", "Loại", 120),
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap" },
          roleTypeLabel(row.original.type),
        ),
    },
    simple("guardName", "Guard", 100),
    simple("level", "Cấp độ", 100),
    {
      ...simple("isSystem", "Phân loại", 140),
      cell: ({ row }) =>
        h(
          Badge,
          { variant: row.original.isSystem ? "outline" : "secondary" },
          () => (row.original.isSystem ? "Hệ thống" : "Tùy chỉnh"),
        ),
    },
    {
      ...simple("isActive", "Trạng thái", 160),
      cell: ({ row }) => h(RoleStatusBadge, { active: row.original.isActive }),
    },
    {
      ...simple("createdAt", "Ngày tạo", 170),
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap" },
          formatRoleDate(row.original.createdAt),
        ),
    },
    {
      ...simple("updatedAt", "Ngày cập nhật", 170),
      cell: ({ row }) =>
        h(
          "span",
          { class: "whitespace-nowrap" },
          formatRoleDate(row.original.updatedAt),
        ),
    },
  ];
}
