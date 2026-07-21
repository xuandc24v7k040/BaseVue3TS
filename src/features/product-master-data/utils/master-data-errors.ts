import axios from 'axios'
import type { ErrorResponseDto } from '@/api/generated/models'

const messages: Record<string, string> = {
  SUPPLIER_NOT_FOUND: 'Không tìm thấy nhà cung cấp.',
  SUPPLIER_NAME_ALREADY_EXISTS: 'Tên nhà cung cấp đã tồn tại.',
  SUPPLIER_SLUG_ALREADY_EXISTS: 'Tên nhà cung cấp tạo ra đường dẫn đã tồn tại.',
  SUPPLIER_IN_USE: 'Không thể xóa vì nhà cung cấp đang được sản phẩm sử dụng.',
  PUBLISHER_NOT_FOUND: 'Không tìm thấy nhà xuất bản.',
  PUBLISHER_NAME_ALREADY_EXISTS: 'Tên nhà xuất bản đã tồn tại.',
  PUBLISHER_SLUG_ALREADY_EXISTS:
    'Tên nhà xuất bản tạo ra đường dẫn đã tồn tại.',
  PUBLISHER_IN_USE: 'Không thể xóa vì nhà xuất bản đang được sản phẩm sử dụng.',
  AUTHOR_NOT_FOUND: 'Không tìm thấy tác giả.',
  AUTHOR_NAME_ALREADY_EXISTS: 'Tên tác giả đã tồn tại.',
  AUTHOR_SLUG_ALREADY_EXISTS: 'Tên tác giả tạo ra đường dẫn đã tồn tại.',
  AUTHOR_IN_USE: 'Không thể xóa vì tác giả đang được gắn với sản phẩm.',
  PRODUCT_ATTRIBUTE_NOT_FOUND: 'Không tìm thấy thuộc tính sản phẩm.',
  PRODUCT_ATTRIBUTE_NAME_ALREADY_EXISTS: 'Tên thuộc tính đã tồn tại.',
  PRODUCT_ATTRIBUTE_CODE_ALREADY_EXISTS: 'Mã thuộc tính đã tồn tại.',
  PRODUCT_ATTRIBUTE_IN_USE:
    'Không thể xóa vì thuộc tính đang có giá trị trên sản phẩm.',
  PRODUCT_ATTRIBUTE_CODE_CHANGE_REQUIRES_UNUSED:
    'Không thể đổi mã khi thuộc tính đang được sử dụng.',
  PRODUCT_ATTRIBUTE_TYPE_CHANGE_REQUIRES_UNUSED:
    'Không thể đổi kiểu dữ liệu khi thuộc tính đang được sử dụng.',
}

export function masterDataErrorCode(error: unknown): string | undefined {
  return axios.isAxiosError<ErrorResponseDto>(error)
    ? error.response?.data.code
    : undefined
}

export function masterDataErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return fallback
  if (error.response?.status === 403)
    return 'Bạn không có quyền thực hiện thao tác này.'
  const code = error.response?.data.code
  return (code && messages[code]) || error.response?.data.message || fallback
}
