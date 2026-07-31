# Phase 18 — Super Admin Dashboard Visual Hotfix — Kết quả

Ngày hoàn tất: 30-07-2026

## 1. TRẠNG THÁI

`DONE`

Toàn bộ gate dữ liệu, visual, responsive, generated contract, automated
regression và manual browser của hotfix đã đạt.

## 2. BOUND

- Backend: mở rộng đúng endpoint Dashboard overview, giới hạn Top products/Low
  stock, bổ sung test và sửa metadata OpenAPI kiểu số tại DTO Revenue Report.
- Frontend: `DashboardView`, presenter trạng thái, thumbnail fallback,
  `MetricCard`, generated OpenAPI/Orval/Zod và test analytics.
- Docs: handoff hotfix, handoff Phase 18 hiện hành và Master Handoff.
- Không đổi Prisma schema, Order lifecycle, Payment, Checkout hoặc Inventory
  ledger.
- Không stage, commit, push, reset hoặc clean.

## 3. PREFLIGHT & ROOT CAUSE

- Branch performance blank khi Super Admin đang ở branch scope vì UI quyết định
  widget theo prop `mode`, trong khi response đúng authority trả
  `weeklyPerformance`. Fix dùng `overview.scope.mode`; global hiển thị branch
  bars, branch scope hiển thị weekly bars, không dữ liệu có empty state rõ.
- Top products đã có `imageUrl` thật trong contract nhưng template bỏ qua. Fix
  render ảnh lazy-load và fallback icon khi URL null hoặc tải lỗi.
- Status donut render thẳng 9 raw enum nên lộ `PACKING`, `PAYMENT_FAILED`,
  `RETURNED`. Fix presenter gom đúng 6 bucket cố định và bảo toàn tổng.
- Dashboard endpoint chỉ trả daily trend nên select grouping không thể hoạt động
  thật. Fix thêm `groupBy=DAY|WEEK|MONTH`, PostgreSQL `generate_series`,
  `date_trunc` và zero-fill.
- Grid cũ chia 7/5 rồi ba card đáy bằng nhau, không khớp visual authority và
  status/chart dễ chật. Fix grid 5 cột có vị trí desktop tường minh và thứ tự
  mobile ổn định.
- Canonical OpenAPI export ban đầu suy luận `page/limit` thành `Object` do field
  initializer thiếu type annotation. Fix DTO bằng `type: Number` và
  `page: number`/`limit: number`; không sửa generated bằng tay.

## 4. VISUAL MATCH

- Desktop `xl`: revenue chiếm 3/5, status + low stock chiếm 2/5; hàng dưới là
  branch performance 3/5 và top products 2/5.
- KPI giữ accent bar dày `h-1.5`; icon lần lượt emerald, blue, violet, orange.
- Revenue header có subtitle đúng prompt, shadcn-vue Select, legend và
  `Đỉnh kỳ` tính từ series thật.
- Order status đúng thứ tự: Chờ xác nhận, Đã xác nhận, Đang xử lý, Đang giao,
  Hoàn thành, Đã hủy.
- Global branch bars có label, giá trị, tỷ lệ chiều rộng và native tooltip.
- Top products giới hạn 3; low stock giới hạn 4; cả hai có action riêng.

## 5. DATA & AUTHORITY

- Completed revenue vẫn dựa trên completion history authoritative, không đổi
  invariant Phase 18.
- Branch/global scope vẫn dùng `X-Branch-Id` interceptor hiện hữu và query key
  chứa scope.
- Top products sort ổn định: sold quantity giảm dần, revenue giảm dần, product
  ID tăng dần; query duy nhất trả cả ảnh, không N+1.
- Low stock sort hết hàng trước, quantity tăng dần, branch/variant ID ổn định.
- Backend giới hạn `LIMIT 3` và `LIMIT 4`; frontend tiếp tục slice phòng thủ.
- Fixture manual global: 47 đơn, 6 bucket lần lượt `17/0/0/0/12/18`, tổng 47.
  Branch bars: Hậu Giang `969.500 ₫`, Cần Thơ `715.500 ₫`.

## 6. RESPONSIVE

Manual PASS tại:

