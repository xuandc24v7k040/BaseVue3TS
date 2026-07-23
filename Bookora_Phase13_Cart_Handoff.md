# Bookora Phase 13 — Cart — Handoff

## 1. Trạng thái

**PHASE 13 — CART — PENDING**

Backend, schema/migration, OpenAPI/generated client, Cart UI và automated regression đã hoàn tất. Phase chưa thể ghi DONE vì Customer manual acceptance, persistence qua logout/login, branch-switch runtime, price-change fixture, console/network và Cart tại đủ sáu viewport chưa được xác nhận. Luồng đăng nhập Customer có Turnstile và không được bypass.

## 2. Bound

- Backend: `D:\CTU\CT466E\bookora-api\bookora-api`.
- Frontend: `D:\CTU\CT466E\bookora-web\bookora-web`.
- Contract: backend `docs/openapi.json`, frontend `openapi/bookora.openapi.json` và generated Orval/Zod.
- Visual authority: `C:\Users\Admin\Downloads\cart.png`.
- Phase 12 Public Product Catalog trong source backend được dùng làm nền cho product, variant, branch price và availability.
- Không triển khai Guest Cart, Coupon, Checkout, Order, Payment, stock reservation hoặc stock deduction.
- Không stage, commit, push, reset hoặc clean. Các thay đổi Phase 11.5/12 có sẵn trong dirty worktree được giữ nguyên.
- Không tìm thấy file tên riêng `Master Handoff`; tài liệu này là handoff Phase 13 mới nhất và không ghi đè các handoff lịch sử.

## 3. Preflight, schema và migration

- Trước migration: 0 Cart, 0 CartItem, 0 user có nhiều Cart và 0 duplicate Variant.
- `ProductVariant.price` dùng `Decimal(15,2)`.
- Branch dùng `isActive`, không có soft-delete; FK `Cart.branchId` dùng `ON DELETE RESTRICT`.
- `Cart.userId` có unique constraint, bảo đảm một Customer chỉ có một Cart.
- `CartItem` unique theo `(cartId, productVariantId)`, bảo đảm một Variant chỉ có một dòng.
- `CartItem.lastKnownUnitPrice` dùng `Decimal(15,2)` để phát hiện thay đổi giá.
- Migration `20260723143000_phase13_customer_cart` đã deploy trên database local. Vì bảng Cart/CartItem rỗng ở preflight nên không cần merge/backfill dữ liệu lịch sử.

## 4. Cart backend và persistence

- Cart chỉ dành cho authenticated `Customer`; Guest bị chặn bởi auth/role guard.
- GET Cart tạo hoặc đồng bộ Cart duy nhất của Customer theo branch hiện tại rồi revalidate toàn bộ item.
- Add nhận exact `productVariantId` và quantity; backend tự tính giá, không tin giá từ frontend.
- Add lại cùng Variant merge quantity thay vì tạo dòng mới.
- Update quantity và remove kiểm tra ownership; cross-user không được truy cập CartItem.
- Add chạy transaction `Serializable` với retry để tránh duplicate/lost update khi concurrent add.
- Logout chỉ xóa auth-sensitive query cache phía frontend, không xóa Cart hoặc CartItem trong DB.
- Cart không mutate, reserve hoặc trừ stock.

## 5. Branch-switch behavior

- `PATCH /cart/branch` cập nhật branch của Cart duy nhất, giữ nguyên toàn bộ CartItem rồi revalidate.
- Frontend gửi cùng `branchId` trong body và header `X-Branch-Id`.
- Sau khi backend cập nhật thành công, selected branch store mới được đổi và availability queries được invalidate.
- Item hết hàng hoặc không đủ hàng tại branch mới vẫn hiển thị, bị làm mờ, bỏ chọn và disable quantity/checkbox; remove vẫn được phép.
- Đổi lại branch có stock sẽ làm item trở lại eligible ở lần revalidate kế tiếp.

## 6. Cart states, issues và price policy

Runtime state được tính động, không lưu cứng:

- `AVAILABLE`.
- `PRICE_CHANGED`.
- Product inactive.
- Variant inactive.
- Out of stock.
- Insufficient stock.
- Branch inactive/unavailable.

`lastKnownUnitPrice` giữ giá lần gần nhất của item để phát hiện `PRICE_CHANGED`; subtotal và tổng tiền luôn dùng current backend price. Price change không làm mất item. Blocking issue làm item không eligible nhưng item vẫn được trả về và có thể xóa.

## 7. API matrix

Runtime có global prefix/version `/api/v1`.

| Method | Path | Auth | Branch header | Mục đích |
|---|---|---|---|---|
| GET | `/cart` | Customer | Bắt buộc | Lấy/tạo Cart và revalidate |
| POST | `/cart/items` | Customer | Bắt buộc | Add exact Variant hoặc merge quantity |
| PATCH | `/cart/items/:itemId` | Customer | Theo Cart | Cập nhật quantity |
| DELETE | `/cart/items/:itemId` | Customer | Theo Cart | Xóa item |
| PATCH | `/cart/branch` | Customer | Bắt buộc, trùng body | Đổi branch, giữ item và revalidate |

