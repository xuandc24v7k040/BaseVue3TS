# Phase 17.5 — TTL Audit & E2E Baseline Hotfix — Handoff

## 1. Trạng thái

`DONE`

Full backend E2E cuối: 9/9 suites, 55/55 tests PASS.

## 2. TTL audit

- `.env.example` giữ default `PASSWORD_RESET_TTL_MINUTES=15`.
- Env validation cho phép mọi số nguyên dương; `2` hợp lệ, `0`, số âm và số
  thập phân bị từ chối.
- Backend phải restart sau khi đổi env vì config namespace được khởi tạo khi
  application bootstrap.
- Token mới lấy `mail.passwordReset.ttlMinutes` và lưu
  `expiresAt = now + ttlMinutes * 60_000`. Test fake clock xác nhận TTL=2 tạo
  chính xác `2026-07-29T00:02:00.000Z` từ `00:00:00.000Z`.
- Validate/reset so sánh trực tiếp `expiresAt` đã lưu với thời điểm hiện tại.
  Token tạo trước khi đổi env giữ expiry cũ; restart/config mới không viết lại
  token đã tồn tại.
- React Email nhận cùng `ttlMinutes` từ service; HTML và text test xác nhận
  hiển thị `2 phút`.
- Frontend không còn hard-code `15 phút`; UI nói thời hạn được ghi rõ trong
  email. Swagger/DTO/error state không có duration hard-code.

## 3. Root cause E2E và fix

- `orders.internal_note`: migration Phase 16 có cột nhưng disposable helper
  dừng migration list ở `20260726170000`, nên không chạy Phase 16 trở đi.
  Helper đã được cập nhật tới migration mới nhất. Migration forward-only
  `20260729010000_phase17_5_internal_note_baseline_hotfix` dùng
  `ADD COLUMN IF NOT EXISTS`, không mất dữ liệu và an toàn khi Phase 16 đã tạo
  cột.
- SUPER_ADMIN: catalog seed đã đúng policy, chủ động loại
  `orders.update_status`, `orders.cancel`, `orders.update_note`. Development
  seed test lại kỳ vọng toàn catalog nên sai. Test được sửa để yêu cầu
  `orders.read`, loại ba mutation permissions, và vẫn kiểm tra seed idempotent.

## 4. Files sửa

Backend:

- `src/config/env.validation.ts`
- `src/config/env.validation.spec.ts`
- `src/modules/auth/password-recovery/password-recovery.service.spec.ts`
- `src/modules/mail/mail.service.spec.ts`
- `test/helpers/postgres-test-database.ts`
- `test/development-seed.e2e-spec.ts`
- `prisma/migrations/20260729010000_phase17_5_internal_note_baseline_hotfix/migration.sql`

Frontend:

- `src/features/password-recovery/components/ForgotPasswordForm.vue`
- `src/features/password-recovery/components/PasswordRecoveryForms.test.ts`

## 5. Logic không đổi

- Không đổi forgot/reset token design, HMAC, expiry comparison, session revoke
  hoặc CSRF.
- Không đổi change-password.
- Không gán ba quyền mutation Order cho SUPER_ADMIN; Phase 16 read-only policy
  được giữ nguyên.
- Không sửa generated code/OpenAPI bằng tay.
- Không stage/commit/push/reset/clean; không chạy browser hoặc live Resend.

## 6. Verification cuối

- Prisma format/validate/generate PASS.
- `prisma migrate deploy`: áp dụng migration mới thành công.
- Prisma status: 23 migrations, database up to date.
- Prisma datasource→schema diff: no difference.
- TTL/mail targeted: 3 suites, 23/23 tests PASS.
- Baseline targeted E2E: 2 suites, 23/23 tests PASS.
- Backend full unit: 93/93 suites, 729/729 tests PASS.
- Backend full E2E: 9/9 suites, 55/55 tests PASS.
- Backend lint, type-check, build PASS; SWC 441 files.
- OpenAPI check PASS: 191 operations, 232 schemas.
- Frontend targeted: 5/5 tests PASS.
- Frontend full: 167/167 files, 802/802 tests PASS.
- Frontend Vue typecheck và Vite production build PASS; 4514 modules.

`PHASE 17.5 — TTL AUDIT & E2E BASELINE HOTFIX — DONE`
