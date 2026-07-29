# Phase 17.5 — CSRF After Reset & Forgot Email Disclosure Hotfix — Handoff

## 1. Trạng thái

`DONE`

Hotfix đã được triển khai đầy đủ ở backend và frontend. Các test mục tiêu, full
unit test, typecheck, backend lint, production build, OpenAPI generation,
Prisma checks và password-recovery E2E đều PASS.

Hai lỗi full backend E2E nền ghi nhận ban đầu đã được xử lý trong TTL/E2E
baseline hotfix kế tiếp; full backend E2E hiện PASS.

## 2. BOUND

- Backend: `D:\CTU\CT466E\bookora-api\bookora-api`
- Frontend: `D:\CTU\CT466E\bookora-web\bookora-web`
- Prompt authoritative:
  `C:\Users\Admin\Downloads\Bookora_Phase17_5_CSRF_After_Reset_And_Forgot_Email_Disclosure_Hotfix_Bound_Verify_Done_Prompt.md`
- Không stage, commit, push, reset hoặc clean.
- Không mở rộng sang Google OAuth, auth refresh, authorization/order baseline
  hoặc VNPAY.

## 3. Root-cause trace

Backend reset password thành công gọi `AuthService.clearAuthCookies`, xóa cả
cookie `csrfToken`. Frontend trước hotfix chỉ xóa session hint, auth store và
auth-sensitive queries; giá trị CSRF trong memory của `csrf-manager` vẫn còn.
Lần login kế tiếp vì vậy có thể gửi header CSRF cũ trong khi cookie đã bị xóa
hoặc thay mới, khiến `CsrfGuard` trả `403`.

Ngoài ra, promise lấy CSRF cũ đang in-flight có thể hoàn thành sau khi cache đã
bị clear và ghi ngược token cũ vào cache. `finally` của request cũ cũng có thể
xóa tham chiếu của request mới.

Forgot-password trước hotfix trả generic success cho email không tồn tại, trái
với quyết định sản phẩm trong prompt yêu cầu disclosure rõ ràng.

## 4. CSRF implementation

- `clearCsrfToken()` tăng generation và xóa cả cached token lẫn request hiện tại.
- Mỗi request CSRF giữ generation tại thời điểm tạo và chỉ được ghi cache khi
  generation chưa thay đổi.
- `finally` chỉ xóa request nếu chính promise đó vẫn là request hiện hành.
- Các request đồng thời sau invalidation vẫn dùng chung một request mới.
- Reset form gọi `clearCsrfToken()` ngay sau reset thành công, trước khi chuyển
  auth store sang anonymous và điều hướng.
- Login kế tiếp bắt buộc lấy token mới theo chuỗi:
  `GET CSRF mới -> POST login`.
- Không bypass CSRF và không thêm generic retry.

Impact analysis trước khi sửa:

- `getCsrfToken`: `HIGH`, 3 direct callers, 8 upstream symbols; các luồng
  login/register/interceptor được bảo vệ bằng regression tests.
- `clearCsrfToken`: `CRITICAL`, 7 direct callers, 9 upstream symbols; public
  contract và semantics của các caller hiện hữu được giữ nguyên.

## 5. Backend forgot-password behavior

- Email không tồn tại:
  `404 PASSWORD_RESET_EMAIL_NOT_FOUND`; không tạo token, không gửi mail.
- Active CUSTOMER dùng Google:
  `400 PASSWORD_RESET_GOOGLE_ACCOUNT`; không tạo token, không gửi mail.
- Active CUSTOMER dùng LOCAL và có `passwordHash`: giữ nguyên luồng tạo token,
  revoke token cũ và gửi mail.
- Inactive hoặc non-customer: giữ generic success và không tạo token/gửi mail.
- Email/IP attempt vẫn được consume trước user lookup.
- Disclosure email tồn tại là quyết định sản phẩm có chủ đích và là trade-off
  bảo mật đã được chấp nhận trong prompt.

## 6. Frontend forgot-password behavior

- `PASSWORD_RESET_EMAIL_NOT_FOUND` hiển thị inline tại field:
  `Email này chưa được đăng ký trong hệ thống.`
- Lỗi inline có `aria-invalid`, `aria-describedby`, đồng thời hiển thị
  `vue-sonner` error toast cùng nội dung và không chuyển sang success state.
- `PASSWORD_RESET_GOOGLE_ACCOUNT` hiển thị alert riêng và nút
  `Đăng nhập với Google`; không toast trùng và không success state.
- Khi người dùng sửa email, server field error/Google alert được xóa ngay.
- Turnstile được reset sau request thất bại.
- Layout giữ document scroll tự nhiên, không thêm nested `ScrollArea`; action
  full-width trên mobile và co theo nội dung từ breakpoint `sm`.

## 7. OpenAPI và generated contract

- Backend Swagger mô tả chính xác response `404` cho email không tồn tại và
  `400` cho tài khoản Google.
- Runtime OpenAPI được lấy từ backend và frontend được sinh lại bằng đúng
  `npm run gen:api:local`.
