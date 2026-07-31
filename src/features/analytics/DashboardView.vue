<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import {
  Banknote,
  BarChart3,
  Box,
  CircleCheckBig,
  ClipboardList,
  PackageOpen,
  PackageCheck,
  RefreshCw,
  Target,
} from "@lucide/vue";
import {
  VisArea,
  VisAxis,
  VisDonutSelectors,
  VisLine,
  VisScatter,
  VisScatterSelectors,
  VisSingleContainer,
  VisDonut,
  VisTooltip,
  VisXYContainer,
} from "@unovis/vue";
import type {
  DashboardOverviewParams,
  DashboardPaymentMethodDto,
  DashboardTrendPointDto,
} from "@/api/generated/models";
import { dashboardOverview } from "@/api/generated/endpoints/dashboard/dashboard";
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
import AnalyticsFilterBar, {
  type AnalyticsPreset,
} from "@/features/analytics/AnalyticsFilterBar.vue";
import MetricCard from "@/features/analytics/MetricCard.vue";
import ProductThumbnail from "@/features/analytics/ProductThumbnail.vue";
import {
  bucketOrderStatuses,
  dashboardGroupLabel,
  formatDashboardSnapshot,
  paymentShare,
  presentWeeklyPerformance,
  type DashboardGroupBy,
  type DashboardStatusBucket,
} from "@/features/analytics/dashboard-presenter";
import {
  analyticsScopeKey,
  formatCompactCurrency,
  formatCurrency,
  formatDateLabel,
  formatNumber,
} from "@/features/analytics/analytics-format";

type DashboardDonutDatum<T> = {
  data: T;
  value: number;
};
type PerformanceItem = {
  key: string;
  label: string;
  revenue: number;
};
type WeeklyPerformanceItem = ReturnType<
  typeof presentWeeklyPerformance
>[number];

const props = defineProps<{ mode: "system" | "branch" }>();
const route = useRoute();
const router = useRouter();
const branchStore = useBranchStore();

const allowedPresets = new Set<AnalyticsPreset>(["7D", "30D", "90D", "CUSTOM"]);
const initialPreset = String(route.query.preset ?? "30D") as AnalyticsPreset;
const preset = ref<AnalyticsPreset>(
  allowedPresets.has(initialPreset) ? initialPreset : "30D",
);
const from = ref(typeof route.query.from === "string" ? route.query.from : "");
const to = ref(typeof route.query.to === "string" ? route.query.to : "");
const groupBy = ref<DashboardGroupBy>(
  ["DAY", "WEEK", "MONTH"].includes(String(route.query.groupBy))
    ? (String(route.query.groupBy) as DashboardGroupBy)
    : "DAY",
);
const selectedTrendKey = ref<string | null>(null);
const selectedStatusKey = ref<string | null>(null);
const selectedPaymentMethod = ref<string | null>(null);
const selectedPerformanceKey = ref<string | null>(null);
const branchId = computed(() => branchStore.selectedBranchId);
const requestOptions = computed(() =>
  branchId.value ? ({ branchScoped: true } as const) : undefined,
);
const params = computed<DashboardOverviewParams>(() =>
  preset.value === "CUSTOM"
    ? { from: from.value, to: to.value, groupBy: groupBy.value }
    : { preset: preset.value, groupBy: groupBy.value },
);

const overviewQuery = useQuery({
  queryKey: computed(() => [
    "analytics",
    "dashboard",
    analyticsScopeKey(branchId.value),
    params.value,
  ]),
  queryFn: ({ signal }) =>
    dashboardOverview(params.value, requestOptions.value, signal),
  enabled: computed(
    () =>
      preset.value !== "CUSTOM" ||
      Boolean(from.value && to.value && from.value <= to.value),
  ),
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
});

