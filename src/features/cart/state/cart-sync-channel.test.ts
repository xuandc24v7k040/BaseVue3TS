// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  publishCartInvalidated,
  setupCartSync,
} from "./cart-sync-channel";

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

function externalEvent(eventId: string) {
  return {
    type: "CART_INVALIDATED",
    eventId,
    sourceTabId: "another-tab",
    occurredAt: Date.now(),
    reason: "UPDATE_QUANTITY",
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

let cleanup: (() => void) | undefined;

describe("cross-tab cart synchronization", () => {
  beforeEach(() => {
    FakeBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("refreshes once for a duplicated external event", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    cleanup = setupCartSync(refresh);
    const event = externalEvent("event-1");

    FakeBroadcastChannel.instances[0]?.emit(event);
    FakeBroadcastChannel.instances[0]?.emit(event);

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("coalesces events received while a refresh is in flight", async () => {
    const first = deferred();
    const refresh = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(undefined);
    cleanup = setupCartSync(refresh);

    FakeBroadcastChannel.instances[0]?.emit(externalEvent("event-1"));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    FakeBroadcastChannel.instances[0]?.emit(externalEvent("event-2"));
    FakeBroadcastChannel.instances[0]?.emit(externalEvent("event-3"));
    first.resolve();

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  });

  it("publishes a typed reason and ignores its own event", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    cleanup = setupCartSync(refresh);

    publishCartInvalidated("BUY_NOW");
    const published = FakeBroadcastChannel.instances[0]?.messages[0];
    expect(published).toEqual(
      expect.objectContaining({
        type: "CART_INVALIDATED",
        reason: "BUY_NOW",
      }),
    );

    FakeBroadcastChannel.instances[0]?.emit(published);
    await Promise.resolve();
    expect(refresh).not.toHaveBeenCalled();
  });
});
