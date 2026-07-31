const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number): string {
  return `${compactCurrencyFormatter.format(value)} đ`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  return value == null
    ? "Chưa có dữ liệu kỳ trước"
    : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatDateLabel(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}` : value;
}

export function analyticsScopeKey(branchId: string | null): string {
  return branchId ?? "global";
}
