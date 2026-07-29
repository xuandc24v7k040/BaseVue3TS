# Bookora — Pre-Phase 18 UI Polish Hotfix Handoff

Ngày cập nhật: 29-07-2026

## Trạng thái

`DONE`

Hotfix hoàn thành đúng 5 hạng mục BOUND. Không refactor header, branch
state/scope, Review domain, Account Dashboard hoặc business logic ngoài phạm
vi.

## Kết quả audit và thay đổi

1. Branch selector
   - Root cause: trigger ghép prefix `Chọn chi nhánh:` trước
     `selectedBranch.name`.
   - Sau hotfix: khi đã chọn chỉ hiện đúng `branch.name`; khi chưa có branch và
     query đã kết thúc hiện `Chọn chi nhánh`; trạng thái loading vẫn hiện
     `Đang tải...`.
   - Giữ nguyên constraint `max-w-48 truncate`, dialog, click handler,
     persistence và branch scope.

2. Product Detail public reviews
   - Trước hotfix đã có server-side pagination, filter rating/verified,
     newest-first, visible-only, prev/next UI và query key chứa params; backend
     khóa cứng 5 item/trang.
   - Public review contract được bổ sung `limit` từ 1 đến 20, default 5 để giữ
     tương thích consumer cũ. Product Detail gửi explicit `limit: 4`.
   - Backend dùng `skip = (page - 1) * limit`, `take = limit`; count dùng cùng
     filter list. Average/count/distribution tiếp tục dùng toàn bộ review
     visible của sản phẩm, không phụ thuộc page hoặc filter hiện tại.
   - Đổi filter vẫn reset page về 1; pagination và empty/loading behavior giữ
     nguyên.

3. Header Wishlist và Cart
   - Root cause: bốn `<button>` click target desktop/mobile thiếu
     `cursor-pointer`.
   - Sau hotfix: class nằm trực tiếp trên cả bốn button; route, handler, auth
     redirect, badge và layout không đổi.

4. Customer Account Dashboard
   - KPI `Sản phẩm đã đánh giá` đi tới
     `/account/reviews?tab=written`.
   - Action `Đánh giá ngay` đi tới
     `/account/reviews?tab=pending`.
   - Parser tab hiện có tiếp tục nhận `written`, còn `pending` là default.

5. Review form dialog
   - Root cause: ScrollArea hiện có chỉ sở hữu overflow của dialog body; Textarea
     vẫn dùng `resize-y` và native vertical scrollbar.
   - Textarea thật được đặt trong shadcn-vue `ScrollArea type="auto"` cao 9rem,
     dùng `resize-none`, `overflow-y-hidden` và
     `[field-sizing:content]` để ScrollArea sở hữu vertical overflow.
   - Giữ nguyên `v-model`, `maxlength=2000`, counter, label, mutation,
     single-submit và create/edit prefill.

## Files thay đổi

### Frontend

- `src/components/client/layout/BranchSelector.vue`: bỏ prefix selected label,
  thêm fallback chưa chọn.
- `src/components/client/layout/ClientHeader.vue`: thêm cursor cho bốn click
  target Wishlist/Cart.
- `src/components/client/layout/ClientHeader.test.ts`: kiểm tra selected label
  và cursor trên actual buttons.
- `src/features/engagement/components/PublicReviewSection.vue`: gửi
  `limit: 4`.
- `src/features/engagement/components/ReviewFormDialog.vue`: ScrollArea riêng
  cho textarea, bỏ native vertical overflow.
- `src/features/engagement/phase17-ui-ux-hotfix.test.ts`: contract tests cho
  năm hạng mục hotfix.
- `src/pages/app/account/AccountOverviewPage.vue`: thêm query tab cho hai link.

### Backend

- `src/modules/reviews/dto/review.dto.ts`: thêm public review `limit`.
- `src/modules/reviews/reviews.repository.ts`: dùng request limit cho
  skip/take.
- `src/modules/reviews/reviews.repository.spec.ts`: kiểm tra pagination,
  filter/count và global summary predicates.
- `src/modules/reviews/reviews.service.spec.ts`: kiểm tra contract limit 4.
- `docs/openapi.json`: artifact OpenAPI export từ source.

### Generated và contract

- `openapi/bookora.openapi.json`: canonical frontend artifact đồng bộ từ
  backend export; SHA-256
  `90CD39C4DDBECD785A870A9A2EFA40C787351B4A3B57378845171278E460CF5F`.
- `src/api/generated/models/storefrontProductReviewsListParams.ts`: Orval thêm
  type `limit`.
- `src/api/generated/zod/public-reviews/public-reviews.ts`: Orval/Zod thêm
  validation/default cho `limit`.

## Verification

### Frontend

- Targeted:
  `npm test -- --run src/features/engagement/phase17-ui-ux-hotfix.test.ts src/components/client/layout/ClientHeader.test.ts src/pages/app/account/AccountOrderReviewActionHotfix.test.ts src/pages/app/account/AccountReviewsDeleteDialog.test.ts`
  → PASS, 4 files, 24 tests.
- Full `npm test` → PASS, 167 files, 804 tests.
- `npm run gen:api` → PASS; 30 generated Zod files, 257
  `zod.ulid()`, 0 forbidden occurrence.
- `npm run build` → PASS; `vue-tsc -b` và Vite production build, 4514
  modules.
- Frontend không có lint script authoritative trong `package.json`.
- `git diff --check` → PASS.

### Backend

- Targeted
  `npx jest src/modules/reviews/reviews.service.spec.ts src/modules/reviews/reviews.repository.spec.ts --runInBand`
  → PASS, 2 suites, 7 tests.
- Full unit `npm test -- --runInBand` → PASS, 94 suites, 730 tests.
- Full E2E lần đầu: 8/9 suites, 54/55 tests; race có sẵn ở concurrent
  authorization trả transaction conflict 500 thay vì expected 409.
- Full E2E rerun nguyên suite → PASS, 9 suites, 55 tests.
- `npm run type-check` → PASS.
- `npm run lint` → PASS.
- `npm run build` → PASS, SWC 442 files.
- `npm run docs:check` → PASS, 191 operations, 232 schemas, Redocly valid
  với 2 ignore rule có sẵn.
- `git diff --check` → PASS.

GitNexus `detect_changes` đánh giá frontend và backend ở mức LOW, không ghi
nhận execution flow bị ảnh hưởng.

## Không thực hiện

- Manual browser: NOT RUN.
- Live runtime/API: NOT RUN.
- Visual screenshot comparison: NOT RUN.
- Không stage/commit/push/reset/clean.
- Không thay Prisma schema/migration.

## Warnings / Out-of-scope

- Lần chạy backend E2E đầu gặp race `TransactionWriteConflict` ở authorization
  concurrency ngoài phạm vi; rerun nguyên suite PASS 55/55. Không sửa
  authorization.
- Frontend build còn warning chunk trên 500 kB và logo asset lớn có sẵn.
- `AGENTS.md` và `CLAUDE.md` ở cả hai repo là thay đổi đầu vào có sẵn, không
  thuộc hotfix và không bị chỉnh sửa.

## Kết luận

`BOOKORA — PRE-PHASE 18 UI POLISH HOTFIX — DONE`
