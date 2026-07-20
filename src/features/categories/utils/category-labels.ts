import type { CategoryLevel, CategoryType } from "../types";

export const CATEGORY_TYPE_OPTIONS: { label: string; value: CategoryType }[] = [
  { label: "Thông thường", value: "NORMAL" },
  { label: "Hệ thống", value: "SYSTEM" },
  { label: "Bộ sưu tập", value: "COLLECTION" },
  { label: "Thương hiệu", value: "BRAND" },
  { label: "Trang đích", value: "LANDING" },
];

export function categoryTypeLabel(value: CategoryType): string {
  return (
    CATEGORY_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function categoryLevelLabel(value: CategoryLevel): string {
  return value === 1 ? "Danh mục gốc" : "Danh mục con";
}

export function formatCategoryDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
