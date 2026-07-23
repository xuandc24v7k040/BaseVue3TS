# Mini Phase 11.5 — Customer Account Foundation — Handoff

## 1. TRẠNG THÁI

- **PENDING** theo Definition of Done của prompt.
- Phần source, migration, OpenAPI, generated client, automated tests và browser smoke cơ bản đã hoàn tất.
- Các gate manual còn thiếu được liệt kê tại mục 12 và 15; không được suy diễn thành PASS từ unit test.
- Hai trang Customer Account hiện hữu `AccountProfilePage.vue` và `AccountAddressesPage.vue` chỉ được nối API thật và harden. Layout/card/sidebar/Sheet hiện hữu được giữ lại; không tạo page/layout/component song song và không redesign toàn bộ UI.

## 2. BOUND

- Backend: `D:\CTU\CT466E\bookora-api\bookora-api`.
- Frontend: `D:\CTU\CT466E\bookora-web\bookora-web`.
- Backend sửa trong Prisma migration/schema, `customer-account`, `customer-addresses`, administrative divisions, auth/session, shared image pipeline và OpenAPI.
- Frontend sửa đúng account routes/sidebar/hai page hiện hữu, thêm feature API/query/schema, và generated client từ OpenAPI.
- Không tạo application table mới; không sửa Product/Inventory/Branch UI ngoài các compatibility fixture cần thiết do `auth/me` thêm `avatarUrl`.
- Không stage, commit, push, reset hoặc clean.

## 3. PREFLIGHT & FINDINGS

- Đã đọc prompt Phase 11.5, project instructions, master/backend handoff, Prisma models `User`, `UserAddress`, `AuthSession`, auth/CSRF/refresh, Branch Province/Ward, shared images/R2, OpenAPI scripts và UI hiện hữu.
- `User` đã có email unique và LOCAL/Google provider; chưa có endpoint đổi email kèm current-password/re-auth/new-email verification.
- Quyết định email: giữ email **protected/read-only**, không có trong `UpdateCustomerProfileDto` hay mutation payload. Đây là theo chỉ dẫn ban đầu “Không cho khách hàng sửa thông tin email” và vì backend hiện không có safe email-change flow. Không tuyên bố đã có đổi email an toàn.
- Email được chuẩn hóa ở auth flow và được bảo vệ bằng unique constraint; việc sửa email trực tiếp từ Customer Account bị DTO whitelist từ chối.
- `UserAddress` trước đó mang dấu vết mô hình GHN ba cấp; target hiện dùng Province → Ward hai cấp theo Province Open API v2.
- Shared image `process/createImagePresets` có blast radius HIGH tới Category/Product upload. Đã giữ hành vi preset cũ và thêm avatar preset riêng; full backend regression xanh.
- GitNexus sau re-index: backend 3.715 nodes/12.526 edges/300 flows, final detect HIGH do auth/image shared flows; frontend 5.422 nodes/12.163 edges/208 flows, detect LOW.

## 4. DATABASE & MIGRATION

- Migration: `prisma/migrations/20260722190000_customer_account_foundation/migration.sql`.
- `users.avatar_url` nullable.
- `user_addresses.label`, `province_code`, `ward_code`; không còn district trong model/DTO/runtime mới.
- `province_code` và `ward_code` là integer bắt buộc sau guard dữ liệu legacy.
- Thêm index `(user_id, is_default)` và partial unique index bảo đảm tối đa một default address mỗi user.
- Không tạo bảng nghiệp vụ mới: 38 application tables; backup logical gồm 39 public tables khi tính cả `_prisma_migrations`.
- Backup pre-deploy: `C:\Users\Admin\Downloads\bookora-backups\bookora_phase11_5_predeploy_20260722.json` (317.580 bytes).
- `prisma migrate deploy`, `migrate status` và schema diff đã PASS; status cuối: 14 migrations, database up to date.

## 5. CUSTOMER ACCOUNT BACKEND

- Module: `src/modules/customer-account/**`, controller mỏng, service/repository tách trách nhiệm.
- API toàn cục, lấy user từ JWT; không yêu cầu `X-Branch-Id`.

| Method | Path | operationId | JWT | CSRF mutation | Ghi chú |
|---|---|---|---|---|---|
| GET | `/account/profile` | `customerAccountProfile` | Có | Không áp dụng cho safe method | Email response read-only |
| PATCH | `/account/profile` | `customerAccountUpdateProfile` | Có | Có | fullName, phone, gender, birthday, defaultAddressId; không nhận email |
| PUT | `/account/avatar` | `customerAccountUploadAvatar` | Có | Có | multipart avatar |
| DELETE | `/account/avatar` | `customerAccountRemoveAvatar` | Có | Có | Xóa DB reference + object cleanup |
| POST | `/account/change-password` | `customerAccountChangePassword` | Có | Có | current password bắt buộc |

