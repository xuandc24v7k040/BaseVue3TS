// @vitest-environment happy-dom

import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/constants/storage-key.constant";
import {
  readRecentlyViewed,
  recentlyViewedStorageKey,
  useRecentlyViewed,
} from "@/features/storefront/composables/use-recently-viewed";
import {
  readSearchHistory,
  useSearchHistory,
} from "@/features/storefront/composables/use-search-history";

describe("storefront browser histories", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("deduplicates submitted searches without accents and fails safe on malformed JSON", () => {
    const history = useSearchHistory();

    expect(history.add("  Chú   Thuật  ")).toBe(true);
    expect(history.add("chu thuat")).toBe(true);
    expect(history.history.value).toEqual(["chu thuat"]);

    localStorage.setItem(STORAGE_KEYS.searchHistory, "{not-json");
    expect(readSearchHistory()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEYS.searchHistory)).toBeNull();
  });

  it("adds, deduplicates, caps, removes and clears recently viewed IDs", () => {
    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now++);
    const history = useRecentlyViewed();

    for (let index = 0; index < 13; index += 1) {
      history.add(`product-${index}`);
    }
    history.add("product-5");

    expect(history.entries.value).toHaveLength(12);
    expect(history.entries.value[0]?.productId).toBe("product-5");
    expect(
      history.entries.value.filter((entry) => entry.productId === "product-5"),
    ).toHaveLength(1);
    expect(history.remove("product-5")).toBe(true);
    expect(history.entries.value.some((entry) => entry.productId === "product-5")).toBe(false);
    expect(history.clear()).toBe(true);
    expect(history.entries.value).toEqual([]);
  });

  it("uses isolated guest/user namespaces and resets malformed history", () => {
    expect(recentlyViewedStorageKey()).toBe(
      `${STORAGE_KEYS.recentlyViewedPrefix}:guest`,
    );
    expect(recentlyViewedStorageKey("01JUSER")).toBe(
      `${STORAGE_KEYS.recentlyViewedPrefix}:user:01JUSER`,
    );

    const malformedKey = "bookora.recently-viewed.v1:test-malformed";
    localStorage.setItem(malformedKey, "not-json");
    expect(readRecentlyViewed(malformedKey)).toEqual([]);
    expect(localStorage.getItem(malformedKey)).toBeNull();
  });
});
