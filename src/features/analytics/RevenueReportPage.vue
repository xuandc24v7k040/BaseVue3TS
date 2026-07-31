<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { toast } from "vue-sonner";
import {
  ArrowUp,
  Banknote,
  BarChart3,
  Box,
  ClipboardCheck,
  Download,
  ReceiptText,
  Target,
  Truck,
} from "@lucide/vue";
import {
  VisArea,
  VisAxis,
  VisDonut,
  VisDonutSelectors,
  VisLine,
  VisScatter,
  VisScatterSelectors,
  VisSingleContainer,
  VisStackedBar,
  VisStackedBarSelectors,
  VisTooltip,
  VisXYContainer,
} from "@unovis/vue";
import type {
  RevenueBranchDto,
  RevenueReportSummaryParams,
  RevenueReportTableParams,
  RevenueReportTrendParams,
  RevenueTrendBucketDto,
} from "@/api/generated/models";
import {
  revenueReportBranches,
  revenueReportExport,
  revenueReportSummary,
  revenueReportTable,
  revenueReportTrend,
} from "@/api/generated/endpoints/revenue-reports/revenue-reports";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { useBranchStore } from "@/stores/branch.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import AnalyticsFilterBar, {
  type AnalyticsPreset,
} from "@/features/analytics/AnalyticsFilterBar.vue";
import MetricCard from "@/features/analytics/MetricCard.vue";
import {
  analyticsScopeKey,
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
} from "@/features/analytics/analytics-format";
import {
  selectTopRevenuePeriod,
  sortRevenueBranches,
  type RevenueBranchSortOrder,
} from "@/features/analytics/revenue-report-presenter";

type GroupBy = "DAY" | "WEEK" | "MONTH";
type PaymentMethod = "ALL" | "COD" | "VNPAY";
type CompositionItem = {
  key: "merchandise" | "shipping";
  label: string;
  value: number;
  color: string;
};
type CompositionTooltipDatum = {
  data: CompositionItem;
  value: number;
};

const route = useRoute();
const router = useRouter();
const branchStore = useBranchStore();
const { can } = useAdminPermissions();

const preset = ref<AnalyticsPreset>(
  ["7D", "30D", "90D", "CUSTOM"].includes(String(route.query.preset))
    ? (String(route.query.preset) as AnalyticsPreset)
    : "30D",
);
const from = ref(typeof route.query.from === "string" ? route.query.from : "");
const to = ref(typeof route.query.to === "string" ? route.query.to : "");
const groupBy = ref<GroupBy>(
  ["DAY", "WEEK", "MONTH"].includes(String(route.query.groupBy))
    ? (String(route.query.groupBy) as GroupBy)
    : "DAY",
);
const paymentMethod = ref<PaymentMethod>(
  ["ALL", "COD", "VNPAY"].includes(String(route.query.paymentMethod))
    ? (String(route.query.paymentMethod) as PaymentMethod)
    : "ALL",
);
const branchSortOrder = ref<RevenueBranchSortOrder>(
  route.query.branchSort === "asc" ? "asc" : "desc",
);
const page = ref(Math.max(1, Number(route.query.page) || 1));
const limit = ref(
  [10, 20, 50].includes(Number(route.query.limit))
    ? Number(route.query.limit)
    : 10,
);
const exporting = ref(false);
const selectedTrendKey = ref<string | null>(null);
const selectedBranchId = ref<string | null>(null);
const branchId = computed(() => branchStore.selectedBranchId);
const scopedRequest = computed(() =>
  branchId.value ? ({ branchScoped: true } as const) : undefined,
);
const rangeParams = computed(() =>
  preset.value === "CUSTOM"
    ? { from: from.value, to: to.value }
    : { preset: preset.value },
);
const filtersValid = computed(
  () =>
    preset.value !== "CUSTOM" ||
    Boolean(from.value && to.value && from.value <= to.value),
);
const commonParams = computed<RevenueReportSummaryParams>(() => ({
  ...rangeParams.value,
  groupBy: groupBy.value,
  paymentMethod: paymentMethod.value,
}));
const tableParams = computed<RevenueReportTableParams>(() => ({
  ...commonParams.value,
  page: page.value,
  limit: limit.value,
  sortOrder: "asc",
}));
const queryScope = computed(() => analyticsScopeKey(branchId.value));
const isSuperAdminPage = computed(() =>
  String(route.name).startsWith("super-admin-"),
);
const canCompareBranches = computed(
  () => isSuperAdminPage.value && !branchId.value,
);

