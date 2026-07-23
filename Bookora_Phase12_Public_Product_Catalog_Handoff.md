# Bookora Phase 12 — Public Product Catalog — Handoff

## 1. Trạng thái

**PHASE 12 — PUBLIC PRODUCT CATALOG — PENDING**

Mã nguồn, contract, generated client, automated regression và guest browser acceptance đã hoàn tất. Phase chưa thể DONE vì dữ liệu runtime chỉ có 4 Product public và 0 Product sắp phát hành; báo cáo seed xác nhận 24 Product demo vẫn ở `DRAFT`, chưa có media và inventory seed đã bỏ qua chúng. Không upload/xóa media hoặc tự ý đổi trạng thái dữ liệu. Customer browser acceptance cũng chưa được thực hiện vì luồng đăng nhập có Turnstile và không được bypass.

## 2. BOUND

- Backend: `D:\CTU\CT466E\bookora-api\bookora-api`.
- Frontend: `D:\CTU\CT466E\bookora-web\bookora-web`.
- Contract: backend `docs/openapi.json`, frontend `openapi/bookora.openapi.json` và generated Orval/Zod.
- Visual authority: `C:\Users\Admin\Downloads\home.png`, `products.png`, `detail.png`.
- Không stage, commit, push, reset hoặc clean. Các thay đổi Phase 11.5 có sẵn trong cả hai dirty worktree được giữ nguyên.
- Không tìm thấy file tên riêng `Master Handoff`; handoff Phase 12 này là tài liệu mới nhất, còn các handoff lịch sử không bị ghi đè.

## 3. Preflight, findings và blast radius

- Đã đọc prompt Phase 12, AGENTS/CLAUDE/RTK, schema, OpenAPI, source/test liên quan, Phase 11, Mini Phase 11.5, seed report và ba ảnh tham chiếu.
- Mini Phase 11.5 handoff hiện có tự ghi `PENDING`, không phải DONE như premise của prompt.
- GitNexus index của `BaseVue3TS` và `Bookora-API` up-to-date. Các symbol/file đã phân tích đều LOW; không có HIGH/CRITICAL hoặc execution flow bị ảnh hưởng. Các blast radius lớn nhất: backend `AppModule` 4 direct callers; frontend `ClientHeader.vue` 2 direct callers; `BranchSelector.vue` 1 direct/3 total; `BookCard.vue` 1 direct/2 total; các file trang/component khác 0–1 direct.

## 4. Public endpoint matrix

Runtime URL có global prefix/version `/api/v1`; OpenAPI paths bên dưới là path sau prefix.

| Method | Path | Auth | Branch header | Mục đích |
|---|---|---|---|---|
| GET | `/storefront/branches` | Public | Không | Active branch summaries |
| GET | `/storefront/categories` | Public | Không | Category tree hai cấp |
| GET | `/storefront/home` | Public | Không | Best sellers/newest/upcoming |
| GET | `/storefront/products` | Public | Không | Search/filter/facet/sort/page |
| GET | `/storefront/products/:slug` | Public | Không | Detail, variants, media, related |
| GET | `/storefront/products/:productId/availability` | Public | Bắt buộc | Availability theo branch + variant |

Public projection không trả SKU, cost price, combination key, permission/audit hoặc stock history.

## 5. Public Branch context

- Store public riêng với admin branch store; tải active branches, fallback deterministic, persist/restore localStorage.
- Header branch selector dùng Dialog + ScrollArea, tìm kiếm, radio và xác nhận.
- `X-Branch-Id` chỉ gắn khi wrapper đánh dấu `branchScoped`; global category/home/list/detail không mang header.
- Đổi branch chỉ invalidate availability query, detail đang mở refetch tồn kho. Browser xác nhận Cần Thơ → Hà Nội, label cập nhật, availability 90 → 0 và reload vẫn giữ Hà Nội.

## 6. Categories và navigation

