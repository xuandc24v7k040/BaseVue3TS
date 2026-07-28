import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { PublicProductDetailDto, PublicVariantDto } from '@/api/generated/models'
import { useVariantSelection } from './use-variant-selection'

function variant(id: string, isDefault: boolean): PublicVariantDto {
  return {
    id,
    name: id,
    isDefault,
    price: {
      current: 100_000,
      original: 100_000,
      onSale: false,
      discountPercent: 0,
    },
    isbn: null,
    publicationYear: null,
    pageCount: null,
    weightGram: null,
    packageSize: null,
    optionValues: [],
    media: [],
  }
}

function product(variants: PublicVariantDto[]): PublicProductDetailDto {
  return {
    id: 'product',
    name: 'Sách',
    slug: 'sach',
    shortDescription: null,
    description: null,
    releaseDate: null,
    averageRating: null,
    reviewCount: 0,
    categories: [],
    authors: [],
    publisher: null,
    generalMedia: [],
    options: [],
    variants,
    attributes: [],
    relatedProducts: [],
    seo: {
      title: 'Sách',
      description: 'Sách',
      canonicalPath: '/books/sach',
      imageUrl: null,
    },
  }
}

describe('useVariantSelection', () => {
  it('keeps, reconciles, and clears the selected variant as branch stock changes', async () => {
    const hard = variant('hard', true)
    const soft = variant('soft', false)
    const currentProduct = ref<PublicProductDetailDto | null>(
      product([hard, soft]),
    )
    const quantities = ref<Readonly<Record<string, number>> | null>(null)
    const selection = useVariantSelection(currentProduct, quantities)

    expect(selection.selectedVariantId.value).toBe('hard')

    quantities.value = { hard: 5, soft: 2 }
    await nextTick()
    expect(selection.selectedVariantId.value).toBe('hard')

    quantities.value = { hard: 0, soft: 2 }
    await nextTick()
    expect(selection.selectedVariantId.value).toBe('soft')

    quantities.value = { hard: 0, soft: 0 }
    await nextTick()
    expect(selection.selectedVariantId.value).toBeNull()
    expect(selection.selectedVariant.value).toBeNull()
    expect(selection.displayedVariant.value?.id).toBe('hard')

    quantities.value = { hard: 4, soft: 0 }
    await nextTick()
    expect(selection.selectedVariantId.value).toBe('hard')
  })

  it('does not select a variant whose stock is unknown or zero', async () => {
    const hard = variant('hard', true)
    const soft = variant('soft', false)
    const currentProduct = ref<PublicProductDetailDto | null>(
      product([hard, soft]),
    )
    const quantities = ref<Readonly<Record<string, number>> | null>(null)
    const selection = useVariantSelection(currentProduct, quantities)

    selection.selectVariant('soft')
    expect(selection.selectedVariantId.value).toBe('hard')

    quantities.value = { hard: 3, soft: 0 }
    await nextTick()
    selection.selectVariant('soft')
    expect(selection.selectedVariantId.value).toBe('hard')
  })
})
