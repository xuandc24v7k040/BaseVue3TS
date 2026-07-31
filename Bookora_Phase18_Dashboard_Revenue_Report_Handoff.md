# Phase 18 — Dashboard & Báo cáo doanh thu — Kết quả

Ngày cập nhật: 30-07-2026

## 1. TRẠNG THÁI

`PENDING`

Phần implementation và automated verification đã hoàn tất. Manual
browser/runtime/responsive được Product Owner yêu cầu tạm thời bỏ qua, vì vậy
không ghi `DONE` hoặc `manual PASS`.

## 2. BOUND

- Backend analytics, Dashboard, Revenue Report, CSV, permission seed và OpenAPI.
- Frontend ba trang logic: Super Admin Dashboard, Branch Admin Dashboard và
  Revenue Report dùng chung.
- Không sửa lifecycle Order, Inventory ledger, Checkout, Payment hoặc schema
  Prisma.
- Không commit, stage, push, reset hoặc clean.

## 3. PREFLIGHT & FINDINGS

- Working tree ban đầu của cả hai repo chỉ có `AGENTS.md` và `CLAUDE.md` do
  Product Owner sửa; hai file này được giữ nguyên.
- Completion timestamp authoritative là `OrderStatusHistory.createdAt` với
  `eventType=STATUS_CHANGED`, `toStatus=COMPLETED`.
- Fixture có 47 đơn: 12 `COMPLETED`, 18 `CANCELLED`, 14 `PENDING_PAYMENT`, 3
  `PENDING`; không có completed order thiếu hoặc trùng completion history.
- Fixture có 17 dòng OrderItem completed, tổng quantity 25; COD 15 và VNPAY 32.
- Có 1 cảnh báo low-stock, 0 out-of-stock.
- Drift permission được sửa: `dashboard.read` không còn cấp mặc định cho
  STAFF/CASHIER/INVENTORY.

## 4. METRIC CONTRACT

- Completed revenue dùng Order snapshot `totalAmount` tại completion event.
- Merchandise revenue dùng `subtotalAmount - discountAmount`.
- Shipping revenue dùng snapshot `shippingFee`.
- Tổng số đơn Dashboard dùng `placedAt`; Revenue Report chỉ tính completion
  event trong kỳ.
- Sold quantity dùng tổng snapshot `OrderItem.quantity`.
- Average order value bằng completed revenue / completed orders, trả 0 khi mẫu
  số bằng 0.
- Kỳ so sánh có cùng độ dài, liền trước và không overlap.
- Timezone cố định `Asia/Ho_Chi_Minh`; custom range inclusive ở UI, exclusive
  end nội bộ; tối đa 366 ngày.

## 5. PERMISSION & BRANCH SCOPE

- `dashboard.read`: SUPER_ADMIN và BRANCH_ADMIN mặc định.
- `reports.revenue.read`: SUPER_ADMIN và BRANCH_ADMIN mặc định.
- `reports.export`: SUPER_ADMIN và BRANCH_ADMIN mặc định.
- Super Admin không chọn branch xem global; chọn branch dùng `X-Branch-Id`.
- Branch Admin bắt buộc branch được gán; header selector là source of truth.
- STAFF/CASHIER không được cấp analytics permission mặc định.
- Export yêu cầu đồng thời `reports.revenue.read` và `reports.export`.

## 6. DATABASE & QUERY PERFORMANCE

- Không tạo bảng analytics, migration hoặc index mới.
- Aggregate/grouping/pagination thực hiện trong PostgreSQL bằng tagged
  `Prisma.sql`; không tải toàn bộ Order vào memory.
- Audit schema/index và fixture cho thấy index hiện hữu đủ cho scope hiện tại.
- Trend dùng `generate_series` để zero-fill bucket; bảng dùng server pagination.

## 7. DASHBOARD BACKEND