| Viewport | Kết quả |
| --- | --- |
| 1440×900 | Grid 3/2 đúng; không overflow |
| 1366×768 | Grid 3/2 đúng; không overflow |
| 1280×720 | Grid 3/2 đúng; không overflow |
| 1024×768 | Stack đúng thứ tự; không overflow |
| 768×1024 | Stack đúng thứ tự; không overflow |
| 390×844 | Chart, donut, legend và tables đọc được |
| 320×700 | Chart, donut, legend và tables đọc được |

Tại cả bảy viewport, `documentElement.scrollWidth === clientWidth`. Thứ tự dưới
`xl`: Revenue → Status → Branch performance → Low stock → Top products. Text
dài truncate/wrap trong card; table dùng fixed layout nên không đẩy body rộng.

## 7. OPENAPI / ORVAL / ZOD

- Contract đổi có chủ đích: Dashboard overview thêm query `groupBy` enum
  `DAY|WEEK|MONTH`, mặc định `DAY`.
- `npm run docs:check`: PASS, 197 operations, 252 schemas; Redocly valid với 2
  ignore đã tồn tại.
- Frontend chạy `npm run gen:api:local` qua canonical backend export.
- Backend `docs/openapi.json` và frontend
  `openapi/bookora.openapi.json` semantic equality: `true`.
- Orval client/models và Zod được generate lại; 32 Zod files, 263
  `zod.ulid()`, 0 forbidden occurrence.
- Không sửa OpenAPI/generated client/generated Zod bằng tay.

## 8. AUTOMATED VERIFICATION

- `npm test -- --runInBand src/modules/dashboard/dashboard.repository.spec.ts`
  — 1 suite / 3 tests PASS.
- `npm test -- --runInBand` backend — 99 suites / 740 tests PASS.
- Backend `npm run type-check`, `npm run lint`, `npm run build`,
  `npm run docs:check` — PASS.
- `npm test -- src/features/analytics/analytics-phase18.test.ts`
  — 1 file / 5 tests PASS sau thay đổi cuối.
- `npm test` frontend — 169 files / 813 tests PASS.
- Frontend `npm run build` — PASS, 6.109 modules transformed.
- `git diff --check` ở cả hai repo — PASS.

## 9. MANUAL BROWSER

- Fresh login Super Admin thành công; lỗi 401 trong ảnh đầu vào là session cũ
  hết hạn, không tái hiện sau đăng nhập.
- Global và selected-branch scope PASS. Selected branch chuyển widget sang
  `Hiệu suất gần đây`, không còn vùng trắng.
- `DAY`, `WEEK`, `MONTH` đều đổi URL, refetch và render peak/series mới.
- Ba ảnh top product tải thành công, `naturalWidth` lần lượt 1186, 600, 800;
  fallback đã có regression source test.
- “Xem tất cả sản phẩm bán chạy” tới `/super-admin/products`.
- “Xem tất cả cảnh báo tồn kho” ở branch scope tới
  `/super-admin/inventory/stocks?stockState=LOW_STOCK`; global scope dùng guard
  chọn branch hiện hữu trước khi vào inventory.
- Console warning/error: `0`. Không quan sát request API lỗi; dashboard,
  grouping và scope data đều tải thành công.

## 10. REGRESSION

- Shared `DashboardView` vẫn build/typecheck cho Super Admin và Branch Admin.
- Branch scope, payment method widget và today operations giữ nguyên.
- Revenue Report vẫn dùng generated contract mới; lỗi metadata page/limit được
  sửa tại source DTO và production build xác nhận không regression.
- Full backend/frontend suites cover Order, Inventory, Product, Auth và các
  module hiện hữu; không có test failure.

## 11. WARNINGS

- Vite vẫn cảnh báo một số chunk >500 kB; đây là performance debt có trước, không
  phải build failure và ngoài BOUND hotfix.
- Dependency audit advisories hiện hữu chưa được tự động sửa vì
  `audit fix --force` có thể gây breaking change.
- Global Inventory cần một branch cụ thể theo authorization contract hiện hữu;
  action low-stock vì vậy đi qua branch-required guard khi đang ở toàn hệ thống.

## 12. KẾT LUẬN

`PHASE 18 — SUPER ADMIN DASHBOARD VISUAL HOTFIX — DONE`

