import { describe, expect, it } from "vitest";
import filterSource from "./AnalyticsFilterBar.vue?raw";
import dashboardSource from "./DashboardView.vue?raw";
import metricSource from "./MetricCard.vue?raw";
import reportSource from "./RevenueReportPage.vue?raw";
import {
  analyticsScopeKey,
  formatCurrency,
  formatDateLabel,
  formatNumber,
  formatPercent,
} from "@/features/analytics/analytics-format";
import {
  bucketOrderStatuses,
  dashboardGroupLabel,
  formatDashboardSnapshot,
  paymentShare,
  presentWeeklyPerformance,
} from "@/features/analytics/dashboard-presenter";
import {
  dashboardOverview,
  getDashboardOverviewQueryKey,
} from "@/api/generated/endpoints/dashboard/dashboard";
import {
  revenueReportExport,
  revenueReportSummary,
} from "@/api/generated/endpoints/revenue-reports/revenue-reports";
import {
  selectLeadingBranch,
  selectTopRevenuePeriod,
  sortRevenueBranches,
} from "@/features/analytics/revenue-report-presenter";

describe("Phase 18 analytics contract", () => {
  it("keeps global and branch cache scopes distinct", () => {
    expect(analyticsScopeKey(null)).toBe("global");
    expect(analyticsScopeKey("branch-a")).toBe("branch-a");
    expect(getDashboardOverviewQueryKey({ preset: "30D" })).toEqual([
      "dashboard",
      "overview",
      { preset: "30D" },
    ]);
  });

  it("formats Vietnamese analytics values without changing source numbers", () => {
    expect(formatCurrency(1_285_000)).toMatch(/1[.\s]285[.\s]000/);
    expect(formatNumber(3921)).toBe("3.921");
    expect(formatPercent(12.34)).toBe("+12.3%");
    expect(formatPercent(null)).toBe("Chưa có dữ liệu kỳ trước");
    expect(formatDateLabel("2026-07-30")).toBe("30/07");
  });

  it("exposes generated dashboard, report, and CSV operations", () => {
    expect(dashboardOverview).toBeTypeOf("function");
    expect(revenueReportSummary).toBeTypeOf("function");
    expect(revenueReportExport).toBeTypeOf("function");
  });

  it("uses the shared shadcn controls and bounded dashboard layout", () => {
    expect(filterSource).toContain("DataTableDateRangeFilter");
    expect(filterSource).toContain("enable-presets");
    expect(reportSource).not.toContain("<select");
    expect(reportSource).toContain("<SelectTrigger");
    expect(dashboardSource).toContain('<Select v-model="groupBy">');
    expect(dashboardSource).toContain("groupBy: groupBy.value");
    expect(dashboardSource).toContain("xl:grid-cols-5");
    expect(dashboardSource).toContain("ProductThumbnail");
    expect(dashboardSource).toContain("Xem tất cả");
    expect(dashboardSource).toContain('query: { stockState: "LOW_STOCK" }');
    expect(dashboardSource).toContain(
      "{{ item.label }}: {{ formatCurrency(item.revenue) }}",
    );
    expect(metricSource).toContain("h-1.5");
    expect(metricSource).toContain(':class="iconClass"');
    expect(metricSource).toContain("rounded-full");
    expect(dashboardSource).toContain(
      "grid-cols-[minmax(0,1fr)_auto] items-center",
    );
    expect(dashboardSource).toContain("VisScatter");
    expect(dashboardSource).toContain(
      '<VisTooltip :triggers="trendTooltipTriggers"',
    );
    expect(dashboardSource).toContain(
      '<VisTooltip :triggers="statusTooltipTriggers"',
    );
    expect(dashboardSource).toContain(
      '<VisTooltip :triggers="paymentTooltipTriggers"',
    );
    expect(dashboardSource).toContain('@click="selectStatus(item)"');
    expect(dashboardSource).toContain('@click="selectPayment(item)"');
    expect(dashboardSource).toContain('@click="selectPerformance(item)"');
    expect(dashboardSource).toContain(
      ':aria-pressed="selectedPerformanceKey === item.key"',
    );
    expect(dashboardSource).toContain(
      "cursor-pointer p-0 font-semibold text-blue-600",
    );
    expect(dashboardSource).toContain("'text-red-600'");
    expect(dashboardSource).toContain("'text-orange-600'");
    expect(dashboardSource).not.toContain("bg-red-100");
    expect(dashboardSource).not.toContain(
      "rounded-full px-2 py-1 text-xs font-medium",
    );
  });

  it("renders the bounded revenue-report visual contract", () => {
    expect(reportSource).toContain("VisStackedBar");
    expect(reportSource).toContain("VisLine");
    expect(reportSource).toContain("VisScatter");
    expect(reportSource).toContain("[VisScatterSelectors.point]");
    expect(reportSource).toContain(':events="trendPointEvents"');
    expect(reportSource).toContain('@click="selectBranch(item)"');
    expect(reportSource).toContain(
      ':aria-pressed="selectedBranchId === item.branchId"',
    );
    expect(reportSource).toContain(
      "Biểu đồ doanh thu hoàn tất trong kỳ đã chọn.",
    );
    expect(reportSource).toContain("VisDonut");
    expect(reportSource).toContain("compositionTotal === 0");
    expect(reportSource).toContain("item.data.label");
    expect(reportSource).toContain(
      "bg-blue-600 transition-[width,filter] duration-300",
    );
    expect(reportSource).toContain("canCompareBranches");
    expect(reportSource).toContain(
      "canCompareBranches.value ? (summary.value?.leadingBranch ?? null) : null",
    );
    expect(reportSource).toContain('v-if="canCompareBranches"');
    expect(reportSource).toContain(
      ":class=\"canCompareBranches ? 'md:grid-cols-3' : 'md:grid-cols-2'\"",
    );
    expect(reportSource).not.toContain('v-if="isSuperAdminPage"');
    expect(reportSource).toContain("Doanh thu giảm dần");
    expect(reportSource).toContain("Doanh thu tăng dần");
    expect(reportSource).toContain('type="auto"');
    expect(reportSource).toContain('scrollbar-orientation="horizontal"');
    expect(reportSource).toContain("hover:text-primary");
    expect(reportSource).toContain("trong khoảng thời gian đã chọn.");
    expect(reportSource).toContain("Chi nhánh dẫn đầu");
    expect(reportSource).toContain("Tỷ lệ hoàn tất đơn");
    expect(reportSource).toContain(
      'icon-class="bg-emerald-50 text-emerald-600"',
    );
  });

  it("sorts branch revenue stably and selects deterministic insights", () => {
    const branches = [
      {
        branchId: "branch-b",
        branchCode: "B",
        branchName: "B",
        isActive: true,
        completedOrders: 1,
        soldQuantity: 1,
        totalRevenue: 100,
        averageOrderValue: 100,
      },
      {
        branchId: "branch-a",
        branchCode: "A",
        branchName: "A",
        isActive: true,
        completedOrders: 1,
        soldQuantity: 1,
        totalRevenue: 100,
        averageOrderValue: 100,
      },
      {
        branchId: "branch-c",
        branchCode: "C",
        branchName: "C",
        isActive: true,
        completedOrders: 1,
        soldQuantity: 1,
        totalRevenue: 50,
        averageOrderValue: 50,
      },
    ];
    const periods = [
      {
        key: "2026-07-02",
        label: "02/07/2026",
        from: "2026-07-02",
        to: "2026-07-02",
        completedOrders: 1,
        soldQuantity: 1,
        merchandiseRevenue: 90,
        shippingRevenue: 10,
        totalRevenue: 100,
        averageOrderValue: 100,
      },
      {
        key: "2026-07-01",
        label: "01/07/2026",
        from: "2026-07-01",
        to: "2026-07-01",
        completedOrders: 1,
        soldQuantity: 1,
        merchandiseRevenue: 90,
        shippingRevenue: 10,
        totalRevenue: 100,
        averageOrderValue: 100,
      },
    ];

    expect(
      sortRevenueBranches(branches, "desc").map((item) => item.branchId),
    ).toEqual(["branch-b", "branch-a", "branch-c"]);
    expect(
      sortRevenueBranches(branches, "asc").map((item) => item.branchId),
    ).toEqual(["branch-c", "branch-b", "branch-a"]);
    expect(selectLeadingBranch(branches)?.branchId).toBe("branch-a");
    expect(selectTopRevenuePeriod(periods)?.key).toBe("2026-07-01");
  });

  it("maps raw order statuses into exactly six Vietnamese buckets", () => {
    const buckets = bucketOrderStatuses([
      { status: "PENDING_PAYMENT", count: 2 },
      { status: "PAYMENT_FAILED", count: 3 },
      { status: "PENDING", count: 5 },
      { status: "CONFIRMED", count: 7 },
      { status: "PACKING", count: 11 },
      { status: "SHIPPING", count: 13 },
      { status: "COMPLETED", count: 17 },
      { status: "CANCELLED", count: 19 },
      { status: "RETURNED", count: 23 },
    ]);

    expect(buckets.map((item) => item.label)).toEqual([
      "Chờ xác nhận",
      "Đã xác nhận",
      "Đang xử lý",
      "Đang giao",
      "Hoàn thành",
      "Đã hủy",
    ]);
    expect(buckets.map((item) => item.count)).toEqual([7, 7, 11, 13, 17, 45]);
    expect(buckets.reduce((total, item) => total + item.count, 0)).toBe(100);
    expect(dashboardGroupLabel("DAY")).toBe("ngày");
    expect(dashboardGroupLabel("WEEK")).toBe("tuần");
    expect(dashboardGroupLabel("MONTH")).toBe("tháng");
  });

  it("presents the bounded Branch Admin dashboard visual contract", () => {
    const weeks = presentWeeklyPerformance([
      { key: "2026-06-29", label: "raw", revenue: 0, completedOrders: 0 },
      { key: "2026-07-06", label: "raw", revenue: 100, completedOrders: 1 },
      { key: "2026-07-13", label: "raw", revenue: 200, completedOrders: 2 },
      { key: "2026-07-20", label: "raw", revenue: 300, completedOrders: 3 },
      { key: "2026-07-27", label: "raw", revenue: 400, completedOrders: 4 },
    ]);

    expect(weeks).toHaveLength(4);
    expect(weeks.map((item) => item.weekLabel)).toEqual([
      "Tuần 1",
      "Tuần 2",
      "Tuần 3",
      "Tuần 4",
    ]);
    expect(weeks[3]?.dateRange).toBe("27/07 - 02/08");
    expect(paymentShare(10, 40)).toBe(25);
    expect(paymentShare(0, 0)).toBe(0);
    expect(formatDashboardSnapshot("2026-07-30T03:30:00.000Z")).toBe(
      "10:30 - 30/07/2026",
    );
    expect(dashboardSource).toContain("Hiệu suất 4 tuần gần đây");
    expect(dashboardSource).toContain("overview.value?.scope.branch?.name");
    expect(dashboardSource).toContain(
      'aria-label="Biểu đồ cột doanh thu bốn tuần gần đây"',
    );
    expect(dashboardSource).toContain("lg:grid-cols-2");
    expect(dashboardSource).toContain("item.percentage.toFixed(1)");
    expect(dashboardSource).toContain("overview.todayOperations.snapshotAt");
    expect(dashboardSource).toContain("<CircleCheckBig");
    expect(dashboardSource).toContain("<Target");
  });
});