- Backend chỉ trả root + active children, không dựng cấp sâu hơn.
- Desktop category mega menu hỗ trợ hover/focus, delay đóng, Escape và click-outside.
- Mobile dùng Sheet + ScrollArea và native `details` cho cây hai cấp.
- Homepage root strip dùng dữ liệu thật; vùng rộng 760px cuộn nội bộ, không còn làm tràn toàn page.

## 7. Homepage

- Giữ header/banner/layout hiện tại; sections dùng API thật: best sellers, newest, upcoming.
- Product card dùng chung cho home/list/related, hiển thị ảnh, tên, tác giả, giá/sale và release date.
- Có skeleton, error/retry và section rỗng hợp lệ.
- Best seller ưu tiên completed order lines; khi chưa có sales dùng fallback slug order deterministic đã ghi trong constants.
- Runtime hiện chỉ có best sellers 4, newest 4, upcoming 0 nên chưa đạt visual/data contract mục tiêu 5/5/3.

## 8. Product listing

- Route `/books`; breadcrumb, desktop sticky sidebar và mobile filter Sheet.
- Search, category, price range, authors, publishers, attributes, on-sale và upcoming.
- Facets có count thật; sort popular/newest/price/name/release; page size 12/24/36; grid/list view persist.
- URL sync đã browser-test bằng `search=ReLIFE`; pagination, empty, skeleton và retry/error đã wiring.
- Technical debt: repository lấy toàn bộ tập public phù hợp rồi service áp dụng price filters/sort/pagination trong memory. Cần chuyển pagination/sort/filter có thể biểu diễn được xuống database trước khi coi là production-scale DONE.

## 9. Product detail, variants và gallery

- Route `/books/:slug`, breadcrumb và 404 tiếng Việt.
- Hỗ trợ SIMPLE và OPTIONED; selector chỉ cho combination hợp lệ, đổi variant cập nhật giá/sale/media/availability.
- Resolver gallery: variant media → general media → fallback; đổi variant reset selected image.
- Thumbnail, prev/next, fullscreen Dialog, zoom 1–3, Arrow keys, Escape và swipe.
- Detail trả description/attributes đã được backend sanitize theo write path, related products và public SEO fields.

## 10. Availability và CTA

- Query key chứa branchId/productId/variantId; request availability mang `X-Branch-Id`.
- Hiển thị IN_STOCK/LOW_STOCK/OUT_OF_STOCK và exact available quantity.
- Quantity không vượt available quantity. Khi loading/error/out-of-stock, quantity controls và Cart/Buy CTA bị disable.
- Khi còn hàng, CTA chỉ hiện toast `Tính năng giỏ hàng sẽ được hoàn thiện ở giai đoạn tiếp theo`; không tạo cart/badge/mutation giả. Wishlist cũng deferred bằng toast.

## 11. SEO

- Client-side title, description, canonical và Open Graph cho detail; 404 reset về Bookora.
- Browser evidence: `Chuyện Tình Thị Trấn Manual 10B | Bookora`, canonical đúng slug và description tương ứng.
- Đây là SPA metadata, không phải SSR SEO.

## 12. UX, accessibility và responsive

- Nội dung trạng thái/lỗi/toast chính bằng tiếng Việt; dùng `vue-sonner`.
- Dialog/Sheet có focus management của component primitives; selector/menu/gallery có label và keyboard behavior.
- Browser acceptance PASS không horizontal overflow tại: 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×700 cho home/list/detail.
- Đã sửa hai nguồn overflow: category strip thiếu `min-w-0/max-w-full` và global `body min-width: 320px` xung đột với vertical scrollbar.
- Visual comparison: hierarchy/header/green palette/card/list/detail gallery/summary/sidebar responsive bám ba ảnh; không thể khớp mật độ catalog/upcoming vì blocker dữ liệu.

## 13. OpenAPI và generated client

- `npm run docs:check`: PASS, 147 operations, 146 schemas; Redocly valid, 2 vấn đề cấu hình sẵn được ignore.
- `npm run gen:api:local`: PASS; 92 paths, 147 operations, 146 schemas; SHA-256 `372157F282016B281CDF731139910D1FD628C4D6528C64EF51EC9DD3985C06FD`.
- Generated Zod: 20 files, 226 `zod.ulid()`, 0 forbidden occurrences.
- Không sửa generated files bằng tay; frontend gọi generated endpoint functions qua handwritten storefront adapter.