- Thêm `GET /api/v1/dashboard/overview`.
- Module tách controller/service/repository/DTO.
- Trả KPI, daily revenue, order status, payment methods, top products, low
  stock và widget phân nhánh theo scope.
- Dashboard tự refetch 60 giây và khi window focus ở frontend.

## 8. SUPER ADMIN DASHBOARD UI

- KPI row, revenue chart, order status, top products, low stock và branch
  performance.
- Hỗ trợ global/selected-branch từ selector hiện hữu, không tạo selector trùng.
- Preset 7/30/90 ngày, custom date và URL state.

## 9. BRANCH ADMIN DASHBOARD UI

- Dùng chung `DashboardView` với mode branch.
- KPI, revenue trend, status, payment method, weekly performance, top products,
  low stock và today operations.
- Query key chứa branch ID nên đổi branch không hiển thị dữ liệu branch cũ.

## 10. REVENUE REPORT BACKEND

- Thêm summary, trend, branches, table và export dưới
  `/api/v1/reports/revenue`.
- Hỗ trợ DAY/WEEK/MONTH, COD/VNPAY/ALL, preset/custom range và sort/pagination.
- Branch comparison chỉ được phục vụ ở Super Admin global scope.

## 11. REVENUE REPORT UI

- Một shared page cho hai route Super Admin/Branch Admin.
- Filter range/group/payment đồng bộ URL.
- KPI, trend, revenue composition, branch comparison global-only và bảng
  server-side pagination.
- Có loading, empty, error và retry state bằng tiếng Việt.

## 12. CSV EXPORT

- CSV UTF-8 BOM, header tiếng Việt, numeric cells giữ dạng số.
- Escape dấu phẩy, quote và newline; chặn CSV formula injection.
- Export dùng toàn bộ filter/scope hiện hành và không phụ thuộc page của bảng.
- Nút chỉ hiện khi principal có `reports.export`.

## 13. QUERY, CACHE & RACE

- Query keys chứa resource, filter và `global|branchId`.
- Branch-scoped request dùng interceptor hiện hữu, không tự gắn header.
- Query branch comparison bị disable khi đang ở branch scope để tránh 403 thừa.
- `keepPreviousData` chỉ dùng cho table pagination; request có AbortSignal.

## 14. UI, SHADCN-VUE, CHARTS & ICONS

- Dùng Card, Button, Input, Skeleton, Table từ UI system hiện hữu.
- Bổ sung `@unovis/vue@1.6.7` làm adapter biểu đồ được duy trì.
- Icon dùng `@lucide/vue`; không dùng emoji làm icon chức năng.
- Không thay DashboardLayout/header/sidebar shell.

## 15. VALIDATION, VUE-SONNER & ERROR MAPPING

- Backend DTO validate preset, date, grouping, payment, pagination và sort.
- Invalid range trả error code ổn định; forbidden branch không bị fallback
  global.
- Read-only analytics không phát toast thành công; UI có inline error/retry.

## 16. RESPONSIVE, TRUNCATE & ACCESSIBILITY

- Layout dùng responsive grid và bảng có horizontal overflow.
- Long product/branch text có truncate ở vùng hẹp.
- Date/select controls có label hoặc `aria-label`; button dùng text rõ nghĩa.
- Manual viewport acceptance chưa chạy theo chỉ định của Product Owner.

## 17. OPENAPI, ORVAL & ZOD

- `docs/openapi.json` được sinh từ backend, không sửa tay.
- Frontend sync local contract: 197 operations, 252 schemas.
- Orval clients/models và Zod validators được generate lại.
- Zod verification: 32 files, 263 `zod.ulid()`, 0 forbidden occurrence.

## 18. AUTOMATED VERIFICATION

- Backend unit: 99/99 suites, 738/738 tests.
- Backend E2E regression: 9/9 suites, 55/55 tests.
- Backend targeted analytics/authorization: 7 suites, 13 tests.
- Backend type-check, lint, build, Prisma validate/generate/seed và docs check
  đạt.
