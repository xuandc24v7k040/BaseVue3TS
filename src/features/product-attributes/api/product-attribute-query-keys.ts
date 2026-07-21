import type { ProductAttributesListParams } from '@/api/generated/models'
export const productAttributeKeys = {
  all: ['product-attributes'] as const,
  list: (p: ProductAttributesListParams) =>
    ['product-attributes', 'list', p] as const,
  detail: (id: string) => ['product-attributes', 'detail', id] as const,
}