const summaryQuery = useQuery({
  queryKey: computed(() => [
    "analytics",
    "revenue",
    "summary",
    queryScope.value,
    commonParams.value,
  ]),
  queryFn: ({ signal }) =>
    revenueReportSummary(commonParams.value, scopedRequest.value, signal),
  enabled: filtersValid,
  refetchOnWindowFocus: true,
});
const trendQuery = useQuery({
  queryKey: computed(() => [
    "analytics",
    "revenue",
    "trend",
    queryScope.value,
    commonParams.value,
  ]),
  queryFn: ({ signal }) =>
    revenueReportTrend(
      commonParams.value as RevenueReportTrendParams,
      scopedRequest.value,
      signal,
    ),
  enabled: filtersValid,
  refetchOnWindowFocus: true,
});
const branchesQuery = useQuery({
  queryKey: computed(() => [
    "analytics",
    "revenue",
    "branches",
    queryScope.value,
    commonParams.value,
  ]),
  queryFn: ({ signal }) =>
    revenueReportBranches(commonParams.value, scopedRequest.value, signal),
  enabled: computed(() => filtersValid.value && canCompareBranches.value),
  refetchOnWindowFocus: true,
});
const tableQuery = useQuery({
  queryKey: computed(() => [
    "analytics",
    "revenue",
    "table",
    queryScope.value,
    tableParams.value,
  ]),
  queryFn: ({ signal }) =>
    revenueReportTable(tableParams.value, scopedRequest.value, signal),
  enabled: filtersValid,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: true,
});

const summary = computed(() => summaryQuery.data.value?.data);
const trend = computed(() => trendQuery.data.value?.data.items ?? []);
const branches = computed(() => branchesQuery.data.value?.data.items ?? []);
const sortedBranches = computed(() =>
  sortRevenueBranches(branches.value, branchSortOrder.value),
);
const rows = computed(() => tableQuery.data.value?.data ?? []);
const meta = computed(() => tableQuery.data.value?.meta);
const loading = computed(
  () =>
    summaryQuery.isPending.value ||
    trendQuery.isPending.value ||
    tableQuery.isPending.value,
);
const failed = computed(
  () =>
    summaryQuery.isError.value ||
    trendQuery.isError.value ||
    tableQuery.isError.value,
);

watch([preset, from, to, groupBy, paymentMethod, limit], () => {
  page.value = 1;
});

watch(
  [preset, from, to, groupBy, paymentMethod, page, limit, branchSortOrder],
  () => {
    void router.replace({
      query: {
        ...route.query,
        preset: preset.value,
        ...(preset.value === "CUSTOM"
          ? { from: from.value, to: to.value }
          : { from: undefined, to: undefined }),
        groupBy: groupBy.value,
        paymentMethod: paymentMethod.value,
        page: String(page.value),
        limit: String(limit.value),
        branchSort: branchSortOrder.value,
      },
    });
  },
  { flush: "post" },
);

function selectPreset(value: Exclude<AnalyticsPreset, "CUSTOM">): void {
  preset.value = value;
}

function selectCustom(value: { from: string; to: string }): void {
  preset.value = "CUSTOM";
  from.value = value.from;
  to.value = value.to;
}

