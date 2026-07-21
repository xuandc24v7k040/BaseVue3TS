import { describe, expect, it } from 'vitest'
import type { ColumnDef } from '@tanstack/vue-table'
import type {
  AuthorResponseDto,
  PublisherResponseDto,
} from '@/api/generated/models'
import supplierPage from '@/features/suppliers/pages/SupplierListPage.vue?raw'
import publisherPage from '@/features/publishers/pages/PublisherListPage.vue?raw'
import authorPage from '@/features/authors/pages/AuthorListPage.vue?raw'
import productAttributePage from '@/features/product-attributes/pages/ProductAttributeListPage.vue?raw'
import { createSupplierColumns } from '@/features/suppliers/components/supplier-columns'
import { createProductAttributeColumns } from '@/features/product-attributes/components/product-attribute-columns'
import { createNamedMasterDataColumns } from './components/named-master-data-columns'

function columnIds<T>(columns: ColumnDef<T, unknown>[]): Set<string> {
  return new Set(
    columns.flatMap((column) => {
      if ('accessorKey' in column && typeof column.accessorKey === 'string') {
        return [column.accessorKey]
      }
      return typeof column.id === 'string' ? [column.id] : []
    }),
  )
}

function configuredColumnIds(source: string): string[] {
  const filterBlock = source.match(
    /const filters:[\s\S]*?(?:const dates|,\s*dates:)/,
  )?.[0]
  const globalSearchBlock = source.match(/:global-search="\{[\s\S]*?\}"/)?.[0]
  const dateBlock = source.match(
    /(?:const dates|dates:)\s*:[\s\S]*?(?:function|;\s*function)/,
  )?.[0]
  const ids = [filterBlock, globalSearchBlock, dateBlock].flatMap((block) =>
    block ? [...block.matchAll(/(?:id:\s*|columnIds:\s*\[)(?:\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]!) : [],
  )
  return [...new Set(ids)]
}

const cases: Array<{
  name: string
  source: string
  columns: ColumnDef<unknown, unknown>[]
}> = [
  {
    name: 'suppliers',
    source: supplierPage,
    columns: createSupplierColumns() as ColumnDef<unknown, unknown>[],
  },
  {
    name: 'publishers',
    source: publisherPage,
    columns: createNamedMasterDataColumns<PublisherResponseDto>('Tên') as ColumnDef<
      unknown,
      unknown
    >[],
  },
  {
    name: 'authors',
    source: authorPage,
    columns: createNamedMasterDataColumns<AuthorResponseDto>('Tên') as ColumnDef<
      unknown,
      unknown
    >[],
  },
  {
    name: 'product-attributes',
    source: productAttributePage,
    columns: createProductAttributeColumns() as ColumnDef<unknown, unknown>[],
  },
]

describe('Phase 10A DataTable configuration', () => {
  it.each(cases)('$name only configures filters for real columns', ({ source, columns }) => {
    const actualIds = columnIds(columns)
    expect(configuredColumnIds(source).filter((id) => !actualIds.has(id))).toEqual(
      [],
    )
  })

  it('maps server query names without exposing them as missing table columns', () => {
    expect(supplierPage).toContain("usageCount: 'usageStatus'")
    expect(supplierPage).toContain("phone: 'hasPhone'")
    expect(supplierPage).toContain("email: 'hasEmail'")
    for (const source of [publisherPage, authorPage, productAttributePage]) {
      expect(source).toContain("usageCount: 'usageStatus'")
    }
  })
})
