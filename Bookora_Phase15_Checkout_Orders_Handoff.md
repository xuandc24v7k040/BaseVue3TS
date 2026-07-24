# Bookora Phase 15 — Checkout & Orders Handoff

## Status

`PENDING`

Phase 15 vẫn chờ manual runtime acceptance. Schema simplification hotfix dùng
checkout stateless và chỉ giữ `PaymentTransaction` là bảng nghiệp vụ mới.

## Repository scope

- Frontend: `D:\CTU\CT466E\bookora-web\bookora-web`
- Backend: `D:\CTU\CT466E\bookora-api\bookora-api`
- Migration gốc:
  `prisma/migrations/20260723190000_phase15_checkout_orders/migration.sql`
- Forward cleanup migration:
  `prisma/migrations/20260723210000_phase15_schema_simplification/migration.sql`

## Backend

- Checkout preview đọc lại Cart, CartItem, Branch, Product, Variant, price và
  `BranchProductStock`; preview không tạo database row và không mutate stock.
- `selectedCartItemIds` có nghĩa duy nhất là `CartItem.id`.
- `X-Branch-Id` phải khớp `Cart.branchId`; sai branch trả machine code cụ thể.
- Cart và Checkout dùng chung `CartValidationService`.
- GHN dùng package defaults phía backend, không phụ thuộc shipping dimensions
  trên ProductVariant.
- COD final revalidate, conditional stock decrement và chỉ clear selected
  CartItem sau khi tạo đơn thành công.
- VNPAY giữ/trả/consume stock bằng transaction và các timestamp trên
  `PaymentTransaction`; không dùng bảng reservation hoặc movement.
- IPN success không decrement lần hai; fail/cancel/expire release tối đa một
  lần; retry tạo attempt mới.

## Main API contract

- `POST /checkout/preview`
- `POST /checkout/current-location/resolve`
- `POST /checkout/place-order/cod`
- `POST /checkout/place-order/vnpay`
- `GET /payments/vnpay/ipn`
- `GET /payments/vnpay/return`
- `GET /payments/:paymentId/status`
- `POST /payments/:paymentId/retry`
- `POST /payment-transactions/:transactionId/query`
- `GET /customer/orders`
- `GET /customer/orders/:orderId`
- `POST /customer/orders/:orderId/cancel`

## Frontend

- Cart truyền selection qua query `items`, giữ nguyên exact `cartItem.id`.
- Route checkout là `/checkout`, không có database checkout identifier.
- Chọn địa chỉ hoặc current location sẽ gọi lại stateless preview.
- Đổi branch await Cart branch mutation trước, cập nhật branch store rồi mới
  preview lại.
- Place order gửi lại selection, address, payment method, note và
  `previewReference`; backend vẫn final revalidate.
- Orval/Zod được regenerate từ OpenAPI backend, không patch generated files.

## Deferred

- Không chạy browser, Playwright, localhost manual flow, GHN live smoke hoặc
  VNPAY Sandbox manual acceptance trong schema simplification hotfix.
- Chỉ đánh dấu Phase 15 tổng thể DONE sau một lượt runtime acceptance riêng.
