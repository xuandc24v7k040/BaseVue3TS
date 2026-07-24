// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/query-client";
import {
  publishInventoryChanged,
  setupInventorySync,
} from "./inventory-sync-channel";

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  readonly name: string;
  readonly messages: unknown[] = [];
  private listener: ((event: MessageEvent<unknown>) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(
    _type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void {
    this.listener = listener;
  }

  removeEventListener(): void {
    this.listener = null;
  }

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  close(): void {}

  emit(data: unknown): void {
    this.listener?.({ data } as MessageEvent<unknown>);
  }
}

let cleanup: (() => void) | undefined;

describe("cross-tab inventory synchronization", () => {
  beforeEach(() => {
    FakeBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
    vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    cleanup = setupInventorySync();
  });

  afterEach(() => {
    cleanup?.();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("invalidates active availability and storefront queries in another tab", async () => {
    FakeBroadcastChannel.instances[0]?.emit({
      type: "INVENTORY_INVALIDATED",
      eventId: "checkout-event-1",
      sourceTabId: "another-tab",
      occurredAt: Date.now(),
      context: { branchId: "branch-1", variantIds: ["variant-1"] },
    });

    await vi.waitFor(() =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["storefront"],
      refetchType: "active",
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["customer-cart"],
      refetchType: "active",
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["branch-scoped", "branch-1", "inventory"],
      refetchType: "active",
    });
  });

  it("publishes one inventory event after authoritative checkout success", () => {
    publishInventoryChanged({ branchId: "branch-1" });

    expect(FakeBroadcastChannel.instances[0]?.messages).toHaveLength(1);
    expect(FakeBroadcastChannel.instances[0]?.messages[0]).toEqual(
      expect.objectContaining({
        type: "INVENTORY_INVALIDATED",
        context: { branchId: "branch-1" },
      }),
    );
  });
});