- Password: LOCAL-only, kiểm tra current password, policy/same-password guard, hash bcrypt cost 12.
- Transaction Serializable cập nhật hash có optimistic condition, rotate refresh token/session hiện tại, revoke mọi session khác, rồi set cặp cookie mới.
- Logout chỉ revoke session hiện tại; login không còn revoke mọi session, cho phép multi-session đúng contract.
- `auth/me` trả thêm `avatarUrl` để sidebar/header đồng bộ identity.

## 6. CUSTOMER ADDRESSES BACKEND

- Module: `src/modules/customer-addresses/**`; API toàn cục, không `X-Branch-Id`.

| Method | Path | operationId | JWT/CSRF |
|---|---|---|---|
| GET | `/account/addresses` | `customerAddressesList` | JWT; safe method |
| POST | `/account/addresses` | `customerAddressesCreate` | JWT + CSRF |
| PATCH | `/account/addresses/:addressId` | `customerAddressesUpdate` | JWT + CSRF |
| POST | `/account/addresses/:addressId/set-default` | `customerAddressesSetDefault` | JWT + CSRF |
| DELETE | `/account/addresses/:addressId` | `customerAddressesDelete` | JWT + CSRF |

- Ownership luôn scope theo `userId`; foreign/missing address trả contract not-found.
- Provider Province Open API v2 có runtime shape validation, timeout 8 giây và cache 24 giờ; backend xác minh ward thuộc province.
- Max 10 address được kiểm tra trong Serializable transaction.
- Address đầu tự thành default; set-default atomic; partial unique index chặn hai default.
- Xóa default promote address cũ nhất theo thứ tự deterministic; xóa address cuối để user không còn default.

## 7. AVATAR & R2

- Tái sử dụng shared object storage/image processing hiện hữu, không tạo bucket/pipeline mới.
- Preset avatar: WebP 512×512, quality 80, crop `cover`; namespace avatar dùng object key ULID.
- Backend kiểm tra MIME/magic/decode/size theo shared pipeline; lỗi avatar có machine code ổn định.
- Upload có compensation khi DB fail; replace xóa object cũ sau DB success; delete giữ semantics DB-first/cleanup an toàn.
- Automated crop test xác nhận output WebP 512×512.
- **Chưa có bằng chứng real R2 smoke cuối** cho upload/replace/delete và invalid/spoof/corrupt/oversize qua localhost; do đó mục này chưa đạt manual DoD.

## 8. FRONTEND ACCOUNT UI

- Giữ nguyên `CustomerAccountLayout`, `CustomerAccountSidebar`, `AccountProfilePage.vue`, `AccountAddressesPage.vue` và visual structure hiện hữu; chỉ bind query/mutation thật, states và validation.
- Sidebar đọc profile/avatar thật; menu “Cài đặt tài khoản” đã bỏ.
- `/account/settings` redirect về `/account/profile`.
- Profile: real query, update form, default-address combobox từ query address thật, avatar upload/remove, change-password Sheet.
- Email hiển thị disabled/read-only, có mô tả protected, và tuyệt đối không xuất hiện trong update payload.
- Addresses: real list/create/update/set-default/delete, max-10 UI, empty/loading/error/retry, AlertDialog xác nhận xóa.
- Province → Ward hai cấp; ward disabled trước province và được clear khi province đổi; không còn District trong UI mới.
- API/query/schema nằm tại `src/features/customer-account/**`; generated endpoint/model/Zod nằm trong `src/api/generated/**`.

## 9. UX & RESPONSIVE

- Có loading/skeleton, empty, error/retry và disabled pending states.
- Validation Zod tiếng Việt; lỗi field được clear theo thay đổi; mutation dùng `vue-sonner` success/error.
- Sheet dài có fixed header/footer và `ScrollArea`; reset state khi đổi target/đóng dialog.
- Password inputs có show/hide, button type và aria-label.
- Browser smoke đã kiểm tra desktop 1440 và mobile 390: không page-level horizontal overflow; mobile menu thay sidebar đúng breakpoint.
- **Chưa kiểm đủ 6 viewport**, keyboard/focus/z-index matrix và double-scroll theo manual checklist; chưa được ghi PASS toàn phần.

## 10. OPENAPI & GENERATED CLIENT

- Backend docs cuối: 141 operations, 127 schemas; Redocly valid, 2 vấn đề được cấu hình ignore.
- OpenAPI source/decorator đã sửa trước, sau đó export `docs/openapi.json`.
- Frontend canonical spec `openapi/bookora.openapi.json` được đồng bộ từ localhost:8000.
- Đã chạy `npm run gen:api:local`; customer-account/customer-addresses Orval models/endpoints/Zod được generate.
- Không chỉnh tay file generated.
- Generated birthday nullable/string và gender enum được kiểm chứng qua build/tests.

## 11. AUTOMATED VERIFICATION

Các lệnh/kết quả source cuối:

