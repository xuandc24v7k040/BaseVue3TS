import type { ProductAttributeResponseDtoType } from '@/api/generated/models'
import { formatDateTime } from '@/lib/date-format'

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

export function formatAdminDate(
  value: string | Date | null | undefined,
): string {
  return formatDateTime(value)
}
