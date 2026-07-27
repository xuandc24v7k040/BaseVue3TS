# Bookora Phase 16 — Customer Receipt List UX Hotfix Handoff

## Status

`DONE` cho source implementation và automated verification. Manual browser là
`NOT RUN` theo yêu cầu trực tiếp của người dùng. Không stage, commit hoặc push.

## Customer list semantics

- Public query `tab=shipping` lọc tại database theo `status = SHIPPING` và
  `customerConfirmedReceivedAt IS NULL`.
- Public query `tab=received` lọc tại database theo `(status = SHIPPING AND
  customerConfirmedReceivedAt IS NOT NULL) OR status = COMPLETED`.
- Cùng một Prisma `where` được dùng cho `findMany` và `count`; pagination chạy
  sau filter, stable sort vẫn là `createdAt DESC, id DESC`, ownership vẫn theo
  Customer hiện tại.
- Contract `status[]` cũ được giữ cho các tab còn lại; route query
  `tab=completed` cũ được chuẩn hóa sang `tab=received`.

## Customer UX

- Card đủ điều kiện dùng `allowedActions.confirmReceived` để hiển thị action
  compact `Đã nhận hàng` cạnh `Xem chi tiết`.
- List và detail dùng chung `CustomerReceiptConfirmationAction.vue`, gồm
  shadcn-vue AlertDialog, pending/double-submit guard, error mapper, mutation,
  query invalidation, cross-tab event và toast tiếng Việt.
- Success chuyển bằng `router.replace` tới `tab=received&page=1` để Customer
  thấy đơn ngay trong tab `Đã nhận hàng`.
- Display mapper chỉ đổi presentation: confirmed `SHIPPING` hiển thị `Đã nhận
  hàng`, `COMPLETED` hiển thị `Hoàn thành`; raw OrderStatus không bị sửa.
- Footer card dùng flex wrap và touch-sized compact button, không che giá trên
  màn hình hẹp.

## Domain and Admin regression

- Customer confirmation vẫn chỉ ghi timestamp/event và giữ Order ở
  `SHIPPING`; không đổi Payment, Inventory hoặc InventoryMovement.
- Admin vẫn là actor duy nhất chuyển `SHIPPING → COMPLETED`.
- Timeline receipt event, completion readiness/guard và policy không cho hủy
  `SHIPPING` được giữ nguyên.
- Focus refetch 20s/45s, reconnect/focus và cross-tab policy được giữ nguyên;
  không polling, WebSocket hoặc SSE.

## Contract generation

- OpenAPI contract: 175 operations, 202 schemas; Redocly validation PASS.
- Frontend chạy `npm run gen:api:local`: 119 paths, 175 operations, 202 schemas.
- Orval và 26 Zod files được regenerate bằng pipeline; Zod verify có 248
  `zod.ulid()` và 0 forbidden occurrence. Không sửa generated code bằng tay.

## Verification evidence

Backend:

- Customer DTO/service targeted: 2 suites, 29 tests PASS.
- Admin regression targeted: 1 suite, 8 tests PASS.
- Full Jest: 89 suites, 699 tests PASS.
- Typecheck, ESLint và production build PASS; 407 files compiled.
- `docs:check` PASS.

Frontend:

- Customer list/receipt/status/focus/cross-tab targeted: 5 files, 22 tests
  PASS.
- Full Vitest với `--testTimeout=10000`: 159 files, 763 tests PASS.
- Production build (`vue-tsc -b && vite build`) PASS; 4,431 modules.
- Frontend không có lint script, nên lint là `NOT RUN`.

Manual browser/runtime: `NOT RUN` theo yêu cầu người dùng.

