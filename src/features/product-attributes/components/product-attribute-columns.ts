import { h } from 'vue'
import type { Column, ColumnDef } from '@tanstack/vue-table'
import type { ProductAttributeResponseDto } from '@/api/generated/models'
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue'
import {
  formatAdminDate,
  productAttributeTypeLabel,
} from '@/features/product-master-data/utils/master-data-labels'
const head = (
  column: Column<ProductAttributeResponseDto, unknown>,
  title: string,
) =>
  h(DataTableColumnHeader<ProductAttributeResponseDto>, {
    column,
    title,
    mode: { type: 'sort' },
  })
export function createProductAttributeColumns(): ColumnDef<
  ProductAttributeResponseDto,
  unknown
>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => head(column, 'Tên thuộc tính'),
      cell: ({ row }) =>
        h(
          'span',
          { class: 'block truncate font-medium', title: row.original.name },
          row.original.name,
        ),
      meta: { title: 'Tên thuộc tính' },
      size: 280,
    },
    {
      accessorKey: 'code',
      header: ({ column }) => head(column, 'Mã thuộc tính'),
      cell: ({ row }) =>
        h(
          'code',
          { class: 'rounded bg-muted px-2 py-1 text-xs' },
          row.original.code,
        ),
      meta: { title: 'Mã thuộc tính' },
      size: 190,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => head(column, 'Kiểu dữ liệu'),
      cell: ({ row }) => productAttributeTypeLabel(row.original.type),
      meta: { title: 'Kiểu dữ liệu' },
      size: 170,
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