- Backend `npm run type-check`: PASS (`tsc --noEmit`).
- Backend `npm run lint`: PASS.
- Backend `npm run build`: PASS, SWC compile 327 files.
- Backend `npm test -- --runInBand`: PASS 67/67 suites, 525/525 tests.
- Backend `npm run docs:check`: PASS, 141 operations/127 schemas, OpenAPI valid.
- Prisma format/validate/generate/deploy/status/diff: PASS; status 14 migrations, up to date.
- Frontend focused account tests: PASS 2 files, 7 tests.
- Frontend `npm test -- --testTimeout=15000`: PASS 129/129 files, 626/626 tests.
- Frontend `npm run build`: PASS (`vue-tsc -b && vite build`), 4.167 modules transformed. Chunk-size warning là warning hiện hữu, không phải build failure.
- Frontend không có lint script nên không ghi lint PASS.
- `git diff --check`: PASS ở cả hai repo.
- GitNexus `detect_changes`: backend HIGH vì auth/image shared symbols, 8 affected flows sau re-index; frontend LOW, 0 affected process. Full regression đã chạy để phủ blast radius trực tiếp.

## 12. MANUAL BROWSER, R2 & SESSION

- Host browser đã dùng: frontend `http://localhost:5173`, backend `http://localhost:8000`.
- Profile GET thật hiển thị đúng; edit Sheet mở đúng; email DOM xác nhận `disabled=true`, `readOnly=true`, không gửi trong payload.
- Addresses GET thật hiển thị empty state; add Sheet chỉ có Province/Ward, Province Open API tải 34 đơn vị; không có District.
- Desktop/mobile smoke không có horizontal overflow.
- Acceptance AuthService + Prisma thật với hai session tạm: current session active = true, other session revoked = true, password restored = true; temp sessions đã xóa.
- HTTP cookie-jar login riêng bị Turnstile/rate boundary từ chối, không bypass security. Vì vậy **chưa đủ** full browser proof cho current browser giữ login, old/new password login, CSRF sau rotation.
- Chưa thực hiện manual avatar real R2, invalid avatar, address CRUD/default/cross-user và chưa lưu console/network final counts.

## 13. REGRESSION

- Auth unit/full suite phủ register/login/logout/refresh/CSRF/session primitives và change-password rollback/rotation/revocation.
- Auth fixture toàn frontend được cập nhật `avatarUrl`; 626 tests xanh gồm router, auth store, API service, branch store, permissions, layouts và representative admin flows.
- Shared Category/Product image behavior giữ preset-specific fit; backend full suite xanh.
- OpenAPI/docs/generated client/build đồng bộ.
- Manual representative Category/Product R2 và Inventory navigation cuối chưa được chạy lại trong phiên acceptance này.

## 14. FIXTURES

- Không tạo/xóa customer address và không thay avatar của fixture trong browser smoke.
- Hai auth session integration có ULID riêng đã được xóa trong `finally`.
- Mật khẩu `customer@gmail.com` đã được đổi tạm để kiểm transaction và được khôi phục/verify bằng bcrypt; hash gốc cũng được restore trong `finally`.
- Theo security contract, các session khác của customer fixture bị revoke khi chạy acceptance; cần đăng nhập lại browser. Đây là hành vi dự kiến của change-password.
- Backup logical pre-deploy đã giữ tại Downloads; không có `pg_dump` cục bộ và Docker không chạy nên dùng JSON logical backup qua PostgreSQL driver.

## 15. WARNINGS/TECHNICAL DEBT/BLOCKERS

- Blocker DoD: chưa có manual real R2 upload/replace/delete và invalid/spoof/corrupt/oversize proof.
- Blocker DoD: chưa có manual address CRUD/default/cross-user proof; concurrency/ownership hiện mới được chứng minh bằng service/DB tests.
- Blocker DoD: chưa có full HTTP/browser multi-session + CSRF/old-new-login proof do Turnstile/rate boundary; core AuthService/DB integration đã PASS.
- Blocker DoD: mới kiểm 2/6 viewport; chưa có final console/network counts và full keyboard/focus/z-index run.
- Email finding: backend không có safe email-change endpoint/re-auth/verification. Contract đang triển khai là protected read-only theo chỉ dẫn “không cho khách hàng sửa email”. Nếu product owner chốt lại rằng email phải đổi được, cần một phase/BOUND riêng cho current-password hoặc recent re-auth, case-insensitive uniqueness, OAuth-only behavior, verification và session policy; không được chỉ mở enable input frontend.
- GitNexus `detect_changes` dựa trên git diff nên phần risk summary chủ yếu ánh xạ tracked hunks; các module untracked mới đã được re-index và được kiểm qua compile/full tests, nhưng không stage chỉ để ép diff nhận chúng.

## 16. KẾT LUẬN

`MINI PHASE 11.5 — CUSTOMER ACCOUNT FOUNDATION — PENDING`

`PHASE 12 — PUBLIC PRODUCT CATALOG — vẫn PENDING`

