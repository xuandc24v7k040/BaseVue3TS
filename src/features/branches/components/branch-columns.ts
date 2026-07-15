import { h } from 'vue'
import type { Column, ColumnDef } from '@tanstack/vue-table'
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue'
import type { Branch } from '../types'
import BranchStatusBadge from './BranchStatusBadge.vue'

function sortableHeader(column: Column<Branch, unknown>, title: string) {
  return h(DataTableColumnHeader<Branch>, { column, title, mode: { type: 'sort' } })
}

export function formatBranchAddress(branch: Branch): string {
  return [branch.address, branch.ward, branch.province].filter(Boolean).join(', ')
}

const branchDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

export function formatBranchDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : branchDateTimeFormatter.format(date)
}

export function createBranchColumns(): ColumnDef<Branch, unknown>[] {
  return [
    {
      accessorKey: 'code',
      header: ({ column }) => sortableHeader(column, 'Mã'),
      cell: ({ row }) => h('span', { class: 'font-mono font-semibold text-primary' }, row.original.code),
      meta: { title: 'Mã' },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => sortableHeader(column, 'Tên chi nhánh'),
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
      meta: { title: 'Tên chi nhánh' },
    },
    {
      accessorKey: 'phone',
      header: 'Số điện thoại',
      enableSorting: false,
      cell: ({ row }) => row.original.phone || '—',
      meta: { title: 'Số điện thoại' },
    },
    {
      id: 'address',
      header: 'Địa chỉ',
      enableSorting: false,
      cell: ({ row }) => h('span', { class: 'block max-w-80 truncate', title: formatBranchAddress(row.original) }, formatBranchAddress(row.original)),
      meta: { title: 'Địa chỉ' },
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => sortableHeader(column, 'Trạng thái'),
      cell: ({ row }) => h(BranchStatusBadge, { active: row.original.isActive }),
      meta: { title: 'Trạng thái' },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => sortableHeader(column, 'Ngày tạo'),
      cell: ({ row }) => formatBranchDateTime(row.original.createdAt),
      meta: { title: 'Ngày tạo' },
    },
  ]
}
