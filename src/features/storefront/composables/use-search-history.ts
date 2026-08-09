import { ref } from "vue";
import { STORAGE_KEYS } from "@/constants/storage-key.constant";

const SEARCH_HISTORY_LIMIT = 10;

export function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function searchIdentity(value: string): string {
  return normalizeSearchText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "D")
    .toLocaleLowerCase("vi-VN");
}

export function readSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.searchHistory);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("invalid search history");
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map(normalizeSearchText)
      .filter(Boolean)
      .slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEYS.searchHistory);
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
    return [];
  }
}

function persistSearchHistory(values: string[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.searchHistory, JSON.stringify(values));
    return true;
  } catch {
    return false;
  }
}

export function useSearchHistory() {
  const history = ref(readSearchHistory());

  function add(value: string): boolean {
    const normalized = normalizeSearchText(value);
    if (!normalized) return true;
    const identity = searchIdentity(normalized);
    history.value = [
      normalized,
      ...history.value.filter((item) => searchIdentity(item) !== identity),
    ].slice(0, SEARCH_HISTORY_LIMIT);
    return persistSearchHistory(history.value);
  }

  function remove(value: string): boolean {
    const identity = searchIdentity(value);
    history.value = history.value.filter(
      (item) => searchIdentity(item) !== identity,
    );
    return persistSearchHistory(history.value);
  }

  function clear(): boolean {
    history.value = [];
    return persistSearchHistory(history.value);
  }

  return { history, add, remove, clear };
}
