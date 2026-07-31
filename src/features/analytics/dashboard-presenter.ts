import type {
  DashboardOrderStatusDto,
  DashboardWeeklyPerformanceDto,
} from "@/api/generated/models";

export type DashboardGroupBy = "DAY" | "WEEK" | "MONTH";

export interface DashboardStatusBucket {
  key:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPING"
    | "COMPLETED"
    | "CANCELLED";
  label: string;
  count: number;
  color: string;
}

const STATUS_BUCKETS = [
  {
    key: "PENDING",
    label: "Chờ xác nhận",
    statuses: ["PENDING_PAYMENT", "PENDING"],
    color: "#f59e0b",
  },
  {
    key: "CONFIRMED",
    label: "Đã xác nhận",
    statuses: ["CONFIRMED"],
    color: "#3b82f6",
  },
  {
    key: "PROCESSING",
    label: "Đang xử lý",
    statuses: ["PACKING"],
    color: "#8b5cf6",
  },
  {
    key: "SHIPPING",
    label: "Đang giao",
    statuses: ["SHIPPING"],
    color: "#06b6d4",
  },
  {
    key: "COMPLETED",
    label: "Hoàn thành",
    statuses: ["COMPLETED"],
    color: "#22c55e",
  },
  {
    key: "CANCELLED",
    label: "Đã hủy",
    statuses: ["PAYMENT_FAILED", "CANCELLED", "RETURNED"],
    color: "#ef4444",
  },
] as const;

export function bucketOrderStatuses(
  items: readonly DashboardOrderStatusDto[],
): DashboardStatusBucket[] {
  const counts = new Map(items.map((item) => [item.status, item.count]));
  return STATUS_BUCKETS.map(({ key, label, statuses, color }) => ({
    key,
    label,
    color,
    count: statuses.reduce(
      (total, status) => total + (counts.get(status) ?? 0),
      0,
    ),
  }));
}

export function dashboardGroupLabel(groupBy: DashboardGroupBy): string {
  if (groupBy === "WEEK") return "tuần";
  if (groupBy === "MONTH") return "tháng";
  return "ngày";
}

export interface DashboardWeeklyBar extends DashboardWeeklyPerformanceDto {
  weekLabel: string;
  dateRange: string;
}

function formatDayMonth(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function presentWeeklyPerformance(
  items: readonly DashboardWeeklyPerformanceDto[],
): DashboardWeeklyBar[] {
  return items.slice(-4).map((item, index) => {
    const start = new Date(`${item.key}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 6 * 86_400_000);
    const dateRange = Number.isNaN(start.getTime())
      ? item.key
      : `${formatDayMonth(start)} - ${formatDayMonth(end)}`;

    return {
      ...item,
      weekLabel: `Tuần ${index + 1}`,
      dateRange,
    };
  });
}

export function paymentShare(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

export function formatDashboardSnapshot(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.hour}:${parts.minute} - ${parts.day}/${parts.month}/${parts.year}`;
}
