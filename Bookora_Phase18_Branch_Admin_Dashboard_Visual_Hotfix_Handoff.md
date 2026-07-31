# Branch Admin Dashboard Visual Hotfix — Kết quả

## 1. Trạng thái

PENDING.

Phần triển khai và toàn bộ automated verification đã hoàn tất. Manual browser ở viewport mặc định 1280×720 đã PASS. Browser viewport override có advertise capability nhưng không thay đổi kích thước thực tế, vì vậy chưa thể xác nhận thủ công đủ sáu viewport bắt buộc và chưa được phép kết luận DONE.

## 2. Bound

Frontend đã sửa:

- `src/features/analytics/DashboardView.vue`
- `src/features/analytics/dashboard-presenter.ts`
- `src/features/analytics/analytics-phase18.test.ts`

Backend chỉ bổ sung dữ liệu bắt buộc còn thiếu và zero-fill tuần:

- `src/modules/dashboard/dto/dashboard.dto.ts`
- `src/modules/dashboard/dashboard.service.ts`
- `src/modules/dashboard/dashboard.repository.ts`
- `src/modules/dashboard/dashboard.repository.spec.ts`

Generated OpenAPI/Orval/Zod được tạo lại bằng script repository, không sửa tay. Không sửa workflow đơn hàng, permission, branch scope, Revenue Report, sidebar/header hoặc metric KPI.

## 3. Hiệu suất 4 tuần

- Tiêu đề: `Hiệu suất 4 tuần gần đây`.
- Mô tả lấy đúng tên branch từ response, đã xác nhận `Chi nhánh Hậu Giang`.
- Biểu đồ cột đứng, tối đa bốn bucket.
- Backend dùng `generate_series`, `LEFT JOIN` và `LIMIT 4` để giữ bucket không dữ liệu bằng `0`.
- Mỗi cột có `Tuần 1..4`, khoảng ngày `dd/MM - dd/MM`, doanh thu và native tooltip tiếng Việt.
- Metric tiếp tục dựa trên tập đơn `COMPLETED`.

## 4. Phương thức thanh toán

- Card Payment và Today Summary dùng `lg:grid-cols-2`, chia cùng một hàng ở desktop.
- Donut giữ kích thước cố định, có tổng đơn ở tâm.
- COD/VNPAY luôn có count và phần trăm.
- Công thức `count / (COD + VNPAY) × 100`.
- Tổng bằng 0 trả `0.0%`, không sinh `NaN` hoặc `Infinity`.
- Legend gom label, count và phần trăm trong cùng hàng, không đẩy count ra mép card.

## 5. Tóm tắt vận hành hôm nay

- Backend bổ sung `snapshotAt` ISO date-time từ đúng snapshot dùng truy vấn today operations.
- Header hiển thị `Cập nhật đến HH:mm - dd/MM/yyyy` theo múi giờ `Asia/Ho_Chi_Minh`.
- Đủ ba metric:
  - Đơn chờ xử lý, icon cam.
  - Đơn giao thành công, icon xanh lá.
  - Tỷ lệ hoàn thành đơn, icon xanh dương.
- Các giá trị dùng formatter thống nhất; tỷ lệ 0 hiển thị `0.0%`.

## 6. Responsive

- Source contract:
  - desktop/laptop: Payment và Today Summary cùng hàng từ breakpoint `lg`;
  - tablet/mobile: tự stack một cột;
  - biểu đồ tuần dùng bốn cột co giãn, nhãn ngày kích thước nhỏ có kiểm soát;
  - toàn bộ container có `min-w-0`.
- Manual 1280×720: không horizontal overflow, chart đủ bốn bucket, hai card cùng hàng.
- Chưa thể xác nhận thủ công 1440×900, 1366×768, 1024×768, 768×1024, 390×844 và 320×700 vì viewport override của browser không thay đổi viewport thực tế. Đây là blocker duy nhất của DONE gate.

## 7. Verification

Backend:

- `npm test -- --runInBand src/modules/dashboard/dashboard.repository.spec.ts`: 1 suite, 4 tests PASS.
- `npm run type-check`: PASS.
- `npm run docs:check`: PASS, 197 operations, 252 schemas.
- `npm run build`: PASS, 462 files.
- `npm test -- --runInBand`: 99 suites, 741 tests PASS.
- `npm run lint`: PASS.

Frontend:

- `npm run gen:api:local`: PASS; Orval và Zod generated, forbidden occurrences = 0.
- `npm test -- --run src/features/analytics/analytics-phase18.test.ts`: 1 file, 6 tests PASS.
- `npm run build`: PASS; bao gồm `vue-tsc`.
- `npm test -- --testTimeout=15000`: 169 files, 814 tests PASS.
- Lần full test đầu theo timeout mặc định có một lazy supplier test ngoài scope chạm ngưỡng 5 giây; rerun full với 15 giây PASS toàn bộ.
- `git diff --check`: chạy ở bước kiểm soát cuối.

## 8. Manual browser

- Đăng nhập `branchadmin.hg@bookora.local`: PASS.
- Tên branch trong mô tả: `Chi nhánh Hậu Giang`.
- Bốn tuần hiển thị: 06/07–12/07, 13/07–19/07, 20/07–26/07, 27/07–02/08; ba bucket đầu 0, bucket cuối 969.500 ₫.
- Payment: COD 10 (32.3%), VNPAY 21 (67.7%), tổng 31.
- Today Summary có timestamp backend và đủ ba metric/icon.
- Reload giữ URL `/branch-admin/dashboard`, tài khoản và scope Hậu Giang.
- Không xuất hiện dữ liệu/nhãn Chi nhánh Cần Thơ.
- Console warn/error: 0.
- UI không có trạng thái lỗi request; browser surface không cung cấp danh sách response status để audit network chi tiết.
- Fixture Branch Admin chỉ được cấp một branch nên thao tác switch branch không khả dụng; cache key vẫn được bind theo branch ID và F5 giữ đúng scope.

## 9. Regression

- Đăng nhập lại Super Admin và kiểm tra `/super-admin/dashboard`: tải dữ liệu global bình thường.
- Vẫn hiển thị `Hiệu quả theo chi nhánh`.
- Không render hai card chỉ dành cho Branch Admin.
- Không horizontal overflow và không có `NaN`/`Infinity`.
- GitNexus impact trước sửa ở mức LOW; không có thay đổi HIGH/CRITICAL.

## 10. Kết luận

PHASE 18 — BRANCH ADMIN DASHBOARD VISUAL HOTFIX — PENDING

Blocker còn lại: manual verification đủ sáu viewport do browser viewport override không áp dụng kích thước thực tế.
