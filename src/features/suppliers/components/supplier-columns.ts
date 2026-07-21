import { h } from 'vue'
import type { Column, ColumnDef } from '@tanstack/vue-table'
import type { SupplierResponseDto } from '@/api/generated/models'
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue'
import { formatAdminDate } from '@/features/product-master-data/utils/master-data-labels'
const head = (column: Column<SupplierResponseDto, unknown>, title: string) =>
  h(DataTableColumnHeader<SupplierResponseDto>, {
    column,
    title,
    mode: { type: 'sort' },
  })
const text = (value: string | null | undefined) =>
  h('span', { class: 'block truncate', title: value ?? '—' }, value || '—')
export function createSupplierColumns(): ColumnDef<
  SupplierResponseDto,
  unknown
>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => head(column, 'Tên nhà cung cấp'),
      cell: ({ row }) =>
        h(
          'span',
          { class: 'block truncate font-medium', title: row.original.name },
          row.original.name,
        ),
      meta: { title: 'Tên nhà cung cấp' },
      size: 260,
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => head(column, 'Số điện thoại'),
      cell: ({ row }) => text(row.original.phone),
      meta: { title: 'Số điện thoại' },
      size: 170,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => head(column, 'Email'),
      cell: ({ row }) => text(row.original.email),
      meta: { title: 'Email' },
      size: 240,
    },
    {
      accessorKey: 'address',
      header: ({ column }) => head(column, 'Địa chỉ'),
      cell: ({ row }) => text(row.original.address),
      meta: { title: 'Địa chỉ' },
      size: 300,
    },
    {
      accessorKey: 'usageCount',
      header: ({ column }) => head(column, 'Số sản phẩm sử dụng'),
      meta: { title: 'Số sản phẩm sử dụng' },
      size: 175,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => head(column, 'Ngày tạo'),
      cell: ({ row }) => formatAdminDate(row.original.createdAt),
      meta: { title: 'Ngày tạo' },
      size: 175,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => head(column, 'Cập nhật gần nhất'),
      cell: ({ row }) => formatAdminDate(row.original.updatedAt),
      meta: { title: 'Cập nhật gần nhất' },
      size: 185,
    },
  ]
}
