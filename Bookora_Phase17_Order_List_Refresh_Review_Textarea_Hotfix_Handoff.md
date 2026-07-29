# Phase 17 — Order List Refresh & Review Textarea Hotfix Handoff

Ngày cập nhật: 29-07-2026

## Trạng thái

`DONE`

Hotfix frontend-only, đúng hai vấn đề BOUND. Không sửa Order workflow,
Payment, Inventory, Review eligibility, Admin Orders UI hoặc API contract.

## Preflight findings

| Finding | Source | Trạng thái | Cách xử lý |
|---|---|---|---|
| Admin status mutation | `AdminOrderDetailPage.vue` | READY | Mutation đã publish `ORDER_INVALIDATED`; giữ nguyên |
| Order Detail refresh | `main.ts`, `order-query-policy.ts` | READY | Signal invalidate detail; focus/reconnect đã bật |
| Order List cross-tab | `main.ts`, `order-sync-channel.ts` | READY | Signal invalidate root `customerOrderKeys.all`, bao phủ mọi list/tab |
| Order List khác profile | `order-query-policy.ts` | GAP | Cache còn “fresh” 45 giây nên focus/mount mặc định có thể không refetch; đổi List sang `always` |
| Query keys và tab filter | `customer-orders-api.ts`, `AccountOrdersPage.vue` | READY | Mỗi params/tab có key riêng; root invalidation bao phủ tất cả |
| Race/stale response | `AccountOrdersPage.vue` | READY | Query function truyền AbortSignal; TanStack cancel/refetch giữ response cũ không overwrite request mới |
| Dialog body scroll | `ReviewFormDialog.vue` | READY | Một ScrollArea `type="auto"` cho body; header/footer cố định |
| Textarea scroll/focus | `ReviewFormDialog.vue` | DRIFT | ScrollArea trực tiếp quanh Textarea tạo surface lồng; trả Textarea về bounded native scroll và ring Bookora |

## Root cause

### Customer Order List

Admin transition/cancel đã phát signal. Trong cùng browser profile,
`setupOrderSync` nhận BroadcastChannel/storage event và callback trong
`main.ts` invalidate:

- `customerOrderKeys.all`: toàn bộ Customer list query, gồm mọi status/tab.
- `customerOrderKeys.detail(orderId)`: detail của Order bị thay đổi.
- Admin list/detail của selected branch.

Vì vậy không có thiếu signal hoặc query-key drift. Gap xảy ra khi Admin và
Customer khác browser/profile, nơi BroadcastChannel/storage không truyền qua.
Order List có `staleTime: 45_000`; `refetchOnWindowFocus: true` và
`refetchOnMount` mặc định chỉ refetch khi stale. Query vừa tải vẫn được xem là
fresh và có thể giữ trạng thái cũ. Detail có staleTime 20 giây nên thường nhìn
như cập nhật nhanh hơn.

### Review Textarea

Dialog đã có ScrollArea cho body. Việc bọc thêm Textarea trực tiếp bằng
ScrollArea tạo hai scroll/focus surfaces, làm border/ring và scrollbar nhìn
chồng nhau như ảnh đầu vào. Shared Textarea vốn đã có accessible outline-none
kèm focus ring, nên wrapper thứ hai là không cần thiết.

## Hotfix

### Order List refresh

`ORDER_LIST_QUERY_POLICY` giữ `staleTime: 45_000` nhưng dùng:

- `refetchOnMount: "always"`.
- `refetchOnWindowFocus: "always"`; TanStack focus manager xử lý
  visibility/focus.
- `refetchOnReconnect: "always"`.

Kết quả:

- Cùng browser: order signal vẫn invalidate toàn bộ list và affected detail.
- Khác profile: quay lại cửa sổ, mount lại tab hoặc reconnect luôn lấy dữ liệu
  server mới.
- Order rời tab cũ/xuất hiện tab mới theo server filters, không patch row cục
  bộ.
- Không polling, WebSocket, force reload hoặc listener mới.

### Review Textarea

- Chỉ còn một `ScrollArea type="auto"` cho dialog body.
- Textarea vẫn là shared shadcn-vue `Textarea`, giữ `v-model`,
  `maxlength="2000"`, counter và submit mutation.
- Textarea dùng `min-h-36 max-h-56`, `resize-y`, `overflow-y-auto`.
- Border thường dùng mặc định của shared Textarea; focus dùng border xanh 35%
  và ring xanh 15% dày 1px, không outline đen hoặc double border.
- Native scrollbar được thu gọn bằng `scrollbar-width: thin` và màu token
  Bookora; footer không bị đẩy vì body vẫn bounded bởi dialog ScrollArea.

## Files thay đổi trong hotfix này

- `src/features/orders/api/order-query-policy.ts`: tăng safety net cho Customer
  Order List.
- `src/features/orders/customer-receipt-focus-hotfix.test.ts`: cập nhật
  regression contract; xác nhận Inventory policy không đổi.
- `src/features/orders/phase17-order-list-refresh-review-textarea-hotfix.test.ts`:
  targeted tests mới.
- `src/features/engagement/components/ReviewFormDialog.vue`: bỏ ScrollArea lồng,
  đồng bộ Textarea scroll/focus.
- `src/features/engagement/phase17-ui-ux-hotfix.test.ts`: cập nhật contract
  Textarea theo policy authoritative mới.

## Automated verification

- Targeted Vitest:
  `npm test -- --run src/features/orders/phase17-order-list-refresh-review-textarea-hotfix.test.ts src/features/orders/customer-receipt-focus-hotfix.test.ts src/features/orders/state/order-sync-channel.test.ts src/pages/app/account/AccountOrdersHotfix7.test.ts src/features/engagement/phase17-ui-ux-hotfix.test.ts src/pages/app/account/AccountOrderReviewActionHotfix.test.ts src/pages/app/account/AccountReviewsDeleteDialog.test.ts`
  → PASS, 7 files, 36 tests.
- `npm run build` → PASS; `vue-tsc -b` và Vite production build, 4514
  modules.
- `git diff --check` → PASS.
- GitNexus `detect_changes` → LOW, 0 affected execution flow.
- Frontend không có lint script authoritative.

## Backend và generated contract

- Backend: không thay đổi thêm cho hotfix này.
- OpenAPI/Orval/Zod: không regenerate cho hotfix này; contract Order/Review
  hiện có đã đủ.
- Các thay đổi backend/generated còn hiện trong worktree thuộc prompt
  Pre-Phase 18 ngay trước đó, không phải hotfix này và không bị sửa tay trong
  lượt thực thi này.

## Manual runtime và Git safety

- Manual browser/runtime: NOT RUN.
- Playwright/Cypress/screenshot comparison: NOT RUN.
- Không stage/commit/push/reset/clean.
- `AGENTS.md`/`CLAUDE.md` và các thay đổi Pre-Phase 18 có sẵn được giữ nguyên.

## Cảnh báo

- Vite tiếp tục báo chunk trên 500 kB và logo asset lớn có sẵn; build PASS.

## Kết luận

`PHASE 17 — ORDER LIST REFRESH & REVIEW TEXTAREA HOTFIX — DONE`
