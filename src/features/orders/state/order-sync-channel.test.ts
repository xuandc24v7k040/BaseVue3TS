// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishOrderInvalidated, setupOrderSync } from "./order-sync-channel";

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
const refresh = vi.fn().mockResolvedValue(undefined);

describe("cross-tab customer order synchronization", () => {
  beforeEach(() => {
    FakeBroadcastChannel.instances = [];
    refresh.mockClear();
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
    cleanup = setupOrderSync(refresh);
  });

  afterEach(() => {
    cleanup?.();
    vi.unstubAllGlobals();
  });

  it("refreshes the affected customer order in another tab", async () => {
    FakeBroadcastChannel.instances[0]?.emit({
      type: "ORDER_INVALIDATED",
      eventId: "admin-transition-1",
      sourceTabId: "admin-tab",
      occurredAt: Date.now(),
      orderId: "order-1",
    });

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledWith("order-1"));
  });

  it("publishes an order invalidation after an admin status mutation", () => {
    publishOrderInvalidated("order-1");

    expect(FakeBroadcastChannel.instances[0]?.messages).toEqual([
      expect.objectContaining({
        type: "ORDER_INVALIDATED",
        orderId: "order-1",
      }),
    ]);
  });
});
