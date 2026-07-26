import axios from 'axios'
import type { ErrorResponseDto } from '@/api/generated/models'

const messages: Record<string, string> = {
  PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm.',
  PRODUCT_NAME_ALREADY_EXISTS_IN_SCOPE: 'Tên sản phẩm đã tồn tại trong cùng phạm vi.',
  PRODUCT_DELETE_REQUIRES_DRAFT: 'Chỉ có thể xóa sản phẩm ở trạng thái bản nháp.',
  PRODUCT_DELETE_BLOCKED_BY_REFERENCES: 'Không thể xóa vì sản phẩm đang có dữ liệu nghiệp vụ tham chiếu.',
  PRODUCT_MEDIA_REQUIRED: 'Chưa có ảnh chung của sản phẩm.',
  PRODUCT_MEDIA_PRIMARY_REQUIRED: 'Chưa đặt đúng một ảnh đại diện cho mỗi bộ sưu tập.',
  PRODUCT_MEDIA_CONFIGURATION_INVALID: 'Cấu hình ảnh sản phẩm không hợp lệ.',
  PRODUCT_MEDIA_VARIANT_SCOPE_MISMATCH: 'Ảnh biến thể không thuộc sản phẩm này.',
  PRODUCT_MEDIA_NOT_FOUND: 'Không tìm thấy ảnh sản phẩm.',
  PRODUCT_MEDIA_GALLERY_LIMIT_EXCEEDED: 'Bộ sưu tập đã đạt giới hạn ảnh.',
  PRODUCT_MEDIA_REORDER_INVALID: 'Thứ tự ảnh không còn khớp dữ liệu hiện tại. Vui lòng tải lại.',
  PRODUCT_MEDIA_DELETE_BLOCKED_ACTIVE: 'Không thể xóa ảnh chung cuối cùng khi sản phẩm đang hoạt động.',
  PRODUCT_MEDIA_INVALID_FILE: 'Tệp không phải ảnh JPEG, PNG hoặc WebP hợp lệ.',
  PRODUCT_OPTION_VALUE_IMAGE_SCOPE_MISMATCH: 'Thumbnail không thuộc giá trị lựa chọn của sản phẩm này.',
  STORAGE_UPLOAD_FAILED: 'Không thể kết nối kho ảnh. Vui lòng thử lại.',
  PRODUCT_OPTION_CODE_ALREADY_EXISTS: 'Mã lựa chọn đã tồn tại trong sản phẩm.',
  PRODUCT_OPTION_CODE_IMMUTABLE_WHEN_USED: 'Không thể đổi mã lựa chọn đang được biến thể sử dụng.',
  PRODUCT_OPTION_IN_USE: 'Không thể xóa lựa chọn đang được biến thể sử dụng.',
  PRODUCT_OPTION_VALUE_ALREADY_EXISTS: 'Giá trị kỹ thuật đã tồn tại.',
  PRODUCT_OPTION_VALUE_IMMUTABLE_WHEN_USED: 'Không thể đổi giá trị kỹ thuật đang được sử dụng.',
  PRODUCT_OPTION_VALUE_IN_USE: 'Không thể xóa giá trị đang được biến thể sử dụng.',
  PRODUCT_VARIANT_SKU_ALREADY_EXISTS: 'SKU đã tồn tại.',
  PRODUCT_VARIANT_COMBINATION_ALREADY_EXISTS: 'Tổ hợp biến thể đã tồn tại.',
  PRODUCT_VARIANT_INCOMPLETE_OPTIONS: 'Biến thể phải chọn đúng một giá trị của mỗi lựa chọn.',
  PRODUCT_VARIANT_OPTION_VALUE_SCOPE_MISMATCH: 'Giá trị lựa chọn không thuộc sản phẩm này.',
  PRODUCT_VARIANT_MATRIX_TOO_LARGE: 'Số tổ hợp biến thể vượt quá giới hạn 200.',
  PRODUCT_DEFAULT_VARIANT_REQUIRED: 'Sản phẩm cần đúng một biến thể mặc định đang hoạt động.',
  PRODUCT_PRICE_INVALID: 'Giá biến thể không hợp lệ.',
  PRODUCT_SALE_PERIOD_INVALID: 'Thời gian khuyến mãi không hợp lệ.',
  PRODUCT_ATTRIBUTE_VALUE_INVALID: 'Giá trị thuộc tính mô tả không hợp lệ.',
  PRODUCT_PRIMARY_CATEGORY_REQUIRED: 'Vui lòng chọn danh mục chính.',
  PRODUCT_PRIMARY_CATEGORY_INVALID: 'Danh mục chính phải thuộc danh sách danh mục đã chọn.',
}

export function productErrorCode(error: unknown): string | undefined {
  return axios.isAxiosError<ErrorResponseDto>(error) ? error.response?.data.code : undefined
}

export function productErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return fallback
  if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  const code = error.response?.data.code
  return (code && messages[code]) || error.response?.data.message || fallback
}

export function productReadErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return 'Không có quyền xem sản phẩm tại chi nhánh đang chọn.'
  }
  return productErrorMessage(error, fallback)
}

export function productFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return {}
  if (error.response?.data.code === 'PRODUCT_PRIMARY_CATEGORY_REQUIRED') {
    return { primaryCategoryId: 'Vui lòng chọn danh mục chính.' }
  }
  if (error.response?.data.code === 'PRODUCT_PRIMARY_CATEGORY_INVALID') {
    return { primaryCategoryId: 'Danh mục chính phải thuộc danh sách danh mục đã chọn.' }
  }
  const fields = error.response?.data.errors
  if (!fields) return {}
  return Object.fromEntries(
    Object.entries(fields)
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0)
      .map(([field, fieldMessages]) => [field, fieldMessages[0]!]),
  )
}
