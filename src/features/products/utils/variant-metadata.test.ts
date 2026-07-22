import { describe, expect, it } from 'vitest'
import type { ProductVariantResponseDto } from '@/api/generated/models'
import {
  selectedVariantMetadata,
  validateVariantMetadata,
  variantMetadataPayload,
  type VariantMetadataDraft,
} from './variant-metadata'

const draft: VariantMetadataDraft = {
  isbn: ' 978-604 ', barcode: '', publicationYear: '2026', pageCount: '0', weightGram: '250', packageSize: '',
}

describe('variant metadata helpers', () => {
  it('hydrates only non-null fields and preserves numeric zero', () => {
    const variant = {
      isbn: null,
      barcode: '893',
      publicationYear: null,
      pageCount: 0,
      weightGram: null,
      packageSize: null,
    } as ProductVariantResponseDto
    expect(selectedVariantMetadata(variant)).toEqual(['barcode', 'pageCount'])
  })

  it('emits null for removed metadata and normalized values for selected fields', () => {
    expect(variantMetadataPayload(draft, ['isbn', 'publicationYear', 'pageCount'])).toEqual({
      isbn: '978-604',
      barcode: null,
      publicationYear: 2026,
      pageCount: 0,
      weightGram: null,
      packageSize: null,
    })
  })

  it('validates integer ranges in Vietnamese', () => {
    expect(validateVariantMetadata({ ...draft, publicationYear: '10000' }, ['publicationYear']))
      .toBe('Năm xuất bản không được lớn hơn 9999.')
    expect(validateVariantMetadata({ ...draft, weightGram: '-1' }, ['weightGram']))
      .toBe('Khối lượng (gram) không được nhỏ hơn 0.')
  })
})