Các mutation tiếp tục đi qua CSRF/session interceptor hiện hữu.

## 8. Product Detail CTA

- Guest Add/Buy Now hiển thị toast tiếng Việt và chuyển Login với `returnTo` về exact product slug.
- Customer Add gửi exact selected Variant và quantity.
- Buy Now add thành công rồi mở `/cart`.
- CTA bị disable khi availability đang load/error, out-of-stock hoặc quantity không hợp lệ.

Manual Guest đã xác nhận với `Bút bi Thiên Long FO-024 Manual 10B`, branch Cần Thơ còn 80:

```text
/login?returnTo=/books/but-bi-thien-long-fo-024-manual-10b
```

## 9. Cart UI, checkbox và summary

- Cart page có breadcrumb, skeleton/loading, empty, error/retry và layout hai cột desktop.
- Dùng shadcn-vue Checkbox; Select All chỉ tác động eligible item và hỗ trợ checked/indeterminate.
- Invalid item tự bỏ chọn và không được tính vào selected subtotal.
- Quantity update/remove có pending state theo item.
- Summary chỉ tính eligible selected items.
- Sidebar có branch nhận hàng, Bookora commitments, tổng đơn hàng và CTA Checkout deferred.
- Header badge là `SUM(quantity)` toàn Cart từ server, không dùng số mock.

## 10. OpenAPI, Orval và Zod

- Backend OpenAPI/docs check: PASS.
- Contract sau Phase 13: 152 operations, 153 schemas; Redocly valid với 2 cấu hình có sẵn được ignore.
- Frontend generated client/Zod đã sinh lại từ contract; không sửa generated files bằng tay.
- Generated Zod: 21 files, 231 `zod.ulid()`, 0 forbidden occurrences.
- Handwritten Cart adapter nằm ngoài generated tree.

## 11. Automated verification

Backend:

- Prisma format/validate/generate: PASS.
- Migration deploy: PASS.
- Cart targeted: PASS, 2 suites / 15 tests.
- Full Jest: PASS, 74 suites / 566 tests.
- Lint: PASS.
- Production build: PASS, 353 SWC files.
- OpenAPI/docs check và Redocly: PASS.

Frontend:

- Generated Zod verification: PASS.
- Phase 13 targeted matrix ban đầu: PASS, 4 files / 69 tests.
- Sau đồng bộ `X-Branch-Id` và sửa contract test: PASS, 3 files / 58 tests.
- Full Vitest: PASS, 138 files / 662 tests.
- Production build cuối (`vue-tsc -b && vite build`): PASS sau router hotfix và đồng bộ branch header; 4245 modules transformed.
- Project không có frontend lint script nên không ghi frontend lint PASS.

## 12. Manual browser evidence

Đã xác nhận:

- Host frontend `http://localhost:5173`, backend `http://localhost:8000`.
- Public Product Detail tải dữ liệu thật.
- Cần Thơ availability 80 cho fixture đã chọn.
- Guest Add to Cart chuyển đúng Login `returnTo` và hiển thị toast tiếng Việt.
- Scenario Guest đã kiểm tra không có console warning/error.

Chưa xác nhận do Turnstile/manual gate:

- Customer add A/B, badge = 6, F5 và logout/login persistence.
- Duplicate Variant merge trên runtime DB.
- Select All/indeterminate và selected subtotal trên Cart thật.
- Branch switch làm item invalid rồi khôi phục.
- Price-change fixture.
- Console/network sạch cho toàn Customer flow.

## 13. Responsive

Cart UI đã có breakpoint desktop/tablet/mobile trong source, nhưng Cart authenticated chưa được browser-accept tại đủ:

```text
1440×900
1366×768
1024×768
768×1024
390×844
320×700
```

Vì vậy không tuyên bố six-viewport PASS hoặc no-horizontal-overflow cho Cart.

## 14. Regression và GitNexus

- Full backend/frontend suites PASS, bao phủ Auth/session, Customer Account, Catalog, Product Detail, Header, Admin và Inventory regressions hiện hữu.
- Pre-edit impact của các symbol Phase 13 đã audit; không có HIGH/CRITICAL ở các symbol planned.
- `detect_changes` trên toàn dirty worktree báo HIGH vì gộp thay đổi Phase 11.5/12/13: frontend 40 files, 213 indexed symbols, 15 affected flows; backend 27 files, 30 indexed symbols, 8 affected flows. Đây không phải risk riêng của Cart.

## 15. Deferred, warnings và lệnh tiếp tục

- Phase 14: Coupon.
- Phase 15: Checkout, Order, stock deduction/reservation và Payment.
- Phase 13 chỉ có thể chuyển DONE sau khi người dùng hoàn tất/cho phép xử lý Turnstile và chạy đủ Customer manual matrix, six viewport, console/network.
- Nên chạy lại production build frontend, migration status/diff, `git diff --check` ở cả hai repo ngay trước khi chốt DONE.

## 16. Kết luận

```text
PHASE 13 — CART — PENDING
```
