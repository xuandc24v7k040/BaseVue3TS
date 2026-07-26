import { h } from "vue";
import type { Column, ColumnDef } from "@tanstack/vue-table";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import { formatDateTime } from "@/lib/date-format";
import { isBranchAdminAssignment } from "../types";
import type { BranchAdmin } from "../types";

function sortableHeader(column: Column<BranchAdmin, unknown>, title: string) {
  return h(DataTableColumnHeader<BranchAdmin>, {
    column,
    title,
    mode: { type: "sort" },
  });
}

export function formatBranchAdminDate(value: string): string {
  return formatDateTime(value);
}

export function createBranchAdminColumns(): ColumnDef<BranchAdmin, unknown>[] {
  return [
    {
      accessorKey: "fullName",
      header: ({ column }) => sortableHeader(column, "Quản trị viên"),
      enableSorting: true,
      cell: ({ row }) =>
        h(
          "span",
          {
            class: "block min-w-0 max-w-64 truncate font-medium",
            title: row.original.fullName,
          },
          row.original.fullName,
        ),
      meta: { title: "Quản trị viên" },
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
      id: "isActive",
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
      id: "primaryBranch",
      header: ({ column }) => sortableHeader(column, "Chi nhánh chính"),
      enableSorting: true,
      cell: ({ row }) => {
        const primary = row.original.userBranches.find(
          (item) => isBranchAdminAssignment(item) && item.isPrimary,
        );
        return primary
          ? h(
              "span",
              { class: "block max-w-52 truncate", title: primary.branch.name },
              primary.branch.name,
            )
          : "Chưa có";
      },
      meta: { title: "Chi nhánh chính" },
    },
    {
      id: "assignments",
      header: ({ column }) => sortableHeader(column, "Phân công"),
      enableSorting: true,
      cell: ({ row }) => {
        const assignments = row.original.userBranches.filter(
          isBranchAdminAssignment,
        );
        return `${assignments.filter((item) => item.isActive).length}/${assignments.length} hoạt động`;
      },
      meta: { title: "Phân công" },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => sortableHeader(column, "Ngày tạo"),
      enableSorting: true,
      cell: ({ row }) => formatBranchAdminDate(row.original.createdAt),
      meta: { title: "Ngày tạo" },
    },
    {
      id: "assignmentState",
      accessorFn: () => undefined,
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "assignedBranchId",
      accessorFn: () => undefined,
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
