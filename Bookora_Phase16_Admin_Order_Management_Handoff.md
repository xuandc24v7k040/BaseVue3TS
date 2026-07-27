# Bookora Phase 16 — Admin Order Management Handoff

## Status

`DONE` cho source implementation và toàn bộ automated gates của Phase 16.

Manual browser/runtime verification là `NOT RUN` theo yêu cầu trực tiếp của
người dùng. Trạng thái tổng thể của Bookora vẫn `PENDING` do Phase 15 còn thiếu
runtime acceptance và VNPAY Sandbox IPN qua public HTTPS callback; Phase 16
không che giấu hoặc thay đổi debt đó.

## BOUND paths

- Frontend: `D:\CTU\CT466E\bookora-web\bookora-web`
- Backend: `D:\CTU\CT466E\bookora-api\bookora-api`
- Migration:
  `prisma/migrations/20260727210000_phase16_admin_order_management/migration.sql`

## Preflight findings

- Reused: Order/Payment snapshots, `X-Branch-Id`, `BranchScopeGuard`,
  `PermissionsGuard`, stock deducted/restored markers, idempotent
  `InventoryMovement`, DataTable route sync, Dialog/ScrollArea, toast and
  shared date formatting.
- Missing before Phase 16: real Admin Orders API, `OrderStatusHistory`, internal
  note audit fields, `orders.cancel`, `orders.update_note`, active list/detail
  admin routes.
- Drift resolved: STAFF no longer receives order mutation permissions by
  default; Super Admin guard bypass is countered by service-level read-only
  enforcement and backend `allowedActions`.
- Authority drift retained honestly: the Phase 15 handoff is still `PENDING`
  although the Phase 16 prompt listed it as `DONE`.

## Schema and migration

- `OrderStatus` was not changed.
- Added `OrderStatusActorType` and `OrderStatusHistory` with order, actor,
  branch, reason/note, timestamp and indexes.
- Added `Order.internalNote`, updater and updated-at audit fields.
- No fake backfill was created; existing orders show an empty history until a
  real lifecycle event occurs.
- Migration is forward-only and was applied with `prisma migrate deploy`.
- `prisma migrate status`: database schema is up to date.
- `prisma migrate diff`: no difference detected.

## State machine and inventory safety

- Forward transitions only:
  `PENDING → CONFIRMED → PACKING → SHIPPING → COMPLETED`.
- Cancellation is allowed through `PACKING`; it is blocked for later/terminal
  states and for paid VNPAY orders that require a refund flow.
- Conditional status claims plus Serializable transactions reject concurrent
  updates with `ORDER_CONCURRENT_UPDATE`.
- COD completion marks an unpaid COD Payment as paid in the same transaction.
- Customer and admin cancellation share one domain helper. VNPAY holds or COD
  deducted stock are restored at most once, with one inventory movement per
  variant/source and no cart reconstruction.
- Checkout creation, VNPAY success/failure/expiry/retry, customer cancellation
  and admin mutations append truthful status-history events in the same
  transaction.

## Branch context, roles and permissions

- Every Admin Orders endpoint requires selected Branch Context.
- Repository list/detail/mutation queries include the selected `branchId`.
- Frontend query keys include `selectedBranchId`; switching branch cannot reuse
  another branch's order cache.
- Permissions: `orders.read`, `orders.update_status`, `orders.cancel`,
  `orders.update_note`.
- BRANCH_ADMIN and CASHIER receive read/mutation permissions from the seed.
- STAFF receives `orders.read` by default; mutations require explicit delegated
  permission.
- Super Admin can list/detail a selected branch but all mutation methods and
  `allowedActions` are read-only.

## API contract

- `GET /admin/orders`
- `GET /admin/orders/:orderId`
- `POST /admin/orders/:orderId/transitions`
- `POST /admin/orders/:orderId/cancel`
- `PATCH /admin/orders/:orderId/internal-note`

List search covers order code, customer/receiver, phone/email, product name and
SKU. Filters cover order status, payment status, payment method and Vietnam
date range. Pagination and stable sorting are server-side. Payment transaction
responses expose operational fields only, not callback/request payloads or
secure hashes. `allowedActions` is backend-authoritative.

OpenAPI was exported and validated (174 operations, 198 schemas). The frontend
artifact and Orval/Zod clients were regenerated with `npm run gen:api:local`;
no generated file was manually edited.

## Frontend

- Both `/super-admin/orders` and `/branch-admin/orders` use the same real
  branch-scoped list page.
- Both principals have a real `orders/:id` detail route.
- List includes server search/filter/sort/pagination, date range, URL route
  sync, column visibility, reload/error states and detail links.
- Detail includes header actions, progress tracker, Product / Customer &
  shipping / Payment / History tabs, summary and notes right rail.
- Transition, cancel and internal-note dialogs use fixed header, scrollable
  content and fixed footer. Buttons render only from backend `allowedActions`.

## Verification evidence

Backend:

- Prisma format/validate/generate: PASS.
- Migration deploy/status/diff: PASS; no drift.
- Seed: PASS.
- OpenAPI export/contract/lint: PASS.
- Typecheck: PASS.
- ESLint: PASS.
- Build: PASS (407 files compiled).
- Full Jest: PASS — 89 suites, 684 tests.

Frontend:

- `npm run gen:api:local`: PASS.
- Production build (`vue-tsc -b && vite build`): PASS — 4,417 modules.
- Full Vitest: PASS — 155 files, 746 tests.
- No `lint` npm script exists in the frontend package; this gate is `NOT RUN`,
  not reported as passing.
- Manual browser/runtime: `NOT RUN` by explicit user instruction.

GitNexus post-change review:

- Frontend: LOW, no affected indexed execution process.
- Backend aggregate: CRITICAL because audit events touch 18 existing
  checkout/VNPAY/cancel flows. Individual pre-edit impacts were LOW. The diff
  was reviewed: lifecycle changes add same-transaction history and extract the
  existing cancellation logic into a shared idempotent helper. Full backend
  regression remains green.

## Remaining external debt

- Phase 15 manual runtime acceptance and true VNPAY Sandbox IPN through a
  public HTTPS callback are still pending and were not broadened into Phase 16.
- No commit, stage, push or PR was created.
