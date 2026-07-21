import { describe, expect, it } from 'vitest'
import { createProductColumns } from './product-columns'

describe('product list columns', () => {
  it('shows business fields without leaking slug or ULID columns', () => {
    const columns = createProductColumns()
    const ids = columns.map((column) => 'id' in column ? column.id : 'accessorKey' in column ? column.accessorKey : undefined)
    expect(ids).toEqual(expect.arrayContaining(['name', 'categories', 'publisher', 'supplier', 'authors', 'defaultSku', 'priceRange', 'variantCount', 'status']))
    expect(ids).not.toContain('id')
    expect(ids).not.toContain('slug')
    expect(ids).not.toContain('combinationKey')
  })
})
