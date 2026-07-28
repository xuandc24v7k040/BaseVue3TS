// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref, type Ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getWishlistStatusMock } = vi.hoisted(() => ({
  getWishlistStatusMock: vi.fn(),
}));

vi.mock("../api/engagement-api", () => ({
  getWishlistStatus: getWishlistStatusMock,
}));

import {
  clearWishlistStatuses,
  setLocalWishlistStatus,
  useWishlistStatus,
} from "./use-wishlist-status";

function mountStatus(enabled: Ref<boolean>) {
  return mount(
    defineComponent({
      setup() {
        const wished = useWishlistStatus("product-1", enabled);
        return { wished };
      },
      template: '<span>{{ wished ? "active" : "inactive" }}</span>',
    }),
  );
}

describe("wishlist status hydration and race safety", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearWishlistStatuses();
    getWishlistStatusMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for auth hydration, then restores the server state", async () => {
    const enabled = ref(false);
    getWishlistStatusMock.mockResolvedValue({
      wishlistedProductIds: ["product-1"],
    });
    const wrapper = mountStatus(enabled);

    await vi.runAllTimersAsync();
    expect(getWishlistStatusMock).not.toHaveBeenCalled();

    enabled.value = true;
    await nextTick();
    await vi.runAllTimersAsync();
    await flushPromises();

    expect(getWishlistStatusMock).toHaveBeenCalledWith(["product-1"]);
    expect(wrapper.text()).toBe("active");
  });

  it("does not let an older batch response overwrite a newer local mutation", async () => {
    let resolveRequest:
      ((value: { wishlistedProductIds: string[] }) => void) | undefined;
    getWishlistStatusMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const enabled = ref(true);
    const wrapper = mountStatus(enabled);

    await vi.runAllTimersAsync();
    expect(getWishlistStatusMock).toHaveBeenCalledTimes(1);

    setLocalWishlistStatus("product-1", true);
    resolveRequest?.({ wishlistedProductIds: [] });
    await flushPromises();

    expect(wrapper.text()).toBe("active");
  });
});
