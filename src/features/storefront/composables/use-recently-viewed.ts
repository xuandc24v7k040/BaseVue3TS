import { computed, ref } from "vue";
import type { Ref } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { STORAGE_KEYS } from "@/constants/storage-key.constant";

export interface RecentlyViewedEntry {
  productId: string;
  viewedAt: number;
}

const RECENTLY_VIEWED_LIMIT = 12;
const historyStates = new Map<string, Ref<RecentlyViewedEntry[]>>();

export function recentlyViewedStorageKey(userId?: string | null): string {
  return `${STORAGE_KEYS.recentlyViewedPrefix}:${userId ? `user:${userId}` : "guest"}`;
}

export function readRecentlyViewed(key: string): RecentlyViewedEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("invalid recently viewed history");
    const seen = new Set<string>();
    return parsed
      .filter(
        (item): item is RecentlyViewedEntry =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentlyViewedEntry).productId === "string" &&
          typeof (item as RecentlyViewedEntry).viewedAt === "number" &&
          Number.isFinite((item as RecentlyViewedEntry).viewedAt),
      )
      .filter((item) => {
        if (seen.has(item.productId)) return false;
        seen.add(item.productId);
        return true;
      })
      .sort((left, right) => right.viewedAt - left.viewedAt)
      .slice(0, RECENTLY_VIEWED_LIMIT);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
    return [];
  }
}

function stateFor(key: string) {
  const existing = historyStates.get(key);
  if (existing) return existing;
  const state = ref(readRecentlyViewed(key));
  historyStates.set(key, state);
  return state;
}

function persist(key: string, entries: RecentlyViewedEntry[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function useRecentlyViewed() {
  const authStore = useAuthStore();
  const key = computed(() => recentlyViewedStorageKey(authStore.user?.id));
  const entries = computed(() => stateFor(key.value).value);

  function replace(next: RecentlyViewedEntry[]): boolean {
    const normalized = next.slice(0, RECENTLY_VIEWED_LIMIT);
    stateFor(key.value).value = normalized;
    return persist(key.value, normalized);
  }

  function add(productId: string): boolean {
    const next = [
      { productId, viewedAt: Date.now() },
      ...entries.value.filter((entry) => entry.productId !== productId),
    ];
    return replace(next);
  }

  function remove(productId: string): boolean {
    return replace(
      entries.value.filter((entry) => entry.productId !== productId),
    );
  }

  function clear(): boolean {
    return replace([]);
  }

  function reconcile(validProductIds: string[]): boolean {
    const valid = new Set(validProductIds);
    const next = entries.value.filter((entry) => valid.has(entry.productId));
    if (next.length === entries.value.length) return true;
    return replace(next);
  }

  return { key, entries, add, remove, clear, reconcile };
}