- Frontend targeted: 2 files, 10/10 tests.
- Frontend full Vitest: 169/169 files, 811/811 tests.
- Frontend `vue-tsc` và production build đạt.

## 19. MANUAL BROWSER/RUNTIME

`NOT RUN — theo yêu cầu riêng của Product Owner.`

Checklist còn lại: ba trang ở desktop/tablet/mobile; global/branch switch; custom
range; COD/VNPAY; pagination; CSV mở đúng UTF-8; console/network không có lỗi;
permission denial cho tài khoản không có quyền.

## 20. REGRESSION

- Full backend unit/E2E và full frontend Vitest đều đạt.
- Không đổi Order transition, checkout, payment, inventory hoặc review behavior.
- Build vẫn có cảnh báo chunk lớn đã tồn tại; không phải build failure.

## 21. FILES CHANGED & BLAST RADIUS

- Backend: `src/modules/analytics`, `src/modules/dashboard`,
  `src/modules/revenue-reports`, AppModule, permission seed/tests, OpenAPI và
  contract checker cho CSV media type.
- Frontend: `src/features/analytics`, hai Dashboard wrapper, route/menu/
  permission, package/lock, generated OpenAPI/Orval/Zod.
- GitNexus `detect_changes`: backend `low`, frontend `low`, 0 affected process
  được nhận diện. New untracked symbols chưa nằm trong index hiện tại.

## 22. CHƯA LÀM / CẢNH BÁO / TECHNICAL DEBT

- Manual browser/runtime/responsive chưa chạy nên Phase 18 còn `PENDING`.
- `npm install` báo 41 advisory trong dependency tree (2 low, 9 moderate, 29
  high, 1 critical); không chạy `npm audit fix --force` vì có thể gây breaking
  change ngoài BOUND.
- Chưa tối ưu cảnh báo chunk >500 kB vì không thuộc phạm vi Phase 18.
- VNPAY Sandbox IPN evidence từ Phase 15 vẫn là gate cấp chương trình riêng.

## 23. CHECKLIST ĐÁP ỨNG PROMPT

- [x] Audit instructions, plan, handoffs, schema, source, tests, scripts và ảnh.
- [x] Metric/permission/scope/date contract.
- [x] Backend aggregate APIs và CSV.
- [x] Ba trang logic, generated pipeline và automated regression.
- [x] GitNexus impact trước edit và detect changes sau edit.
- [ ] Manual browser/runtime/responsive (được yêu cầu tạm bỏ qua).

## 24. KẾT LUẬN

`PHASE 18 — DASHBOARD & BÁO CÁO DOANH THU — PENDING`

Implementation và automated gates đã hoàn tất. Gate duy nhất của riêng Phase 18
còn mở là manual browser/runtime/responsive acceptance đã được Product Owner
chủ động hoãn.

## 25. SUPER ADMIN DASHBOARD VISUAL HOTFIX

Hotfix dashboard ngày 30-07-2026 đã `DONE`; handoff canonical:
`Bookora_Phase18_Super_Admin_Dashboard_Visual_Hotfix_Handoff.md`.

- Dashboard manual global/selected-branch và responsive 7 viewport PASS.
- Branch performance, ảnh top 3, low stock max 4, 6 status bucket,
  DAY/WEEK/MONTH, peak, KPI icon và grid 3/2 đã được sửa.
- Backend full 99 suites/740 tests; frontend full 169 files/813 tests PASS.
- OpenAPI/Orval/Zod được regenerate từ canonical source, semantic equality
  backend/frontend `true`.
- Phần manual rộng hơn của Phase 18 gốc (toàn bộ Revenue Report, CSV và
  permission-denial matrix) vẫn giữ trạng thái hoãn như các mục 19/23 ở trên;
  không dùng kết quả hotfix hẹp để ghi đè evidence chưa chạy đó.
