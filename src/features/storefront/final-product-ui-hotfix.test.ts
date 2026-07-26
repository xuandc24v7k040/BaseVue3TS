import { describe, expect, it } from 'vitest'
import detailSource from '@/pages/app/catalog/BookDetailPage.vue?raw'
import apiSource from './api/storefront-api.ts?raw'

describe('final product UI hotfix contract', () => {
  it('hides the entire variant block only for a structural SIMPLE product', () => {
    expect(detailSource).toContain('product.value?.options.length === 0')
    expect(detailSource).toContain('product.value.variants.length === 1')
    expect(detailSource).toContain('<template v-if="!isSimpleProduct">')
    expect(detailSource).not.toContain(
      ':model-value="selectedVariantId ?? selectedVariant.id"',
    )
  })

  it('keeps OPTIONED variant rendering and batch branch availability wiring', () => {
    expect(detailSource).toContain('<ProductVariantSelector')
    expect(detailSource).toContain(':variant-quantities="variantQuantities"')
    expect(detailSource).toContain(':availability-state="availabilityState"')
    expect(apiSource).toContain('"storefront-availability"')
    expect(apiSource).toContain('branchId')
    expect(apiSource).toContain('productId')
    expect(apiSource).not.toContain('unref(params).variantId')
  })
})
