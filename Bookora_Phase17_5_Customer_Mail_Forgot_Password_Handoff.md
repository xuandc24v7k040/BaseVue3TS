# Mini Phase 17.5 — Customer Mail Service & Forgot Password — Handoff

## 1. Trạng thái

`DONE`

Luồng Phase 17.5, các hotfix tiếp theo và toàn bộ automated gates đều PASS.
Migration disposable baseline đã được đồng bộ; development seed test giữ đúng
policy SUPER_ADMIN chỉ đọc Order. Full backend E2E cuối PASS 9/9 suites,
55/55 tests.

## 2. BOUND

- Backend: `D:\CTU\CT466E\bookora-api\bookora-api`
- Frontend: `D:\CTU\CT466E\bookora-web\bookora-web`
- Nguồn yêu cầu:
  `C:\Users\Admin\Downloads\Bookora_Phase17_5_Mail_Service_Forgot_Password_Bound_Verify_Done_Prompt.md`
- Plan authoritative:
  `C:\Users\Admin\Downloads\Phase-17.5_Plan.txt`
- Auth audit read-only:
  `C:\Users\Admin\Downloads\base_auth.docx`
- Không stage, commit, push, reset hoặc clean.

## 3. Preflight và baseline auth được giữ nguyên

- Đã đọc instructions, prompt, plan, master/phase handoff, Prisma schema,
  auth/session/change-password source và test liên quan.
- `base_auth.docx` xác nhận change-password hiện tại dùng bcrypt cost 12, giữ
  current session và revoke các session còn lại. Behavior này không bị đổi.
- Reset password là public flow riêng: revoke toàn bộ `AuthSession`, clear auth
  và CSRF cookies, không auto-login.
- `.env` được kiểm tra theo tên key, không in secret; file vẫn được gitignore.
- Các thay đổi có sẵn của người dùng trong `AGENTS.md`, `CLAUDE.md`,
  `.env.example` và việc xóa `.env.test.example` được bảo toàn.
- `prisma migrate dev --create-only` phát hiện checksum drift ở hai migration
  lịch sử `20260621090000_authorization_phase_1` và
  `20260723190000_phase15_checkout_orders`. Không reset database và không sửa
  migration cũ; Phase 17.5 dùng forward migration mới.

## 4. Prisma và token model

Forward migration:

`D:\CTU\CT466E\bookora-api\bookora-api\prisma\migrations\20260728160000_phase17_5_password_recovery\migration.sql`

Thay đổi:

- thêm `PasswordResetToken` với `tokenHash` unique, `expiresAt`, `usedAt`,
  `revokedAt`, `createdAt`, FK cascade và indexes;
- thêm attempt types `PASSWORD_RESET_EMAIL`, `PASSWORD_RESET_IP`;
- raw token là 32 random bytes, encode base64url 43 ký tự;
- database chỉ lưu HMAC-SHA256 hash bằng secret riêng;
- TTL bắt buộc đúng 15 phút;
- token cũ chưa dùng bị revoke khi phát hành token mới;
- consume token và đổi password chạy trong Serializable transaction;
- concurrent reset chỉ cho phép một request thành công.

## 5. Mail infrastructure

Các package được thêm:

- `resend`
- `react`, `react-dom`
- `@react-email/components`, `@react-email/render`
- dev types `@types/react`, `@types/react-dom`

`MailService` phụ thuộc `MAIL_PROVIDER`, không phụ thuộc trực tiếp Resend SDK.
`ResendMailProvider` là adapter production. Email reset dùng React Email, render
cả HTML và plain text tiếng Việt, có CTA, URL fallback, TTL 15 phút và cảnh báo
bảo mật. Mail được gửi ngoài transaction; provider failure revoke đúng token vừa
tạo, log không chứa email/token và trả generic response.

Không gửi mail thật. Sender domain và live delivery chưa được Codex xác minh.
`npm install` báo 16 vulnerability trong dependency tree (2 low, 6 moderate,
8 high); không chạy `npm audit fix` vì ngoài phạm vi.

## 6. Env/config và policy cuối

Required:

- `RESEND_API_KEY`
- `MAIL_FROM`
- `PASSWORD_RESET_TOKEN_HASH_SECRET` — tối thiểu 32 ký tự
- `PASSWORD_RESET_TTL_MINUTES=15`

Defaults:

- email: 5 attempts / 15-minute window / 15-minute block;
- IP: 15 attempts / 15-minute window / 15-minute block;
- route throttle forgot-password: 10 requests / 60 seconds;
- Turnstile expected action: `password-reset`.

Attempt email và IP đều được consume trước user lookup để giảm user-enumeration
side channel. Nonexistent, inactive, non-customer và local state không phù hợp
trả generic success. Active Google customer trả mã hướng dẫn đăng nhập Google
theo quyết định sản phẩm trong prompt.

## 7. HTTP contract

Ba endpoint public, có CSRF và Swagger source-of-truth:

- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password/validate`
- `POST /api/v1/auth/reset-password`

Reset token có trạng thái lỗi ổn định: `INVALID`, `EXPIRED`, `USED`, `REVOKED`;
expired boundary là `expiresAt <= now`. Same-password và concurrent conflict có
error code riêng.

OpenAPI cuối:

- 132 paths;
- 191 operations;
- 232 schemas;
- SHA-256 frontend snapshot:
  `476A1A9AEF13089D0646E432B5CBBF4FB89C4BCFC9A226D6145B639B61D0D003`.

Frontend được sinh bằng đúng `npm run gen:api:local`; Orval/Zod có 30 generated
files liên quan trong lần generate, generated Zod verification báo 257 ULID
occurrences và forbidden workaround count bằng 0. Không patch generated output
hoặc OpenAPI bằng tay.

## 8. Backend implementation

Các nhóm file chính:

- `src/modules/mail/**`: provider contract, Resend adapter, service, module,
  React Email template và tests;
- `src/modules/auth/password-recovery/**`: DTO/controller/service/attempt
  service/repositories/error codes/tests;
- `src/config/**`: mail namespace, env registration/validation, password reset
  policy và Turnstile action;
- `src/modules/auth/auth.module.ts`: wire mail/recovery providers;
- `src/modules/auth/auth-sessions.repository.ts`: cho phép revoke trong cùng
  transaction;
- `src/modules/auth/auth.service.ts`: public cookie-clear primitive, giữ nguyên
  semantics;
- Prisma schema và forward migration nêu trên;
- `test/password-recovery.e2e-spec.ts`: HTTP E2E với fake mail provider.

## 9. Frontend implementation

Các nhóm file chính:

- `src/features/password-recovery/api/password-recovery-api.ts`: wrapper typed
  quanh generated clients, luôn `skipAuthRefresh`;
- `src/features/password-recovery/schemas/**`: email/reset form validation;
- `src/features/password-recovery/utils/**`: map error code sang nội dung tiếng
  Việt và link states;
- `src/features/password-recovery/components/**`: forgot/reset forms và tests;
- `src/features/auth/password.schema.ts`: password policy dùng chung với
  change-password;
- `src/pages/app/auth/ForgotPasswordPage.vue` và
  `ResetPasswordPage.vue`: thay placeholder, tái sử dụng auth visual system;
- `src/api/http/client.ts`: hard-exclude cả ba recovery path khỏi refresh;
- generated OpenAPI/Orval/Zod output.

Forgot form có Turnstile action `password-reset`, pending guard, validation và
generic success persistent. Reset form:

- đọc token từ route query nhưng chỉ giữ trong memory;
- validate ngay, abort request cũ khi token đổi;
- phân biệt loading/valid/expired/used/revoked/invalid/network-error;
- retry network validation;
- có show/hide password và confirm-password;
- reset thành công gọi `clearSessionHint`, `authStore.setAnonymous`,
  `clearAuthSensitiveQueries`, toast một lần rồi `router.replace` về login;
- không gọi logout và không auto-login.

Trang dùng document scroll tự nhiên, không thêm nested `ScrollArea`.

## 10. Automated verification

PASS:

- `npx prisma format`
- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate deploy`
- `npx prisma migrate status` — 23 migrations, database up to date
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code`
  — no difference
- backend targeted: 3 suites / 18 tests
- backend password recovery HTTP E2E:
  `npm run test:e2e -- --runInBand test/password-recovery.e2e-spec.ts`
  — 1 suite / 1 test
- backend full unit: `npm test -- --runInBand`
  — 93 suites / 729 tests
- backend lint: `npm run lint`
- backend build: `npm run build` — SWC 441 files
- backend `npm run docs:check` — 191 operations / 232 schemas, OpenAPI valid,
  2 documented lint ignores
- frontend targeted — 5 files / 54 tests
- frontend full: `npm test -- --run`
  — 166 files / 796 tests
- frontend typecheck: `npx vue-tsc -b --pretty false`
- frontend build: `npm run build`
- generated Zod verification PASS.

Frontend không có ESLint dependency hoặc lint script, vì vậy không có frontend
lint command để chạy; typecheck, tests và production build đều PASS.

Full backend E2E:

- command: `npm run test:e2e -- --runInBand`;
- kết quả cuối: 9/9 suites PASS, 55/55 tests PASS;
- Phase 17.5 E2E và hai baseline suites đều PASS.

## 11. Manual/runtime

Theo yêu cầu Product Owner:

- manual browser/runtime: `NOT RUN`;
- Playwright/Cypress headed/manual: `NOT RUN`;
- live Resend delivery/inbox click: `NOT RUN`;
- sender-domain verification: `NOT RUN`.

Các mục manual không phải blocker cho automated Phase 17.5 gate.

## 12. Out of scope và cảnh báo

- Không đổi Google OAuth, login/register, change-password semantics.
- Không sửa authorization/order migration hoặc seed ngoài Phase 17.5.
- Không test live Resend API key hay domain.
- Không stage/commit/push.
- Vite build vẫn báo các chunk trên 500 kB; đây là warning có sẵn, build PASS.

## 12.1. Hotfix sau bàn giao

Hotfix CSRF-after-reset và explicit forgot-email disclosure đã hoàn tất với
trạng thái riêng `DONE`. Handoff authoritative:

`Bookora_Phase17_5_CSRF_After_Reset_And_Email_Status_Hotfix_Handoff.md`

Hotfix buộc frontend invalidation CSRF cache/in-flight request sau reset thành
công, lấy CSRF mới trước lần login kế tiếp, và bổ sung contract
`PASSWORD_RESET_EMAIL_NOT_FOUND`. Full unit, targeted password-recovery E2E,
typecheck/build/OpenAPI/Prisma gates của hotfix PASS. Hai lỗi full E2E nền dưới
đây không thuộc phạm vi hotfix và không ngăn hotfix mang trạng thái `DONE`.

## 13. Kết luận

`MINI PHASE 17.5 — CUSTOMER MAIL SERVICE & FORGOT PASSWORD — DONE`