## 14. Automated verification

Backend (`D:\CTU\CT466E\bookora-api\bookora-api`):

- `npm test -- --runInBand`: PASS, 71 suites / 545 tests.
- Targeted storefront: PASS, 3 suites / 14 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS, 344 files compiled.
- `npm run docs:check`: PASS.
- `npx prisma format --check`: PASS.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npx prisma migrate status`: PASS, 14 migrations, database up to date.
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code`: PASS, no difference.

Frontend (`D:\CTU\CT466E\bookora-web\bookora-web`):

- `npm test -- --testTimeout=15000`: PASS, 136 files / 650 tests.
- Targeted storefront/layout/router: PASS, 5 files / 23 tests.
- `npm run build`: PASS, vue-tsc + Vite, 4212 modules.
- `npm run verify:generated-zod`: PASS.
- Project không có frontend lint script riêng.

## 15. Manual browser evidence

- In-app browser chỉ dùng `http://localhost:5173`; compiled API smoke dùng local `http://localhost:8001/api/v1` rồi process tạm đã dừng.
- Guest: home, listing, optioned detail, branch switching, reload persistence, fullscreen gallery, variant price/media, availability, out-of-stock CTA, SEO và 404 PASS.
- Runtime smoke: products 200/4 items; home 200/4 best sellers/4 newest/0 upcoming.
- Final browser console: 0 warning, 0 error. Các endpoint quan sát được trả 200 ngoại trừ 404 slug chủ đích.
- Customer acceptance: chưa chạy vì login có Turnstile; không bypass CAPTCHA. Đây là một DONE gate còn thiếu.

## 16. Regression

- Full backend/frontend suites bao phủ Auth/Account, authorization, categories, products/media, inventory, router/layout/shared UI và đều PASS theo totals trên.
- Không có schema drift hoặc migration pending.
- Dirty worktree chứa nhiều thay đổi Phase 11.5 có sẵn; Phase 12 không rollback hoặc ghi đè ngoài phạm vi.

## 17. Warnings và technical debt

- **Blocker dữ liệu:** 24 demo products vẫn DRAFT, media = 0 và inventory seed skipped; public runtime chỉ 4 products, upcoming = 0.
- **Gate thiếu:** Customer browser acceptance chưa thực hiện do Turnstile.
- Listing pagination/sort/filter hiện có bước in-memory, cần database pagination cho catalog lớn.
- Best seller fallback là deterministic seed order khi chưa có completed sales.
- Cart, Wishlist và Reviews vẫn deferred; không mutation hoặc count giả.
- Vite cảnh báo một số chunk >500 kB; logo source khoảng 1.4 MB. Không chặn runtime nhưng nên code-split/optimize asset ở phase tối ưu.
- Instance API có sẵn ở port 8000 lúc kiểm tra là build cũ không có storefront routes; compiled smoke được chạy ở port 8001 để không giết process của người dùng.
- Final GitNexus `detect-changes`: frontend MEDIUM/1 affected flow; backend HIGH/8 affected flows. Backend HIGH đến từ các thay đổi Auth/ChangePassword/Upload Phase 11.5 đã tồn tại trong dirty worktree, không phải storefront symbols (các impact Phase 12 trước edit đều LOW). Không commit gộp worktree hiện tại nếu chưa tách và review phần Phase 11.5.

## 18. Kết luận và lệnh chạy lại sau khi unblock

**PHASE 12 — PUBLIC PRODUCT CATALOG — PENDING**

Để unblock: bổ sung/duyệt media hợp lệ cho 24 demo products bằng workflow được ủy quyền, chạy lại catalog + inventory seed, xác nhận tối thiểu 5 best sellers/5 newest/3 upcoming, rồi chạy guest + customer browser acceptance và toàn bộ commands ở mục 14. Không được tự upload/xóa media hoặc activate Product thiếu media chỉ để làm xanh gate.
