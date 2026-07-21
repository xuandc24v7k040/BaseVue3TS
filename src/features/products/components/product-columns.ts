import { h } from 'vue'
import type { Column, ColumnDef } from '@tanstack/vue-table'
import type { ProductListItemResponseDto } from '@/api/generated/models'
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue'
import { formatAdminDate } from '@/features/product-master-data/utils/master-data-labels'
import { formatProductPriceRange } from '../utils/product-money'

const head = (column: Column<ProductListItemResponseDto, unknown>, title: string, sortable = true) => h(DataTableColumnHeader<ProductListItemResponseDto>, { column, title, mode: sortable ? { type: 'sort' } : { type: 'none' } })
const summary = (items: Array<{ name: string }>, empty = '—') => {
  const text = items.map((item) => item.name).join(', ') || empty
  return h('span', { class: 'block max-w-60 truncate', title: text }, text)
}

export function createProductColumns(): ColumnDef<ProductListItemResponseDto, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => head(column, 'Tên sản phẩm'),
      cell: ({ row }) => h('span', { class: 'block max-w-72 truncate font-medium', title: row.original.name }, row.original.name),
      meta: { title: 'Tên sản phẩm' }, size: 280,
    },
    {
      id: 'categories', accessorFn: (row) => row.categories.map((item) => item.name).join(', '),
      header: ({ column }) => head(column, 'Danh mục', false), cell: ({ row }) => summary(row.original.categories, 'Chưa gán'),
      meta: { title: 'Danh mục' }, size: 220, enableSorting: false,
    },
    {
      id: 'publisher', accessorFn: (row) => row.publisher?.name ?? '',
      header: ({ column }) => head(column, 'Nhà xuất bản', false), cell: ({ row }) => summary(row.original.publisher ? [row.original.publisher] : []),
      meta: { title: 'Nhà xuất bản' }, size: 200, enableSorting: false,
    },
    {
      id: 'supplier', accessorFn: (row) => row.supplier?.name ?? '',
      header: ({ column }) => head(column, 'Nhà cung cấp', false), cell: ({ row }) => summary(row.original.supplier ? [row.original.supplier] : []),
      meta: { title: 'Nhà cung cấp' }, size: 200, enableSorting: false,
    },
    {
      id: 'authors', accessorFn: (row) => row.authors.map((item) => item.name).join(', '),
      header: ({ column }) => head(column, 'Tác giả', false), cell: ({ row }) => summary(row.original.authors),
      meta: { title: 'Tác giả' }, size: 200, enableSorting: false,
    },
    {
      id: 'defaultSku', accessorFn: (row) => row.defaultVariant?.sku ?? '',
      header: ({ column }) => head(column, 'SKU mặc định', false),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap font-mono text-xs' }, row.original.defaultVariant?.sku ?? '—'),
      meta: { title: 'SKU mặc định' }, size: 180, enableSorting: false,
    },
    {
      id: 'priceRange', accessorFn: (row) => row.minPrice ?? '',
      header: ({ column }) => head(column, 'Khoảng giá', false),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatProductPriceRange(row.original.minPrice, row.original.maxPrice)),
      meta: { title: 'Khoảng giá' }, size: 210, enableSorting: false,
    },
    { accessorKey: 'variantCount', header: ({ column }) => head(column, 'Số biến thể', false), meta: { title: 'Số biến thể' }, size: 120, enableSorting: false },
    { accessorKey: 'activeVariantCount', header: ({ column }) => head(column, 'Đang hoạt động', false), meta: { title: 'Đang hoạt động' }, size: 130, enableSorting: false },
    {
      accessorKey: 'status', header: ({ column }) => head(column, 'Trạng thái'),
      cell: ({ row }) => h('span', { class: `whitespace-nowrap font-medium ${row.original.status === 'ACTIVE' ? 'text-emerald-600' : row.original.status === 'DRAFT' ? 'text-amber-600' : 'text-muted-foreground'}` }, ({ DRAFT: 'Bản nháp', ACTIVE: 'Hoạt động', INACTIVE: 'Tạm ngưng', DISCONTINUED: 'Ngừng kinh doanh' } as const)[row.original.status]),
      meta: { title: 'Trạng thái' }, size: 150,
    },
    {
      accessorKey: 'releaseDate', header: ({ column }) => head(column, 'Ngày phát hành'),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, row.original.releaseDate ? formatAdminDate(row.original.releaseDate) : '—'),
      meta: { title: 'Ngày phát hành' }, size: 165,
    },
    {
      accessorKey: 'createdAt', header: ({ column }) => head(column, 'Ngày tạo'),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatAdminDate(row.original.createdAt)),
      meta: { title: 'Ngày tạo' }, size: 175,
    },
    {
      accessorKey: 'updatedAt', header: ({ column }) => head(column, 'Ngày cập nhật'),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatAdminDate(row.original.updatedAt)),
      meta: { title: 'Ngày cập nhật' }, size: 175,
    },
  ]
}
