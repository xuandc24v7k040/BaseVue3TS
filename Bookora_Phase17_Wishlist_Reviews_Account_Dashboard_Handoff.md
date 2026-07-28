# Bookora Phase 17 — Wishlist, Reviews & Account Dashboard Handoff

Ngày cập nhật: 27-07-2026

## Trạng thái

`PENDING`

Source, migration, generated contract và toàn bộ automated gates đã triển khai. Gate còn thiếu là manual browser acceptance cho F5, cross-tab, sáu viewport, accessibility và console/network. Người dùng yêu cầu bỏ qua bước chạy browser trong phiên này, vì vậy tài liệu không ghi nhận các gate đó là PASS.

## BOUND

- Backend: Prisma Review migration, `reviews`, `wishlists`, `account-dashboard`, public rating aggregate, OpenAPI và permission seed.
- Frontend: feature `src/features/engagement`, ProductCard, Product Detail, Customer Account, Customer Order Detail, Super Admin route/menu, query cleanup/sync và generated API.
- Docs: handoff này và `Bookora_Master_Handoff.md`.
- Không triển khai notification, reply/thread, media review, helpful vote, guest wishlist, recommendation hoặc Phase 18 report.
- Không stage/commit/push/reset/clean.

## Preflight và dữ liệu cũ

- Database audit trước migration: Review `0`, Wishlist `0`, `order_id NULL = 0`, wrong-owner/product-not-in-order/not-completed/duplicate/invalid-rating/blank-content đều `0`.
- Review cũ không cần backfill. Migration forward-only được chọn; không xóa hoặc đoán Order.
- Wishlist hiện hữu đã có unique `(user_id, product_id)` và được tái sử dụng.
- UI đầu vào có ProductCard heart deferred, Account dashboard mock và wishlist/reviews placeholder.

## Schema và migration

- Migration: backend `prisma/migrations/20260727233000_phase17_wishlist_reviews_dashboard/migration.sql`.
- `Review.orderId` bắt buộc; FK Order `ON DELETE RESTRICT`.
- Unique `(user_id, order_id, product_id)`.
- Check rating `1..5`; content null hoặc trim không rỗng và tối đa 2000 ký tự.
- Index customer/product-visible/order/branch/replied được bổ sung.
- `prisma migrate deploy`, `migrate status` (21 migrations) và `migrate diff --exit-code` đều PASS, không drift.

## Backend capabilities

Wishlist Customer:

- `GET /account/wishlist`
- `GET /account/wishlist/status?productIds=...` (batch, tối đa 100)
- `PUT /account/wishlist/:productId`
- `DELETE /account/wishlist/:productId`
- Customer-only, server-persisted, desired-state idempotent, newest-first, không nhận arbitrary userId.

Reviews:

- `GET /storefront/products/:productId/reviews?page=`: visible-only, newest-first, đúng 5/page, sanitized reviewer, aggregate visible-only.
- `GET /account/reviews`
- `GET /account/reviews/pending`
- `POST /account/reviews`
- `PATCH /account/reviews/:reviewId`
- `DELETE /account/reviews/:reviewId`
- Eligibility backend authoritative: đúng owner, raw `COMPLETED`, Product thuộc Order; distinct Order+Product; nhiều variant cùng Product chỉ một opportunity; Order COMPLETED khác tạo opportunity khác.
- Unique database xử lý concurrent create; Customer không thay order/product/visibility.

Dashboard:

- `GET /account/dashboard`.
- `totalOrders`, `totalSpent` chỉ COMPLETED, written reviews, SHIPPING chưa xác nhận nhận, pending distinct Order+Product, latest Order và bốn wishlist mới nhất.

Admin Reviews:

- `GET /admin/reviews`
- `PATCH /admin/reviews/:reviewId/visibility`
- Backend enforce `SuperAdminOnly` + `SuperAdminGuard`; global, không Branch Context/X-Branch scope.
- Search/rating/visibility/branch metadata/sort/pagination; sort quan hệ thật cho Product, Order, Customer và Branch; hide/show idempotent.
- Permission `reviews.read`, `reviews.moderate` chỉ đi qua SUPER_ADMIN role catalog.

## Frontend implementation

- `WishlistButton.vue`: heart active/inactive, pending lock, click không bubble, guest về `customer-login` với `returnTo`, toast tiếng Việt.
- `use-wishlist-status.ts`: gom các Product ID trong cùng tick thành một status batch, không N request/card; server là source of truth.
- `/account/wishlist`: loading/error/retry/empty/list/remove/pagination/inactive Product.
- Product Detail giữ hai tab cũ và thêm tab `Đánh giá`; public review 5/page, verified purchase, line-clamp, Xem thêm/Thu gọn, thời gian `HH:mm dd-MM-yyyy`.
- `/account/reviews`: Pending/Written, create/edit/delete, hidden state.
- Order Detail: opportunity Review chỉ được query khi raw COMPLETED.
- Dashboard bỏ mock và notification card; sidebar ẩn Notification; `/account/favorites` redirect về `/account/wishlist`.
- `/super-admin/reviews`: dùng shared Admin DataTable với global search, faceted filter, server sort, URL sync, reload, column visibility, pagination và sticky action; route không yêu cầu selected Branch. Mã đơn hiển thị dưới tên Product; text dài được truncate/line-clamp trong ranh giới cột.
- Rating/reviewCount thật được trả ở Home/List/Detail bằng aggregate query theo batch.

## Query, refresh và cross-tab

