import type { ProductAttributeResponseDtoType } from '@/api/generated/models'

export const PRODUCT_ATTRIBUTE_TYPE_OPTIONS: readonly {
  value: ProductAttributeResponseDtoType
  label: string
}[] = [
  { value: 'TEXT', label: 'Văn bản' },
  { value: 'NUMBER', label: 'Số' },
  { value: 'BOOLEAN', label: 'Đúng / Sai' },
  { value: 'DATE', label: 'Ngày' },
  { value: 'SINGLE_SELECT', label: 'Chọn một' },
  { value: 'MULTI_SELECT', label: 'Chọn nhiều' },
]

export function productAttributeTypeLabel(
  value: ProductAttributeResponseDtoType,
): string {
  return (
    PRODUCT_ATTRIBUTE_TYPE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  )
}

export function formatAdminDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
