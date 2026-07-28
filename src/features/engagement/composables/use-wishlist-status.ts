import {
  computed,
  ref,
  toValue,
  watchEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";
import { getWishlistStatus } from "../api/engagement-api";

const statuses = ref<Record<string, boolean>>({});
const registered = new Map<string, number>();
const pending = new Set<string>();
const versions = new Map<string, number>();
let timer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;

async function flush(): Promise<void> {
  timer = null;
  const ids = [...pending];
  pending.clear();
  if (!ids.length) return;
  const requestGeneration = generation;
  const requestVersions = new Map(ids.map((id) => [id, versions.get(id) ?? 0]));
  try {
    const result = await getWishlistStatus(ids);
    if (generation !== requestGeneration) return;
    const returned = new Set(result.wishlistedProductIds);
    const freshEntries = ids
      .filter((id) => (versions.get(id) ?? 0) === requestVersions.get(id))
      .map((id) => [id, returned.has(id)] as const);
    if (!freshEntries.length) return;
    statuses.value = {
      ...statuses.value,
      ...Object.fromEntries(freshEntries),
    };
  } catch {
    // Auth routing owns guest handling; cards remain safely inactive.
  }
}

function queue(ids: Iterable<string>): void {
  for (const id of ids) pending.add(id);
  if (timer === null) timer = setTimeout(() => void flush(), 0);
}

export function refreshRegisteredWishlistStatuses(): void {
  queue(registered.keys());
}

export function setLocalWishlistStatus(
  productId: string,
  value: boolean,
): void {
  versions.set(productId, (versions.get(productId) ?? 0) + 1);
  statuses.value = { ...statuses.value, [productId]: value };
}

export function clearWishlistStatuses(): void {
  generation += 1;
  if (timer !== null) clearTimeout(timer);
  timer = null;
  statuses.value = {};
  registered.clear();
  pending.clear();
  versions.clear();
}

export function useWishlistStatus(
  productId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
): ComputedRef<boolean> {
  watchEffect((onCleanup) => {
    if (!toValue(enabled)) return;
    const id = toValue(productId);
    if (!id) return;
    registered.set(id, (registered.get(id) ?? 0) + 1);
    queue([id]);
    onCleanup(() => {
      const count = registered.get(id) ?? 0;
      if (count <= 1) registered.delete(id);
      else registered.set(id, count - 1);
    });
  });
  return computed(() => statuses.value[toValue(productId)] ?? false);
}

export function useWishlistStatusPending(
  productId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean> = true,
): ComputedRef<boolean> {
  return computed(
    () => toValue(enabled) && statuses.value[toValue(productId)] === undefined,
  );
}

if (typeof window !== "undefined") {
  window.addEventListener(
    "bookora:engagement-changed",
    refreshRegisteredWishlistStatuses,
  );
  window.addEventListener("focus", refreshRegisteredWishlistStatuses);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshRegisteredWishlistStatuses();
    }
  });
}
