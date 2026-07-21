import type { ProductsListParams } from '@/api/generated/models'

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductsListParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  options: (id: string) => [...productKeys.all, id, 'options'] as const,
  variants: (id: string) => [...productKeys.all, id, 'variants'] as const,
  media: (id: string, variantId?: string | null) => [
    ...productKeys.all,
    id,
    'media',
    variantId ? 'variant' : 'general',
    variantId ?? null,
  ] as const,
  attributes: (id: string) => [...productKeys.all, id, 'attribute-values'] as const,
}