async function exportCsv(): Promise<void> {
  exporting.value = true;
  try {
    const blob = await revenueReportExport(
      { ...commonParams.value, sortOrder: "asc" },
      scopedRequest.value,
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bookora-doanh-thu-${from.value || preset.value}-${to.value || "hien-tai"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Không thể xuất báo cáo CSV. Vui lòng thử lại.");
  } finally {
    exporting.value = false;
  }
}

function retryAll(): void {
  void summaryQuery.refetch();
  void trendQuery.refetch();
  if (canCompareBranches.value) {
    void branchesQuery.refetch();
  }
  void tableQuery.refetch();
}

const trendX = (_: RevenueTrendBucketDto, index: number) => index;
const trendY = (item: RevenueTrendBucketDto) => item.totalRevenue;
const maxTrendRevenue = computed(() =>
  Math.max(...trend.value.map((item) => item.totalRevenue), 1),
);
const maxTrendOrders = computed(() =>
  Math.max(...trend.value.map((item) => item.completedOrders), 1),
);
const orderScaleFactor = computed(
  () => (maxTrendRevenue.value / maxTrendOrders.value) * 0.32,
);
const orderY = (item: RevenueTrendBucketDto) =>
  item.completedOrders * orderScaleFactor.value;
const trendTick = (index: number) =>
  trend.value[Math.round(index)]?.label ?? "";
const trendHasData = computed(() =>
  trend.value.some((item) => item.totalRevenue > 0 || item.completedOrders > 0),
);
const selectedTrendPeriod = computed(
  () => trend.value.find((item) => item.key === selectedTrendKey.value) ?? null,
);
const renderTrendTooltip = (item: RevenueTrendBucketDto) => `
  <div class="space-y-1 text-sm">
    <strong>${item.label}</strong>
    <div>Tổng doanh thu: ${formatCurrency(item.totalRevenue)}</div>
    <div>Đơn hoàn tất: ${formatNumber(item.completedOrders)}</div>
    <div>Tiền hàng: ${formatCurrency(item.merchandiseRevenue)}</div>
    <div>Phí vận chuyển: ${formatCurrency(item.shippingRevenue)}</div>
  </div>
`;
const trendTooltipTriggers = {
  [VisStackedBarSelectors.bar]: renderTrendTooltip,
  [VisScatterSelectors.point]: renderTrendTooltip,
};
const selectTrendPeriod = (item: RevenueTrendBucketDto): void => {
  selectedTrendKey.value =
    selectedTrendKey.value === item.key ? null : item.key;
};
const trendBarEvents = {
  [VisStackedBarSelectors.bar]: {
    click: selectTrendPeriod,
  },
};
const trendPointEvents = {
  [VisScatterSelectors.point]: {
    click: selectTrendPeriod,
  },
};
const compositionItems = computed<CompositionItem[]>(() => [
  {
    key: "merchandise",
    label: "Tiền hàng",
    value: summary.value?.merchandiseRevenue ?? 0,
    color: "#3b82f6",
  },
  {
    key: "shipping",
    label: "Phí vận chuyển",
    value: summary.value?.shippingRevenue ?? 0,
    color: "#06b6d4",
  },
]);
const compositionTotal = computed(() =>
  compositionItems.value.reduce((total, item) => total + item.value, 0),
);
const compositionValue = (item: CompositionItem) => item.value;
const compositionColors = (item: CompositionItem) => item.color;
const compositionTooltipTriggers = {
  [VisDonutSelectors.segment]: (item: CompositionTooltipDatum) =>
    `${item.data.label}: ${formatCurrency(item.value)}`,
};
const compositionPercent = (value: number) =>
  compositionTotal.value === 0
    ? "0%"
    : `${((value / compositionTotal.value) * 100).toLocaleString("vi-VN", {
        maximumFractionDigits: 1,
      })}%`;
const maxBranchRevenue = computed(() =>
  Math.max(...branches.value.map((item) => item.totalRevenue), 1),
);
const selectBranch = (item: RevenueBranchDto): void => {
  selectedBranchId.value =
    selectedBranchId.value === item.branchId ? null : item.branchId;
};
const topRevenuePeriod = computed(() => selectTopRevenuePeriod(trend.value));
const leadingBranch = computed<RevenueBranchDto | null>(() =>
  canCompareBranches.value ? (summary.value?.leadingBranch ?? null) : null,
);
const completionRateLabel = computed(
  () =>
    `${(summary.value?.completionRate ?? 0).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })}%`,
);
</script>

<template>
  <section class="space-y-4">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">Báo cáo doanh thu</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Phân tích doanh thu đơn hoàn tất theo thời gian và phạm vi
        {{ branchId ? branchStore.selectedBranch?.name : "toàn hệ thống" }}.
      </p>
    </header>

    <div class="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
      <AnalyticsFilterBar
        :preset="preset"
        :from="from"
        :to="to"
        :busy="loading"
        @preset-change="selectPreset"
        @custom-change="selectCustom"
      />
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-sm text-muted-foreground" for="revenue-group"
          >Nhóm theo</label
        >
        <Select v-model="groupBy">
          <SelectTrigger id="revenue-group" class="w-36">
            <SelectValue placeholder="Chọn cách nhóm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DAY">Theo ngày</SelectItem>
            <SelectItem value="WEEK">Theo tuần</SelectItem>
            <SelectItem value="MONTH">Theo tháng</SelectItem>
          </SelectContent>
        </Select>
        <label class="ml-2 text-sm text-muted-foreground" for="revenue-payment"
          >Thanh toán</label
        >
        <Select v-model="paymentMethod">
          <SelectTrigger id="revenue-payment" class="w-32">
            <SelectValue placeholder="Chọn thanh toán" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="COD">COD</SelectItem>
            <SelectItem value="VNPAY">VNPAY</SelectItem>
          </SelectContent>
        </Select>
        <Button
          v-if="can(ADMIN_PERMISSIONS.REPORTS_EXPORT)"
          class="ml-auto"
          variant="outline"
          :disabled="exporting || !filtersValid"
          @click="exportCsv"
        >
          <Download class="mr-2 size-4" />
          {{ exporting ? "Đang xuất..." : "Xuất CSV" }}
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">
        Chỉ tính đơn có sự kiện chuyển trạng thái sang Hoàn thành trong phạm vi
        đã chọn.
      </p>
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Skeleton v-for="item in 5" :key="item" class="h-28 rounded-xl" />
    </div>
    <Card v-else-if="failed">
      <CardContent
        class="flex min-h-40 flex-col items-center justify-center gap-3"
      >
        <p class="font-medium">Không thể tải báo cáo doanh thu.</p>
        <Button @click="retryAll">Thử lại</Button>
      </CardContent>
    </Card>

    <template v-else-if="summary">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Doanh thu thuần"
          :value="formatCurrency(summary.completedRevenue)"
          :icon="Banknote"
          accent-class="bg-emerald-500"
          icon-class="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          label="Đơn hoàn tất"
          :value="formatNumber(summary.completedOrders)"
          :icon="ClipboardCheck"
          accent-class="bg-blue-500"
          icon-class="bg-blue-50 text-blue-600"
        />
        <MetricCard
          label="Sản phẩm bán ra"
          :value="formatNumber(summary.soldQuantity)"
          :icon="Box"
          accent-class="bg-violet-500"
          icon-class="bg-violet-50 text-violet-600"
        />
        <MetricCard
          label="Giá trị đơn trung bình"
          :value="formatCurrency(summary.averageOrderValue)"
          :icon="ReceiptText"
          accent-class="bg-orange-500"
          icon-class="bg-orange-50 text-orange-600"
        />
        <MetricCard
          label="Phí vận chuyển"
          :value="formatCurrency(summary.shippingRevenue)"
          :icon="Truck"
          accent-class="bg-cyan-500"
          icon-class="bg-cyan-50 text-cyan-600"
        />
      </div>

      <div class="grid gap-4 xl:grid-cols-12">
        <Card class="min-w-0 xl:col-span-8">
          <CardHeader
            class="gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0">
              <CardTitle>Doanh thu theo thời gian</CardTitle>
              <p class="mt-1 text-sm text-muted-foreground">
                Biểu đồ doanh thu hoàn tất trong kỳ đã chọn.
              </p>
            </div>
            <div
              class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
            >
              <span class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-full bg-blue-600" />
                Doanh thu
              </span>
              <span class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-sm bg-blue-200" />
                Đơn hoàn tất
              </span>
            </div>
          </CardHeader>
          <CardContent class="min-w-0">
            <div
              v-if="!trendHasData"
              class="flex h-[300px] items-center justify-center text-sm text-muted-foreground"
            >
              Chưa có doanh thu hoặc đơn hoàn tất trong kỳ này.
            </div>
            <div v-else class="min-w-0">
              <VisXYContainer
                :data="trend"
                :height="300"
                :margin="{ left: 8, right: 8, top: 12, bottom: 8 }"
              >
                <VisStackedBar
                  :x="trendX"
                  :y="orderY"
                  color="#bfdbfe"
                  :bar-padding="0.55"
                  :rounded-corners="3"
                  :events="trendBarEvents"
                />
                <VisArea
                  :x="trendX"
                  :y="trendY"
                  color="#2563eb"
                  :opacity="0.1"
                />
                <VisLine
                  :x="trendX"
                  :y="trendY"
                  color="#2563eb"
                  :line-width="3"
                />
                <VisScatter
                  :x="trendX"
                  :y="trendY"
                  color="#2563eb"
                  stroke-color="#ffffff"
                  :stroke-width="2"
                  :size="9"
                  cursor="pointer"
                  :events="trendPointEvents"
                />
                <VisAxis
                  type="x"
                  :tick-format="trendTick"
                  :num-ticks="6"
                  :tick-text-hide-overlapping="true"
                />
                <VisAxis
                  type="y"
                  :tick-format="formatCompactCurrency"
                  :num-ticks="5"
                />
                <VisTooltip :triggers="trendTooltipTriggers" />
              </VisXYContainer>
              <div
                v-if="selectedTrendPeriod"
                class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-950"
                aria-live="polite"
              >
                <strong>{{ selectedTrendPeriod.label }}</strong>
                <span>
                  Doanh thu:
                  {{ formatCurrency(selectedTrendPeriod.totalRevenue) }}
                </span>
                <span>
                  Đơn hoàn tất:
                  {{ formatNumber(selectedTrendPeriod.completedOrders) }}
                </span>
                <button
                  type="button"
                  class="ml-auto font-medium text-blue-700 hover:underline"
                  @click="selectedTrendKey = null"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="min-w-0 xl:col-span-4">
          <CardHeader class="pb-2"
            ><CardTitle>Cơ cấu doanh thu</CardTitle></CardHeader
          >
          <CardContent
            class="grid min-w-0 items-center gap-4 sm:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[180px_minmax(0,1fr)]"
          >
            <div class="relative mx-auto w-full max-w-[180px]">
              <VisSingleContainer
                v-if="compositionTotal > 0"
                :data="compositionItems"
                :height="180"
              >
                <VisDonut
                  :value="compositionValue"
                  :color="compositionColors"
                  :arc-width="24"
                />
                <VisTooltip :triggers="compositionTooltipTriggers" />
              </VisSingleContainer>
              <div
                v-else
                class="mx-auto size-[150px] rounded-full border-[22px] border-muted"
              />
              <div
                class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
              >
                <strong class="max-w-full truncate text-base">
                  {{ formatCompactCurrency(summary.completedRevenue) }}
                </strong>
                <span class="text-xs text-muted-foreground"
                  >Tổng doanh thu</span
                >
              </div>
            </div>
            <div class="min-w-0 space-y-4">
              <div
                v-for="item in compositionItems"
                :key="item.key"
                class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm"
              >
                <span
                  class="mt-1 size-2.5 rounded-full"
                  :style="{ backgroundColor: item.color }"
                />
                <div class="min-w-0">
                  <div class="flex min-w-0 justify-between gap-2">
                    <span class="truncate">{{ item.label }}</span>
                    <strong class="shrink-0">{{
                      formatCurrency(item.value)
                    }}</strong>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {{ compositionPercent(item.value) }}
                  </p>
                </div>
              </div>
              <p
                v-if="compositionTotal === 0"
                class="text-xs text-muted-foreground"
              >
                Chưa có doanh thu trong kỳ này.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card v-if="canCompareBranches" class="min-w-0">
        <CardHeader class="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <CardTitle>Doanh thu theo chi nhánh</CardTitle>
            <p class="mt-1 text-sm text-muted-foreground">
              So sánh doanh thu hoàn tất giữa các chi nhánh trong kỳ.
            </p>
          </div>
          <Select v-model="branchSortOrder">
            <SelectTrigger
              class="w-full sm:w-52"
              aria-label="Sắp xếp doanh thu chi nhánh"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Doanh thu giảm dần</SelectItem>
              <SelectItem value="asc">Doanh thu tăng dần</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent class="min-w-0">
          <div
            v-if="sortedBranches.length"
            class="space-y-4"
            role="group"
            aria-label="Biểu đồ thanh ngang doanh thu theo chi nhánh"
          >
            <button
              v-for="item in sortedBranches"
              :key="item.branchId"
              type="button"
              :aria-pressed="selectedBranchId === item.branchId"
              class="group relative block w-full rounded-lg p-2 text-left transition-[background-color,box-shadow] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="
                selectedBranchId === item.branchId
                  ? 'bg-blue-50 ring-2 ring-blue-500'
                  : ''
              "
              @click="selectBranch(item)"
            >
              <div class="mb-1.5 flex min-w-0 justify-between gap-3 text-sm">
                <span class="min-w-0 truncate" :title="item.branchName">
                  {{ item.branchName }}
                </span>
                <strong class="shrink-0 text-xs sm:text-sm">
                  {{ formatCurrency(item.totalRevenue) }}
                </strong>
              </div>
              <div class="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-blue-600 transition-[width,filter] duration-300 group-hover:brightness-110"
                  :style="{
                    width: `${Math.max(2, (item.totalRevenue / maxBranchRevenue) * 100)}%`,
                  }"
                />
              </div>
              <span
                class="pointer-events-none absolute right-2 top-full z-20 mt-1 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {{ formatNumber(item.completedOrders) }} đơn hoàn tất ·
                {{ formatNumber(item.soldQuantity) }} sản phẩm
              </span>
            </button>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            Chưa có dữ liệu chi nhánh.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <CardTitle>Bảng tổng hợp doanh thu</CardTitle>
            <p class="mt-1 text-sm text-muted-foreground">
              Chi tiết doanh thu theo từng
              {{
                groupBy === "DAY"
                  ? "ngày"
                  : groupBy === "WEEK"
                    ? "tuần"
                    : "tháng"
              }}
              trong khoảng thời gian đã chọn.
            </p>
          </div>
          <Select
            :model-value="String(limit)"
            @update:model-value="limit = Number($event)"
          >
            <SelectTrigger
              class="w-full sm:w-32"
              aria-label="Số dòng mỗi trang"
            >
              <SelectValue placeholder="Số dòng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 dòng</SelectItem>
              <SelectItem value="20">20 dòng</SelectItem>
              <SelectItem value="50">50 dòng</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent class="p-0">
          <ScrollArea
            type="auto"
            scrollbar-orientation="horizontal"
            class="w-full pb-3"
          >
            <Table class="min-w-[920px]">
              <TableHeader
                ><TableRow
                  ><TableHead>Thời gian</TableHead
                  ><TableHead class="text-right">Đơn hoàn tất</TableHead
                  ><TableHead class="text-right">Sản phẩm bán</TableHead
                  ><TableHead class="text-right">Tiền hàng</TableHead
                  ><TableHead class="text-right">Phí vận chuyển</TableHead
                  ><TableHead class="text-right">Tổng doanh thu</TableHead
                  ><TableHead class="text-right"
                    >Giá trị đơn TB</TableHead
                  ></TableRow
                ></TableHeader
              >
              <TableBody>
                <TableRow
                  v-for="row in rows"
                  :key="row.key"
                  class="transition-colors hover:bg-primary/5 hover:text-primary hover:font-medium"
                >
                  <TableCell class="font-medium">{{ row.label }}</TableCell
                  ><TableCell class="text-right">{{
                    formatNumber(row.completedOrders)
                  }}</TableCell
                  ><TableCell class="text-right">{{
                    formatNumber(row.soldQuantity)
                  }}</TableCell
                  ><TableCell class="text-right">{{
                    formatCurrency(row.merchandiseRevenue)
                  }}</TableCell
                  ><TableCell class="text-right">{{
                    formatCurrency(row.shippingRevenue)
                  }}</TableCell
                  ><TableCell class="text-right font-medium">{{
                    formatCurrency(row.totalRevenue)
                  }}</TableCell
                  ><TableCell class="text-right">{{
                    formatCurrency(row.averageOrderValue)
                  }}</TableCell>
                </TableRow>
                <TableRow v-if="rows.length === 0"
                  ><TableCell
                    colspan="7"
                    class="h-32 text-center text-muted-foreground"
                    >Chưa có dữ liệu trong phạm vi đã chọn.</TableCell
                  ></TableRow
                >
              </TableBody>
            </Table>
          </ScrollArea>
          <div
            class="flex flex-col gap-3 border-t px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <span class="text-muted-foreground">{{
              meta ? `${meta.total} dòng` : "0 dòng"
            }}</span>
            <div class="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                :disabled="!meta?.hasPreviousPage"
                @click="page -= 1"
                >Trước</Button
              >
              <span
                >Trang {{ meta?.page ?? page }}/{{ meta?.lastPage ?? 1 }}</span
              >
              <Button
                size="sm"
                variant="outline"
                :disabled="!meta?.hasNextPage"
                @click="page += 1"
                >Sau</Button
              >
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent
          class="grid gap-4 p-5"
          :class="canCompareBranches ? 'md:grid-cols-3' : 'md:grid-cols-2'"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
            >
              <ArrowUp class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">
                {{ groupBy === "DAY" ? "Ngày" : "Kỳ" }} doanh thu cao nhất
              </p>
              <strong class="block truncate text-sm">
                {{
                  topRevenuePeriod
                    ? `${topRevenuePeriod.label} (${formatCurrency(topRevenuePeriod.totalRevenue)})`
                    : "Chưa có dữ liệu"
                }}
              </strong>
            </div>
          </div>

          <div
            v-if="canCompareBranches"
            class="flex min-w-0 items-center gap-3"
          >
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"
            >
              <BarChart3 class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">Chi nhánh dẫn đầu</p>
              <strong class="block truncate text-sm">
                {{
                  leadingBranch
                    ? `${leadingBranch.branchName} (${formatCurrency(leadingBranch.totalRevenue)})`
                    : "Chưa có dữ liệu"
                }}
              </strong>
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600"
            >
              <Target class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-muted-foreground">Tỷ lệ hoàn tất đơn</p>
              <strong class="block truncate text-sm">
                {{ completionRateLabel }}
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </section>
</template>