- Kết quả: 132 paths, 191 operations, 232 schemas.
- SHA-256 snapshot:
  `D3DB0866E7B77213A2BD0675D4B62F3A126369FFF842795BD759D5EBAE76DDF2`.
- Orval generation PASS.
- Zod generation: 30 files, 257 `zod.ulid` occurrences, 0 forbidden workaround.
- Không chỉnh tay OpenAPI hoặc generated output.

## 8. Automated verification

PASS:

- Backend targeted service: 13/13 tests.
- Backend password-recovery E2E: 1/1 test.
- Backend full unit: 93/93 suites, 729/729 tests.
- Backend `npm run lint`.
- Backend `npm run type-check`.
- Backend `npm run build`: SWC 441 files.
- Backend `npm run docs:check`: OpenAPI valid; 191 operations, 232 schemas,
  2 lint ignores đã được tài liệu hóa.
- Frontend targeted: 5 files, 59/59 tests.
- Frontend full: 167/167 files, 802/802 tests.
- Frontend `npx vue-tsc -b --pretty false`.
- Frontend `npm run build`; chỉ còn warning chunk trên 500 kB có sẵn.
- `git diff --check` ở cả hai repository.

Frontend không có ESLint dependency/lint script, vì vậy không có frontend lint
command để chạy.

## 9. Prisma verification

PASS:

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate status`: 23 migrations, database up to date
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code`:
  no difference

Hotfix CSRF không thay đổi Prisma schema; baseline hotfix kế tiếp bổ sung một
migration forward-only idempotent.

## 10. Full backend E2E baseline

Command: `npm run test:e2e -- --runInBand`

Kết quả sau TTL/E2E baseline hotfix: 9/9 suites, 55/55 tests PASS.
Disposable migration helper chạy đủ migration chain; SUPER_ADMIN giữ
`orders.read` và không nhận ba quyền mutation Order.

## 11. Manual/runtime

- Manual browser/runtime: `NOT RUN`.
- Playwright/Cypress headed/manual: `NOT RUN`.
- Live Resend delivery/inbox click: `NOT RUN`.
- Sender-domain verification: `NOT RUN`.

Các mục này được loại khỏi gate theo prompt và không được ngầm báo là đã chạy.

## 12. Regression coverage

- CSRF invalidation idempotent và buộc fetch token mới.
- Promise CSRF cũ không thể ghi đè cache sau invalidation.
- Concurrent requests sau invalidation vẫn dedupe.
- Chuỗi network sau reset dùng CSRF mới trước login, không dùng header cũ.
- Reset thành công clear CSRF trước cập nhật anonymous state.
- Missing email hiển thị lỗi field đúng code/message/accessibility và
  `vue-sonner` error toast đúng nội dung.
- Google account hiển thị alert/link đúng, không toast.
- Sửa email xóa ngay server error/Google alert.
- Missing, inactive, non-customer và Google không phát mail/token.
- Token mới revoke token cũ; reset vẫn one-time và session revocation giữ nguyên.

## 13. Các nhóm file thay đổi

Backend:

- `src/modules/auth/password-recovery/password-recovery-error-codes.ts`
- `src/modules/auth/password-recovery/password-recovery.service.ts`
- `src/modules/auth/password-recovery/password-recovery.controller.ts`
- unit tests và `test/password-recovery.e2e-spec.ts`

Frontend:

- `src/api/http/csrf-manager.ts` và CSRF/client tests
- `src/features/password-recovery/components/ForgotPasswordForm.vue`
- `src/features/password-recovery/components/ResetPasswordForm.vue`
- password-recovery error mapping và component/API tests
- runtime OpenAPI và generated Orval/Zod contract

## 14. Cảnh báo và trade-off

- API cố ý tiết lộ email chưa đăng ký qua
  `PASSWORD_RESET_EMAIL_NOT_FOUND`; đây là product-owner decision, không phải
  generic anti-enumeration behavior.
- Rate limit/Turnstile vẫn được giữ để giảm abuse.
- Không log email, raw reset token hoặc secret.
- Không thêm dependency cho hotfix.

## 15. Done checklist

- [x] Root cause CSRF được truy vết end-to-end.
- [x] Cache và stale in-flight CSRF được invalidation an toàn.
- [x] Login sau reset lấy CSRF mới.
- [x] Missing email và Google behavior đúng contract.
- [x] Không phát token/mail cho các trường hợp bị cấm.
- [x] Inline error, alert, accessibility và mobile layout có regression tests.
- [x] OpenAPI/Orval/Zod được sinh bằng command.
- [x] Unit, targeted E2E, typecheck, lint khả dụng, build và Prisma checks PASS.
- [x] Hai lỗi E2E nền đã được xử lý trong hotfix kế tiếp; full E2E PASS.
- [x] Không stage/commit/push/reset/clean.

## 16. Kết luận

`PHASE 17.5 — CSRF AFTER RESET & FORGOT EMAIL DISCLOSURE HOTFIX — DONE`