const overview = computed(() => overviewQuery.data.value?.data);
const trend = computed(() => overview.value?.revenueTrend ?? []);
const statusBuckets = computed(() =>
  bucketOrderStatuses(overview.value?.orderStatus ?? []),
);
const totalStatuses = computed(() =>
  statusBuckets.value.reduce((sum, item) => sum + item.count, 0),
);
const peakTrend = computed(() =>
  trend.value.reduce<DashboardTrendPointDto | null>(
    (peak, item) => (!peak || item.revenue > peak.revenue ? item : peak),
    null,
  ),
);
const isGlobalScope = computed(() => overview.value?.scope.mode === "GLOBAL");
const performanceTitle = computed(() =>
  isGlobalScope.value ? "Hiệu quả theo chi nhánh" : "Hiệu suất 4 tuần gần đây",
);
const performanceDescription = computed(() =>
  isGlobalScope.value
    ? "So sánh doanh thu đã hoàn tất giữa các chi nhánh."
    : `Doanh thu đã hoàn tất theo tuần tại ${overview.value?.scope.branch?.name ?? "chi nhánh hiện tại"}.`,
);
const performanceItems = computed<PerformanceItem[]>(() =>
  isGlobalScope.value
    ? (overview.value?.branchPerformance ?? []).map((item) => ({
        key: item.branchId,
        label: item.branchName,
        revenue: item.revenue,
      }))
    : [],
);
const weeklyBars = computed(() =>
  presentWeeklyPerformance(overview.value?.weeklyPerformance ?? []),
);
const maxPerformanceRevenue = computed(() =>
  Math.max(
    ...performanceItems.value.map((item) => item.revenue),
    ...weeklyBars.value.map((item) => item.revenue),
    1,
  ),
);
const paymentItems = computed(() => {
  const counts = new Map(
    (overview.value?.paymentMethods ?? []).map((item) => [
      item.method,
      item.count,
    ]),
  );
  const items = [
    {
      method: "COD" as const,
      color: paymentColors[0],
      count: counts.get("COD") ?? 0,
    },
    {
      method: "VNPAY" as const,
      color: paymentColors[1],
      count: counts.get("VNPAY") ?? 0,
    },
  ];
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return items.map((item) => ({
    ...item,
    percentage: paymentShare(item.count, total),
  }));
});
const paymentTotal = computed(() =>
  paymentItems.value.reduce((sum, item) => sum + item.count, 0),
);
const selectedTrendPoint = computed(
  () => trend.value.find((item) => item.key === selectedTrendKey.value) ?? null,
);
const selectedStatus = computed(
  () =>
    statusBuckets.value.find((item) => item.key === selectedStatusKey.value) ??
    null,
);
const selectedPayment = computed(
  () =>
    paymentItems.value.find(
      (item) => item.method === selectedPaymentMethod.value,
    ) ?? null,
);
const topProducts = computed(() =>
  (overview.value?.topProducts ?? []).slice(0, 3),
);
const lowStock = computed(() => (overview.value?.lowStock ?? []).slice(0, 4));
const scopeDescription = computed(() =>
  props.mode === "system" && !branchId.value
    ? "Theo dõi nhanh tình hình vận hành của toàn bộ hệ thống Bookora."
    : `Theo dõi hiệu quả hoạt động tại ${branchStore.selectedBranch?.name ?? "chi nhánh đang chọn"}.`,
);

const statusColors = computed(() =>
  statusBuckets.value.map((item) => item.color),
);
const paymentColors = ["#2563eb", "#10b981"];

