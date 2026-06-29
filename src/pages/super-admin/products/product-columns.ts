import { h } from 'vue'
import type { Column } from '@tanstack/vue-table'
import { Badge } from '@/components/ui/badge'
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue'
import {
  defineDataTableColumns,
  type ColumnHeaderMode,
} from '@/components/admin/table/interface'
import type { DummyJsonProductRow } from '@/components/admin/table/examples/sources/dummyjson'

export type ProductTableRow = DummyJsonProductRow

type StockBadgeVariant = 'active' | 'invited' | 'removed'

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function renderProductColumnHeader(
  column: Column<ProductTableRow, unknown>,
  title: string,
  mode: ColumnHeaderMode = { type: 'sort' },
) {
  return h(DataTableColumnHeader<ProductTableRow>, {
    column,
    title,
    mode,
  })
}

function getStockState(row: ProductTableRow): { label: string; variant: StockBadgeVariant } {
  if (row.stock <= 0) return { label: 'Out of stock', variant: 'removed' }
  if (row.stock <= 10) return { label: 'Low stock', variant: 'invited' }
  return { label: 'In stock', variant: 'active' }
}

function getPriceRange(price: number): string {
  if (price < 50) return 'under-50'
  if (price <= 100) return '50-100'
  if (price <= 500) return '100-500'
  return 'over-500'
}

function getRatingRange(rating: number): string {
  if (rating >= 4.5) return '4.5-up'
  if (rating >= 4) return '4-4.49'
  if (rating >= 3) return '3-3.99'
  return 'under-3'
}

function getDiscountRange(discount: number): string {
  if (discount <= 0) return 'none'
  if (discount < 10) return 'under-10'
  if (discount <= 20) return '10-20'
  return 'over-20'
}

function getStockStatusValue(stock: number): string {
  if (stock <= 0) return 'out-of-stock'
  if (stock <= 10) return 'low-stock'
  return 'in-stock'
}

export const productColumns = defineDataTableColumns<ProductTableRow>([
  {
    accessorKey: 'id',
    size: 72,
    header: ({ column }) => renderProductColumnHeader(column, 'ID'),
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-muted-foreground' }, String(row.original.id)),
    meta: { title: 'ID' },
  },
  {
    accessorKey: 'title',
    size: 300,
    header: ({ column }) => renderProductColumnHeader(column, 'Product'),
    cell: ({ row }) => {
      const product = row.original

      return h('div', { class: 'flex min-w-60 items-center gap-3' }, [
        product.thumbnail
          ? h('img', {
              src: product.thumbnail,
              alt: product.title,
              class: 'h-10 w-10 rounded-md border bg-muted object-cover',
              loading: 'lazy',
            })
          : h('div', { class: 'h-10 w-10 rounded-md border bg-muted' }),
        h('div', { class: 'min-w-0 space-y-0.5' }, [
          h('p', { class: 'truncate font-medium text-foreground' }, product.title),
          h(
            'p',
            { class: 'truncate text-xs text-muted-foreground' },
            `${product.discountPercentage.toFixed(1)}% discount`,
          ),
        ]),
      ])
    },
    meta: { title: 'Product' },
  },
  {
    accessorKey: 'category',
    size: 160,
    header: ({ column }) => renderProductColumnHeader(column, 'Category'),
    cell: ({ row }) =>
      h('span', { class: 'capitalize text-muted-foreground' }, row.original.category),
    meta: { title: 'Category' },
  },
  {
    accessorKey: 'brand',
    size: 180,
    header: ({ column }) => renderProductColumnHeader(column, 'Brand'),
    cell: ({ row }) => h('span', { class: 'text-muted-foreground' }, row.original.brand),
    meta: { title: 'Brand' },
  },
  {
    accessorKey: 'price',
    size: 120,
    header: ({ column }) => renderProductColumnHeader(column, 'Price'),
    cell: ({ row }) =>
      h('span', { class: 'font-mono font-medium' }, usdFormatter.format(row.original.price)),
    meta: { title: 'Price' },
  },
  {
    accessorKey: 'rating',
    size: 100,
    header: ({ column }) => renderProductColumnHeader(column, 'Rating'),
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-muted-foreground' }, row.original.rating.toFixed(1)),
    meta: { title: 'Rating' },
  },
  {
    accessorKey: 'stock',
    size: 100,
    header: ({ column }) => renderProductColumnHeader(column, 'Stock'),
    cell: ({ row }) => h('span', { class: 'font-mono' }, String(row.original.stock)),
    meta: { title: 'Stock' },
  },
  {
    accessorKey: 'availabilityStatus',
    size: 140,
    header: ({ column }) => renderProductColumnHeader(column, 'Status'),
    cell: ({ row }) => {
      const stockState = getStockState(row.original)

      return h(Badge, { variant: stockState.variant }, () => stockState.label)
    },
    meta: { title: 'Status' },
  },
  {
    id: 'priceRange',
    accessorFn: (row) => getPriceRange(row.price),
    enableHiding: false,
    enableSorting: false,
    meta: { title: 'Price range' },
  },
  {
    id: 'ratingRange',
    accessorFn: (row) => getRatingRange(row.rating),
    enableHiding: false,
    enableSorting: false,
    meta: { title: 'Rating range' },
  },
  {
    id: 'stockStatus',
    accessorFn: (row) => getStockStatusValue(row.stock),
    enableHiding: false,
    enableSorting: false,
    meta: { title: 'Stock status' },
  },
  {
    id: 'discountRange',
    accessorFn: (row) => getDiscountRange(row.discountPercentage),
    enableHiding: false,
    enableSorting: false,
    meta: { title: 'Discount range' },
  },
])