- Query root: `engagement`; nhánh wishlist, mine, pending, public, dashboard và admin review riêng.
- Mutation invalidate wishlist/dashboard/reviews liên quan; logout/session-expiry remove toàn bộ engagement cache và local in-memory status.
- `BroadcastChannel("bookora-engagement")` chỉ phát domain signal; tab nhận signal invalidate rồi refetch, không phát lại và không toast passive tab.
- F5 đọc lại server. Cross-tab/F5 chưa được manual browser chứng minh trong phiên này.

## UI và format

- Reuse shadcn-vue Button, Card, Dialog, Textarea, Tabs, Table, Input, NativeSelect.
- Dialog Review có header/body scroll/footer cố định, star buttons có accessible label và giới hạn 2000.
- Sonner success/error/guest messages bằng tiếng Việt.
- VNĐ dùng `Intl.NumberFormat("vi-VN")`; Review time dùng formatter chung `HH:mm dd-MM-yyyy`.
- Review content whitespace-preserving, line-clamp và đường mở rộng; table admin có intended horizontal scroll.

## OpenAPI, Orval và Zod

- Backend: `npm run docs:check` → 188 operations, 224 schemas, Redocly valid (2 rule ignore có sẵn).
- Frontend: `OPENAPI_URL=http://localhost:8001/api/docs-json npm run gen:api:local`.
- Canonical OpenAPI được sync bằng script; SHA-256 `BB8763F1DAC29B64C6ABA1AB657D7A490EE2029218C74FF434CB2D7DE14F9CA4`.
- Orval client và 30 Zod files được generate; verify ghi nhận 256 `zod.ulid()`, forbidden pattern `0`.
- Không chỉnh tay `openapi.json` hoặc `src/api/generated/**`.

## Automated verification

Backend PASS:

- `npm run prisma:format`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run prisma:migrate:deploy`
- `npx prisma migrate status`
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code`
- `npm run prisma:seed:dev`
- `npx jest src/modules/reviews/reviews.service.spec.ts src/modules/wishlists/wishlists.service.spec.ts --runInBand` → 2 suites, 5 tests.
- `npm test -- --runInBand` → 91 suites, 705 tests.
- `npm run type-check`
- `npm run lint`
- `npm run build` → SWC 424 files.
- `npm run docs:check`

Frontend PASS:

- `npm test` → 159 files, 764 tests.
- `npx vitest run src/features/product-master-data/product-master-data-routes.test.ts` → 9 tests (lazy-route regression).
- `npm run build` → `vue-tsc -b` + Vite production build, 4489 modules.
- Không có lint script; không ghi lint PASS.

Warnings:

- Vite còn warning chunk >500 kB và logo asset lớn có sẵn; build vẫn PASS.
- `AGENTS.md`/`CLAUDE.md` ở hai repo là thay đổi đầu vào của người dùng, không thuộc Phase 17.

## Hướng dẫn manual test thay acceptance đã bỏ qua

Chuẩn bị:

1. Chạy backend theo `.env`, xác nhận migration up-to-date và seed catalog/fixture phù hợp.
2. Chạy frontend bằng exact host trong `.env` để CORS/cookie/CSRF cùng khớp.
3. Chuẩn bị Customer có: Order COMPLETED chứa A; SHIPPING đã customer-confirmed chứa B; Order user khác chứa C; hai variants cùng Product D; hai Order COMPLETED cùng Product E.
4. Chuẩn bị SUPER_ADMIN, BRANCH_ADMIN, STAFF và CASHIER.

Wishlist:

1. Guest bấm heart: phải về `/login?returnTo=...`, không có local wishlist.
2. Login Customer, mở Catalog tab A và Product Detail tab B.
3. Add ở A; focus B phải active; F5 B vẫn active; `/account/wishlist` và dashboard có item.
4. Remove ở B; tab A, wishlist page và dashboard cập nhật.
5. Double-click nhanh: chỉ một desired state, không duplicate request/toast.

Review:

1. A review được; B/C bị backend chặn; D chỉ một opportunity; E có hai opportunity theo Order.
2. Create → Product Detail page 1/rating/count/My Reviews/dashboard cập nhật.
3. Edit rating/content rồi F5; delete → opportunity quay lại.
4. Mở Product Detail và My Reviews ở hai tab để kiểm tra create/update/delete cross-tab, không toast passive tab.
5. Kiểm content 2000, content rỗng trim về null, chuỗi không khoảng trắng dài không gây document overflow.

Admin:

1. SUPER_ADMIN vào `/super-admin/reviews`, đổi Header Branch không được scope list.
2. Search/rating/visibility/pagination; hide Review rồi kiểm storefront/aggregate biến mất; show lại.
3. BRANCH_ADMIN/STAFF/CASHIER không thấy menu; direct route/API phải 403/redirect.

Responsive/accessibility:

1. Kiểm lần lượt `1440×900`, `1280×800`, `1024×768`, `768×1024`, `390×844`, `375×667`.
2. Ở Catalog, Detail, Wishlist, Reviews, Dashboard, Order Detail và Admin Reviews: document horizontal overflow = 0; chỉ table admin được scroll trong container.
3. Keyboard qua heart, tabs, star input, dialog actions; focus ring rõ; aria-label/aria-pressed đúng; dialog header/footer cố định khi body cuộn.
4. F5 từng route chính; kiểm Console unexpected error/warning/unhandled rejection = 0, positive-path 4xx/5xx = 0, duplicate mutation = 0, raw English/Zod/machine code = 0.

Chỉ sau khi toàn bộ manual matrix trên PASS mới đổi Phase 17 từ `PENDING` sang `DONE`.