watch(
  [preset, from, to, groupBy, branchId],
  () => {
    selectedTrendKey.value = null;
    selectedStatusKey.value = null;
    selectedPaymentMethod.value = null;
    selectedPerformanceKey.value = null;
    void router.replace({
      query: {
        ...route.query,
        preset: preset.value,
        groupBy: groupBy.value,
        ...(preset.value === "CUSTOM"
          ? { from: from.value, to: to.value }
          : { from: undefined, to: undefined }),
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

function statusPercent(item: DashboardStatusBucket): number {
  return totalStatuses.value ? (item.count / totalStatuses.value) * 100 : 0;
}

const trendX = (_: DashboardTrendPointDto, index: number) => index;
const trendY = (item: DashboardTrendPointDto) => item.revenue;
const formatTrendLabel = (item: DashboardTrendPointDto): string => {
  if (groupBy.value === "MONTH") {
    return new Intl.DateTimeFormat("vi-VN", {
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${item.key}T00:00:00+07:00`));
  }
  return formatDateLabel(item.key);
};
const trendTick = (index: number) => {
  const item = trend.value[Math.round(index)];
  return item ? formatTrendLabel(item) : "";
};
const statusValue = (item: DashboardStatusBucket) => item.count;
const paymentValue = (item: DashboardPaymentMethodDto) => item.count;
const renderTrendTooltip = (item: DashboardTrendPointDto) => `
  <div class="space-y-1 text-sm">
    <strong>${formatTrendLabel(item)}</strong>
    <div>Doanh thu: ${formatCurrency(item.revenue)}</div>
    <div>Đơn hoàn tất: ${formatNumber(item.completedOrders)}</div>
  </div>
`;
const trendTooltipTriggers = {
  [VisScatterSelectors.point]: renderTrendTooltip,
};
const selectTrendPoint = (item: DashboardTrendPointDto): void => {
  selectedTrendKey.value =
    selectedTrendKey.value === item.key ? null : item.key;
};
const trendPointEvents = {
  [VisScatterSelectors.point]: {
    click: selectTrendPoint,
  },
};
const statusTooltipTriggers = {
  [VisDonutSelectors.segment]: (
    item: DashboardDonutDatum<DashboardStatusBucket>,
  ) =>
    `${item.data.label}: ${formatNumber(item.value)} đơn (${statusPercent(item.data).toFixed(1)}%)`,
};
const selectStatus = (item: DashboardStatusBucket): void => {
  selectedStatusKey.value =
    selectedStatusKey.value === item.key ? null : item.key;
};
const statusDonutEvents = {
  [VisDonutSelectors.segment]: {
    click: (item: DashboardDonutDatum<DashboardStatusBucket>) =>
      selectStatus(item.data),
  },
};
const paymentTooltipTriggers = {
  [VisDonutSelectors.segment]: (
    item: DashboardDonutDatum<(typeof paymentItems.value)[number]>,
  ) =>
    `${item.data.method}: ${formatNumber(item.value)} đơn (${item.data.percentage.toFixed(1)}%)`,
};
const selectPayment = (item: (typeof paymentItems.value)[number]): void => {
  selectedPaymentMethod.value =
    selectedPaymentMethod.value === item.method ? null : item.method;
};
const paymentDonutEvents = {
  [VisDonutSelectors.segment]: {
    click: (item: DashboardDonutDatum<(typeof paymentItems.value)[number]>) =>
      selectPayment(item.data),
  },
};
const selectPerformance = (
  item: PerformanceItem | WeeklyPerformanceItem,
): void => {
  selectedPerformanceKey.value =
    selectedPerformanceKey.value === item.key ? null : item.key;
};

function viewAllProducts(): void {
  void router.push({
    name:
      props.mode === "system"
        ? "super-admin-products"
        : "branch-admin-products",
  });
}

function viewAllStock(): void {
  void router.push({
    name:
      props.mode === "system"
        ? "super-admin-inventory"
        : "branch-admin-inventory",
    query: { stockState: "LOW_STOCK" },
  });
}
</script>

<template>
  <section class="min-w-0 space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold tracking-tight">Tổng quan</h1>
          <span
            class="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
          >
            {{ mode === "system" ? "Super Admin" : "Branch Admin" }}
          </span>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">{{ scopeDescription }}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        :disabled="overviewQuery.isFetching.value"
        @click="overviewQuery.refetch()"
      >
        <RefreshCw
          class="mr-2 size-4"
          :class="{ 'animate-spin': overviewQuery.isFetching.value }"
        />
        Làm mới
      </Button>
    </header>

    <AnalyticsFilterBar
      :preset="preset"
      :from="from"
      :to="to"
      :busy="overviewQuery.isFetching.value"
      @preset-change="selectPreset"
      @custom-change="selectCustom"
    />

    <div
      v-if="overviewQuery.isPending.value"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <Skeleton v-for="item in 4" :key="item" class="h-32 rounded-xl" />
    </div>

    <Card v-else-if="overviewQuery.isError.value">
      <CardContent
        class="flex min-h-40 flex-col items-center justify-center gap-3 text-center"
      >
        <p class="font-medium">Không thể tải dữ liệu tổng quan.</p>
        <p class="text-sm text-muted-foreground">
          Vui lòng kiểm tra kết nối hoặc thử lại.
        </p>
        <Button @click="overviewQuery.refetch()">Thử lại</Button>
      </CardContent>
    </Card>

    <template v-else-if="overview">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Doanh thu đã hoàn tất"
          :value="formatCurrency(overview.kpis.completedRevenue.value)"
          :change="overview.kpis.completedRevenue.changePercent"
          :icon="Banknote"
          comparison
          accent-class="bg-emerald-500"
          icon-class="bg-emerald-100/70 text-emerald-600"
        />
        <MetricCard
          label="Tổng số đơn"
          :value="formatNumber(overview.kpis.totalOrders.value)"
          :change="overview.kpis.totalOrders.changePercent"
          :icon="ClipboardList"
          comparison
          accent-class="bg-blue-500"
          icon-class="bg-blue-100/70 text-blue-600"
        />
        <MetricCard
          label="Sản phẩm đã bán"
          :value="formatNumber(overview.kpis.soldQuantity.value)"
          :change="overview.kpis.soldQuantity.changePercent"
          :icon="Box"
          comparison
          accent-class="bg-violet-500"
          icon-class="bg-violet-100/70 text-violet-600"
        />
        <MetricCard
          label="Giá trị đơn trung bình"
          :value="formatCurrency(overview.kpis.averageOrderValue.value)"
          :change="overview.kpis.averageOrderValue.changePercent"
          :icon="BarChart3"
          comparison
          accent-class="bg-orange-500"
          icon-class="bg-orange-100/70 text-orange-600"
        />
      </div>

      <div class="grid min-w-0 gap-4 xl:grid-cols-5">
        <Card
          class="min-w-0 overflow-hidden xl:col-span-3 xl:col-start-1 xl:row-span-2 xl:row-start-1"
        >
          <CardHeader class="gap-3">
            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="min-w-0">
                <CardTitle
                  >Doanh thu theo {{ dashboardGroupLabel(groupBy) }}</CardTitle
                >
                <p class="mt-1 text-sm text-muted-foreground">
                  Biểu đồ doanh thu đã hoàn tất trong khoảng thời gian đã chọn.
                </p>
              </div>
              <Select v-model="groupBy">
                <SelectTrigger
                  class="w-full shrink-0 sm:w-36"
                  aria-label="Nhóm biểu đồ doanh thu"
                >
                  <SelectValue placeholder="Nhóm theo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY">Theo ngày</SelectItem>
                  <SelectItem value="WEEK">Theo tuần</SelectItem>
                  <SelectItem value="MONTH">Theo tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div
              class="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span class="flex items-center gap-2 text-muted-foreground">
                <span class="h-0.5 w-5 rounded-full bg-blue-600" />
                Doanh thu (đ)
              </span>
              <span>
                <span class="text-muted-foreground">Đỉnh kỳ:</span>
                <strong class="ml-1 text-blue-600">{{
                  peakTrend ? formatCompactCurrency(peakTrend.revenue) : "0 đ"
                }}</strong>
              </span>
            </div>
          </CardHeader>
          <CardContent class="min-w-0 overflow-hidden">
            <div
              v-if="trend.every((item) => item.revenue === 0)"
              class="flex h-72 items-center justify-center text-sm text-muted-foreground"
            >
              Chưa có doanh thu trong kỳ này.
            </div>
            <div v-else class="min-w-0 overflow-hidden">
              <VisXYContainer
                :data="trend"
                :height="280"
                :margin="{ left: 10, right: 10 }"
              >
                <VisArea
                  :x="trendX"
                  :y="trendY"
                  color="#2563eb"
                  :opacity="0.12"
                />
                <VisLine :x="trendX" :y="trendY" color="#2563eb" />
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
                <VisAxis type="x" :tick-format="trendTick" :num-ticks="7" />
                <VisAxis type="y" :tick-format="formatCompactCurrency" />
                <VisTooltip :triggers="trendTooltipTriggers" />
              </VisXYContainer>
              <div
                v-if="selectedTrendPoint"
                class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-950"
                aria-live="polite"
              >
                <strong>{{ formatTrendLabel(selectedTrendPoint) }}</strong>
                <span>
                  Doanh thu: {{ formatCurrency(selectedTrendPoint.revenue) }}
                </span>
                <span>
                  Đơn hoàn tất:
                  {{ formatNumber(selectedTrendPoint.completedOrders) }}
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

        <Card class="min-w-0 xl:col-span-2 xl:col-start-4 xl:row-start-1">
          <CardHeader class="pb-2">
            <CardTitle>Trạng thái đơn hàng</CardTitle>
            <p class="text-sm text-muted-foreground">
              Tỷ lệ và số lượng đơn hàng theo trạng thái.
            </p>
          </CardHeader>
          <CardContent
            class="grid min-w-0 gap-4 sm:grid-cols-[170px_minmax(0,1fr)] xl:grid-cols-[150px_minmax(0,1fr)]"
          >
            <div class="relative min-w-0 [&_path]:cursor-pointer">
              <VisSingleContainer :data="statusBuckets" :height="160">
                <VisDonut
                  :value="statusValue"
                  :color="statusColors"
                  :arc-width="22"
                  :events="statusDonutEvents"
                />
                <VisTooltip :triggers="statusTooltipTriggers" />
              </VisSingleContainer>
              <div
                class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              >
                <strong class="max-w-28 truncate text-xl">
                  {{ formatNumber(selectedStatus?.count ?? totalStatuses) }}
                </strong>
                <span class="max-w-28 truncate text-xs text-muted-foreground">
                  {{ selectedStatus?.label ?? "đơn hàng" }}
                </span>
              </div>
            </div>
            <div class="min-w-0 space-y-2 self-center">
              <button
                v-for="item in statusBuckets"
                :key="item.key"
                type="button"
                :aria-pressed="selectedStatusKey === item.key"
                class="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
                :class="selectedStatusKey === item.key ? 'bg-blue-50' : ''"
                @click="selectStatus(item)"
              >
                <span
                  class="size-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: item.color }"
                />
                <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <strong>{{ item.count }}</strong>
                <span class="w-12 shrink-0 text-right text-muted-foreground"
                  >{{ statusPercent(item).toFixed(1) }}%</span
                >
              </button>
            </div>
          </CardContent>
        </Card>

        <Card class="min-w-0 xl:col-span-3 xl:col-start-1 xl:row-start-3">
          <CardHeader class="pb-3">
            <CardTitle>{{ performanceTitle }}</CardTitle>
            <p class="text-sm text-muted-foreground">
              {{ performanceDescription }}
            </p>
          </CardHeader>
          <CardContent>
            <div
              v-if="isGlobalScope && performanceItems.length"
              class="space-y-3"
            >
              <button
                v-for="item in performanceItems"
                :key="item.key"
                type="button"
                :aria-pressed="selectedPerformanceKey === item.key"
                class="group relative grid w-full min-w-0 gap-2 rounded-lg p-2 text-left transition-[background-color,box-shadow] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:grid-cols-[minmax(8rem,0.8fr)_minmax(10rem,2fr)_auto] sm:items-center"
                :class="
                  selectedPerformanceKey === item.key
                    ? 'bg-blue-50 ring-2 ring-blue-500'
                    : ''
                "
                @click="selectPerformance(item)"
              >
                <span class="truncate text-sm">{{ item.label }}</span>
                <div class="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-blue-600 transition-[width,filter] group-hover:brightness-110"
                    :style="{
                      width: `${Math.max(3, (item.revenue / maxPerformanceRevenue) * 100)}%`,
                    }"
                  />
                </div>
                <strong class="text-sm">{{
                  formatCurrency(item.revenue)
                }}</strong>
                <span
                  class="pointer-events-none absolute right-2 top-full z-20 mt-1 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {{ item.label }}: {{ formatCurrency(item.revenue) }}
                </span>
              </button>
            </div>
            <div
              v-else-if="!isGlobalScope && weeklyBars.length"
              class="grid h-64 grid-cols-4 gap-2 sm:gap-4"
              role="group"
              aria-label="Biểu đồ cột doanh thu bốn tuần gần đây"
            >
              <button
                v-for="item in weeklyBars"
                :key="item.key"
                type="button"
                :aria-pressed="selectedPerformanceKey === item.key"
                class="group relative flex min-w-0 flex-col items-center rounded-lg px-1 py-2 transition-[background-color,box-shadow] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :class="
                  selectedPerformanceKey === item.key
                    ? 'bg-blue-50 ring-2 ring-blue-500'
                    : ''
                "
                @click="selectPerformance(item)"
              >
                <strong class="mb-2 truncate text-xs sm:text-sm">
                  {{ formatCompactCurrency(item.revenue) }}
                </strong>
                <div
                  class="flex min-h-0 w-full flex-1 items-end justify-center"
                >
                  <div
                    class="w-8 rounded-t-md bg-blue-600 transition-[height,filter] group-hover:brightness-110 sm:w-12"
                    :class="{ 'min-h-1': item.revenue > 0 }"
                    :style="{
                      height: `${(item.revenue / maxPerformanceRevenue) * 100}%`,
                    }"
                  />
                </div>
                <strong class="mt-2 text-xs sm:text-sm">{{
                  item.weekLabel
                }}</strong>
                <span
                  class="mt-0.5 text-center text-[10px] leading-tight text-muted-foreground sm:text-xs"
                >
                  {{ item.dateRange }}
                </span>
                <span
                  class="pointer-events-none absolute bottom-full z-20 mb-1 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {{ formatCurrency(item.revenue) }}
                </span>
              </button>
            </div>
            <div
              v-else
              class="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground"
            >
              <PackageOpen class="size-8" />
              Chưa có doanh thu hoàn tất để so sánh trong kỳ này.
            </div>
          </CardContent>
        </Card>

        <Card
          class="min-w-0 overflow-hidden xl:col-span-2 xl:col-start-4 xl:row-start-2"
        >
          <CardHeader
            class="grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-2"
          >
            <CardTitle class="min-w-0">Cảnh báo tồn kho</CardTitle>
            <Button
              variant="link"
              size="sm"
              class="h-auto shrink-0 cursor-pointer p-0 font-semibold text-blue-600 hover:text-blue-700"
              aria-label="Xem tất cả cảnh báo tồn kho"
              @click="viewAllStock"
            >
              Xem tất cả
            </Button>
          </CardHeader>
          <CardContent class="p-0">
            <Table class="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[55%]">Sản phẩm</TableHead>
                  <TableHead class="w-[20%] text-right">Tồn kho</TableHead>
                  <TableHead class="w-[25%]">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="item in lowStock"
                  :key="`${item.branchId}-${item.variantId}`"
                >
                  <TableCell>
                    <div class="min-w-0">
                      <div class="truncate font-medium">
                        {{ item.productName }}
                      </div>
                      <small class="block truncate text-muted-foreground">
                        {{
                          isGlobalScope
                            ? item.branchName
                            : item.variantLabel || "Sản phẩm"
                        }}
                      </small>
                    </div>
                  </TableCell>
                  <TableCell class="text-right text-xs sm:text-sm">
                    {{ item.quantity }}/{{ item.lowStockThreshold }}
                  </TableCell>
                  <TableCell>
                    <span
                      class="inline-flex max-w-full text-xs font-semibold"
                      :class="
                        item.state === 'OUT_OF_STOCK'
                          ? 'text-red-600'
                          : 'text-orange-600'
                      "
                    >
                      {{
                        item.state === "OUT_OF_STOCK" ? "Hết hàng" : "Sắp hết"
                      }}
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow v-if="lowStock.length === 0">
                  <TableCell
                    colspan="3"
                    class="h-24 text-center text-muted-foreground"
                  >
                    Không có cảnh báo tồn kho.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card
          class="min-w-0 overflow-hidden xl:col-span-2 xl:col-start-4 xl:row-start-3"
        >
          <CardHeader
            class="grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-2"
          >
            <CardTitle class="min-w-0">Sản phẩm bán chạy</CardTitle>
            <Button
              variant="link"
              size="sm"
              class="h-auto shrink-0 cursor-pointer p-0 font-semibold text-blue-600 hover:text-blue-700"
              aria-label="Xem tất cả sản phẩm bán chạy"
              @click="viewAllProducts"
            >
              Xem tất cả
            </Button>
          </CardHeader>
          <CardContent class="p-0">
            <Table class="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[62%]">Sản phẩm</TableHead>
                  <TableHead class="w-[16%] text-right">Đã bán</TableHead>
                  <TableHead class="w-[22%] text-right">Doanh thu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="item in topProducts"
                  :key="`${item.productId}-${item.variantLabel ?? ''}`"
                >
                  <TableCell>
                    <div class="flex min-w-0 items-center gap-2">
                      <ProductThumbnail
                        :src="item.imageUrl"
                        :alt="item.productName"
                      />
                      <div class="min-w-0">
                        <div class="truncate font-medium">
                          {{ item.productName }}
                        </div>
                        <small
                          v-if="item.variantLabel"
                          class="block truncate text-muted-foreground"
                        >
                          {{ item.variantLabel }}
                        </small>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell class="text-right">
                    {{ formatNumber(item.soldQuantity) }}
                  </TableCell>
                  <TableCell class="truncate text-right text-xs sm:text-sm">
                    {{ formatCurrency(item.revenue) }}
                  </TableCell>
                </TableRow>
                <TableRow v-if="topProducts.length === 0">
                  <TableCell
                    colspan="3"
                    class="h-24 text-center text-muted-foreground"
                  >
                    Chưa có sản phẩm bán ra.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div v-if="mode === 'branch'" class="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card class="min-w-0">
          <CardHeader>
            <CardTitle>Phương thức thanh toán</CardTitle>
            <p class="text-sm text-muted-foreground">
              Tỷ trọng đơn hàng theo phương thức thanh toán.
            </p>
          </CardHeader>
          <CardContent
            class="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center"
          >
            <div class="relative min-w-0 [&_path]:cursor-pointer">
              <VisSingleContainer :data="paymentItems" :height="150">
                <VisDonut
                  :value="paymentValue"
                  :color="paymentColors"
                  :arc-width="20"
                  :events="paymentDonutEvents"
                />
                <VisTooltip :triggers="paymentTooltipTriggers" />
              </VisSingleContainer>
              <div
                class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
              >
                <strong class="text-lg">
                  {{ formatNumber(selectedPayment?.count ?? paymentTotal) }}
                </strong>
                <span class="text-xs text-muted-foreground">
                  {{ selectedPayment?.method ?? "đơn hàng" }}
                </span>
              </div>
            </div>
            <div class="min-w-0 space-y-3">
              <button
                v-for="item in paymentItems"
                :key="item.method"
                type="button"
                :aria-pressed="selectedPaymentMethod === item.method"
                class="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :class="
                  selectedPaymentMethod === item.method ? 'bg-blue-50' : ''
                "
                @click="selectPayment(item)"
              >
                <span
                  class="size-2.5 rounded-full"
                  :style="{ backgroundColor: item.color }"
                />
                <span class="truncate">{{ item.method }}</span>
                <strong>{{ formatNumber(item.count) }}</strong>
                <span class="w-12 text-right text-muted-foreground">
                  {{ item.percentage.toFixed(1) }}%
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card v-if="overview.todayOperations" class="min-w-0">
          <CardHeader>
            <CardTitle>Tóm tắt vận hành hôm nay</CardTitle>
            <p class="text-sm text-muted-foreground">
              Cập nhật đến
              {{ formatDashboardSnapshot(overview.todayOperations.snapshotAt) }}
            </p>
          </CardHeader>
          <CardContent class="grid gap-3 sm:grid-cols-3">
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100/70 text-orange-600"
              >
                <PackageCheck class="size-5" />
              </span>
              <div class="min-w-0">
                <p class="text-sm text-muted-foreground">Đơn chờ xử lý</p>
                <strong
                  >{{
                    formatNumber(overview.todayOperations.pendingOrders)
                  }}
                  đơn</strong
                >
              </div>
            </div>
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100/70 text-emerald-600"
              >
                <CircleCheckBig class="size-5" />
              </span>
              <div class="min-w-0">
                <p class="text-sm text-muted-foreground">Đơn giao thành công</p>
                <strong
                  >{{
                    formatNumber(overview.todayOperations.completedToday)
                  }}
                  đơn</strong
                >
              </div>
            </div>
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100/70 text-blue-600"
              >
                <Target class="size-5" />
              </span>
              <div class="min-w-0">
                <p class="text-sm text-muted-foreground">
                  Tỷ lệ hoàn thành đơn
                </p>
                <strong
                  >{{
                    overview.todayOperations.completionRate.toFixed(1)
                  }}%</strong
                >
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
  </section>
</template>
