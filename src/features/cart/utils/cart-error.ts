import { toBookoraApiError } from "@/api/http/errors";

const CART_ERROR_MESSAGES: Record<string, string> = {
  BRANCH_CONTEXT_REQUIRED: "Vui lòng chọn chi nhánh.",
  CART_BRANCH_INACTIVE: "Chi nhánh không còn hoạt động.",
  CART_PRODUCT_INACTIVE: "Sản phẩm đã ngừng kinh doanh.",
  CART_VARIANT_INACTIVE: "Phiên bản đã chọn không còn khả dụng.",
  CART_ITEM_UNAVAILABLE: "Sản phẩm hoặc phiên bản không còn khả dụng.",
  CART_OUT_OF_STOCK: "Sản phẩm hiện đã hết hàng tại chi nhánh này.",
  CART_QUANTITY_EXCEEDS_STOCK: "Số lượng vượt quá tồn kho hiện tại.",
  CART_ITEM_NOT_FOUND: "Không tìm thấy sản phẩm trong giỏ hàng.",
};

export function cartErrorMessage(
  error: unknown,
  fallback = "Không thể cập nhật giỏ hàng. Vui lòng thử lại.",
): string {
  const normalized = toBookoraApiError(error);
  return CART_ERROR_MESSAGES[normalized.code ?? ""] ?? fallback;
}
