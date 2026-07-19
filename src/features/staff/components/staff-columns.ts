import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import type { StaffResponseDto } from "@/api/generated/models";
import { Badge } from "@/components/ui/badge";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";

function sortableHeader(
  column: Column<StaffResponseDto, unknown>,
  title: string,
) {
  return h(DataTableColumnHeader<StaffResponseDto>, {
    column,
    title,
    mode: { type: "sort" },
  });
}

const formatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatStaffDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : formatter.format(date);
}

export function createStaffColumns(): ColumnDef<StaffResponseDto, unknown>[] {
  return [
    {
      accessorKey: "fullName",
      header: ({ column }) => sortableHeader(column, "Nhân viên"),
      enableSorting: true,
      cell: ({ row }) =>
        h(
          "span",
          {
            class: "block max-w-56 truncate font-medium",
            title: row.original.fullName ?? "",
          },
          row.original.fullName || "Chưa cập nhật",
        ),
      meta: { title: "Nhân viên" },
    },
    {
      accessorKey: "email",
      header: ({ column }) => sortableHeader(column, "Email"),
      enableSorting: true,
      cell: ({ row }) =>
        h(
          "span",
          { class: "block max-w-64 truncate", title: row.original.email },
          row.original.email,
        ),
      meta: { title: "Email" },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => sortableHeader(column, "Số điện thoại"),
      enableSorting: true,
      cell: ({ row }) => row.original.phone || "—",
      meta: { title: "Số điện thoại" },
    },
    {
      id: "roles",
      header: "Vai trò",
      enableSorting: false,
      cell: ({ row }) =>
        h(
          "div",
          { class: "flex max-w-72 flex-wrap gap-1" },
          row.original.assignment.roles
            .slice(0, 3)
            .map((role) =>
              h(
                Badge,
                { variant: "secondary", title: role.code },
                () => role.name,
              ),
            )
            .concat(
              row.original.assignment.roles.length > 3
                ? [
                    h(
                      Badge,
                      { variant: "outline" },
                      () => `+${row.original.assignment.roles.length - 3}`,
                    ),
                  ]
                : [],
            ),
        ),
      meta: { title: "Vai trò" },
    },
    {
      id: "userIsActive",
      header: ({ column }) => sortableHeader(column, "Tài khoản"),
      enableSorting: true,
      cell: ({ row }) =>
        h(
          "span",
          {
            class: row.original.isActive
              ? "text-emerald-700"
              : "text-destructive",
          },
          row.original.isActive ? "● Đang hoạt động" : "● Đã khóa",
        ),
      meta: { title: "Tài khoản" },
    },
    {
      id: "assignmentIsActive",
      header: ({ column }) => sortableHeader(column, "Phân công"),
      enableSorting: true,
      cell: ({ row }) =>
        row.original.assignment.isActive ? "Đang hoạt động" : "Ngừng hoạt động",
      meta: { title: "Phân công" },
    },
    {
      id: "isPrimary",
      header: ({ column }) => sortableHeader(column, "Chi nhánh chính"),
      enableSorting: true,
      cell: ({ row }) => (row.original.assignment.isPrimary ? "Có" : "Không"),
      meta: { title: "Chi nhánh chính" },
    },
    {
      id: "assignedAt",
      header: ({ column }) => sortableHeader(column, "Ngày phân công"),
      enableSorting: true,
      cell: ({ row }) => formatStaffDate(row.original.assignment.assignedAt),
      meta: { title: "Ngày phân công" },
    },
    {
      id: "roleId",
      accessorFn: () => undefined,
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
