import axios from "axios";
import type { ErrorResponseDto } from "@/api/generated/models";

const messages: Record<string, string> = {
  CATEGORY_NOT_FOUND: "Không tìm thấy danh mục.",
  CATEGORY_NAME_CONFLICT: "Tên danh mục đã tồn tại.",
  CATEGORY_NAME_ALREADY_EXISTS:
    "Tên danh mục đã tồn tại trong cùng phạm vi. Vui lòng chọn tên khác.",
  CATEGORY_SLUG_CONFLICT: "Không thể tạo định danh duy nhất cho tên này.",
  CATEGORY_SLUG_ALREADY_EXISTS: "Tên danh mục đã tồn tại.",
  CATEGORY_PARENT_NOT_FOUND: "Không tìm thấy danh mục cha.",
  CATEGORY_PARENT_MUST_BE_ROOT: "Chỉ danh mục gốc mới có thể làm danh mục cha.",
  CATEGORY_PARENT_TYPE_MISMATCH: "Danh mục cha phải cùng loại với danh mục con.",
  CATEGORY_MAX_DEPTH_EXCEEDED: "Cây danh mục chỉ hỗ trợ tối đa hai cấp.",
  CATEGORY_TYPE_CHANGE_REQUIRES_DETACHED_NODE:
    "Không thể đổi loại khi danh mục vẫn còn liên kết cha hoặc con.",
  CATEGORY_CYCLE: "Không thể chọn chính danh mục này làm cha.",
  CATEGORY_HAS_CHILDREN: "Không thể xóa danh mục đang có danh mục con.",
  CATEGORY_HAS_PRODUCTS: "Không thể xóa danh mục đang có sản phẩm.",
  CATEGORY_IN_USE: "Không thể xóa danh mục đang được sử dụng.",
  CATEGORY_IMAGE_TOO_LARGE: "Ảnh vượt quá dung lượng 5 MB.",
  CATEGORY_IMAGE_INVALID_TYPE: "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.",
  CATEGORY_IMAGE_INVALID_DIMENSIONS: "Kích thước ảnh không hợp lệ.",
  CATEGORY_IMAGE_PROCESSING_FAILED: "Không thể xử lý ảnh đã chọn.",
  STORAGE_UPLOAD_FAILED: "Không thể tải ảnh lên kho lưu trữ.",
  STORAGE_UNAVAILABLE: "Kho lưu trữ ảnh đang tạm thời không khả dụng.",
};

export function categoryErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return undefined;
  return error.response?.data.code;
}

export function categoryErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return fallback;
  const response = error.response;
  if (response?.status === 403)
    return "Bạn không có quyền thực hiện thao tác này.";
  return (
    (response?.data.code && messages[response.data.code]) ||
    response?.data.message ||
    fallback
  );
}
