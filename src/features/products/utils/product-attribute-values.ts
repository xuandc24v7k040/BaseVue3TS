import type {
  ProductAttributeResponseDto,
  ProductAttributeValueInputDto,
} from '@/api/generated/models'

export type ProductAttributeDefinition = Pick<
  ProductAttributeResponseDto,
  'id' | 'name' | 'code' | 'type'
>

export type ProductAttributeFormValue = string | number | boolean | string[]

export function serializeProductAttributeValues(
  selected: ProductAttributeDefinition[],
  values: Record<string, ProductAttributeFormValue | null | undefined>,
): ProductAttributeValueInputDto[] {
  return selected.flatMap((attribute) => {
    const value = normalizeAttributeValue(attribute, values[attribute.id])
    return value === undefined ? [] : [{ attributeId: attribute.id, value }]
  })
}

export function defaultProductAttributeValue(
  attribute: ProductAttributeDefinition,
): ProductAttributeFormValue {
  return attribute.type === 'BOOLEAN' ? false : ''
}

function normalizeAttributeValue(
  attribute: ProductAttributeDefinition,
  value: ProductAttributeFormValue | null | undefined,
): ProductAttributeFormValue | undefined {
  if (value === undefined || value === null) return undefined
  if (attribute.type === 'BOOLEAN') return typeof value === 'boolean' ? value : undefined
  if (attribute.type === 'NUMBER') {
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return undefined
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
  }
  if (attribute.type === 'MULTI_SELECT') {
    const items = (Array.isArray(value) ? value : String(value).split(','))
      .map((item) => item.trim())
      .filter(Boolean)
    return items.length ? [...new Set(items)] : undefined
  }
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized || undefined
}
