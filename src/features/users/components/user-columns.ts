import { h } from 'vue'
import type { Column, ColumnDef } from '@tanstack/vue-table'
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue'
import type { User } from '../types'
import { formatUserDateTime, userProviderLabel, userTypeLabel } from '../utils/user-labels'
import UserStatusBadge from './UserStatusBadge.vue'

function header(column: Column<User, unknown>, title: string) {
  return h(DataTableColumnHeader<User>, { column, title, mode: { type: 'sort' } })
}

function textCell(value: string | null | undefined, className = '') {
  const label = value || '—'
  return h('span', { class: `block w-full truncate ${className}`, title: label }, label)
}

export function createUserColumns(): ColumnDef<User, unknown>[] {
  return [
    {
      accessorKey: 'fullName',
      header: ({ column }) => header(column, 'Người dùng'),
      cell: ({ row }) => textCell(row.original.fullName || row.original.email, 'font-medium'),
      meta: { title: 'Người dùng' },
      size: 220,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => header(column, 'Email'),
      cell: ({ row }) => textCell(row.original.email),
      meta: { title: 'Email' },
      size: 240,
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => header(column, 'Số điện thoại'),
      cell: ({ row }) => textCell(row.original.phone),
      meta: { title: 'Số điện thoại' },
      size: 150,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => header(column, 'Loại tài khoản'),
      cell: ({ row }) => textCell(userTypeLabel(row.original.type)),
      meta: { title: 'Loại tài khoản' },
      size: 170,
    },
    {
      accessorKey: 'provider',
      header: ({ column }) => header(column, 'Nhà cung cấp'),
      cell: ({ row }) => textCell(userProviderLabel(row.original.provider)),
      enableHiding: false,
      meta: { title: 'Nhà cung cấp' },
      size: 170,
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => header(column, 'Trạng thái'),
      cell: ({ row }) => h(UserStatusBadge, { active: row.original.isActive }),
      meta: { title: 'Trạng thái' },
      size: 160,
    },
    {
      accessorKey: 'lastLoginAt',
      header: ({ column }) => header(column, 'Đăng nhập gần nhất'),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatUserDateTime(row.original.lastLoginAt)),
      meta: { title: 'Đăng nhập gần nhất' },
      size: 180,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => header(column, 'Ngày tạo'),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatUserDateTime(row.original.createdAt)),
      meta: { title: 'Ngày tạo' },
      size: 180,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => header(column, 'Ngày cập nhật'),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatUserDateTime(row.original.updatedAt)),
      meta: { title: 'Ngày cập nhật' },
      size: 180,
    },
  ]
}
