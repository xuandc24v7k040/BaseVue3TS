import { toBookoraApiError } from "@/api/http/errors";

const messages: Record<string, string> = {
  STOREFRONT_BRANCH_NOT_FOUND:
    "Không tìm thấy chi nhánh. Vui lòng chọn chi nhánh khác.",
  STOREFRONT_BRANCH_INACTIVE:
    "Chi nhánh không còn hoạt động. Vui lòng chọn chi nhánh khác.",
  PUBLIC_CATEGORY_NOT_FOUND: "Không tìm thấy danh mục.",
  PUBLIC_PRODUCT_NOT_FOUND:
    "Không tìm thấy sản phẩm hoặc sản phẩm đã ngừng kinh doanh.",
  PUBLIC_PRODUCT_VARIANT_NOT_FOUND:
    "Phiên bản đã chọn hiện không còn khả dụng.",
  PUBLIC_PRODUCT_PRICE_RANGE_INVALID: "Khoảng giá không hợp lệ.",
};

export function storefrontErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const normalized = toBookoraApiError(error);
  if (normalized.statusCode === 400 && !normalized.code) {
    return "Bộ lọc không hợp lệ. Vui lòng kiểm tra lại lựa chọn.";
  }
  return messages[normalized.code ?? ""] ?? normalized.message ?? fallback;
}
