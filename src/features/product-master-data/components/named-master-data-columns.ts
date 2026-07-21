import { h } from 'vue'
import type { Column, ColumnDef } from '@tanstack/vue-table'
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue'
import { formatAdminDate } from '../utils/master-data-labels'
export interface NamedMasterDataRow {
  id: string
  name: string
  usageCount: number
  createdAt: string
  updatedAt: string
}
const head = <T extends NamedMasterDataRow>(
  column: Column<T, unknown>,
  title: string,
) => h(DataTableColumnHeader<T>, { column, title, mode: { type: 'sort' } })
export function createNamedMasterDataColumns<T extends NamedMasterDataRow>(
  nameTitle: string,
): ColumnDef<T, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => head(column, nameTitle),
      cell: ({ row }) =>
        h(
          'span',
          { class: 'block truncate font-medium', title: row.original.name },
          row.original.name,
        ),
      meta: { title: nameTitle },
      size: 320,
    },
    {
      accessorKey: 'usageCount',
      header: ({ column }) => head(column, 'Số sản phẩm sử dụng'),
      meta: { title: 'Số sản phẩm sử dụng' },
      size: 180,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => head(column, 'Ngày tạo'),
      cell: ({ row }) => formatAdminDate(row.original.createdAt),
      meta: { title: 'Ngày tạo' },
      size: 180,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => head(column, 'Cập nhật gần nhất'),
      cell: ({ row }) => formatAdminDate(row.original.updatedAt),
      meta: { title: 'Cập nhật gần nhất' },
      size: 190,
    },
  ]
}
