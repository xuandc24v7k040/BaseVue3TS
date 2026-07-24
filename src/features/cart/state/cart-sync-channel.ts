const CHANNEL_NAME = "bookora-cart-sync";
const STORAGE_KEY = "bookora:cart-invalidated";

export type CartSyncReason =
  | "ADD_ITEM"
  | "BUY_NOW"
  | "UPDATE_QUANTITY"
  | "REMOVE_ITEM"
  | "CLEAR_AFTER_COD"
  | "CLEAR_AFTER_VNPAY_PAID"
  | "BRANCH_RECONCILIATION";

const CART_SYNC_REASONS = new Set<CartSyncReason>([
  "ADD_ITEM",
  "BUY_NOW",
  "UPDATE_QUANTITY",
  "REMOVE_ITEM",
  "CLEAR_AFTER_COD",
  "CLEAR_AFTER_VNPAY_PAID",
  "BRANCH_RECONCILIATION",
]);

interface CartInvalidatedMessage {
  type: "CART_INVALIDATED";
  eventId: string;
  sourceTabId: string;
  occurredAt: number;
  reason: CartSyncReason;
}

let channel: BroadcastChannel | null = null;
let setupComplete = false;
let refreshing = false;
let refreshPending = false;
let refreshCart: (() => Promise<unknown>) | null = null;
const sourceTabId =
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const handledEventIds = new Set<string>();

function isCartInvalidatedMessage(
  value: unknown,
): value is CartInvalidatedMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<CartInvalidatedMessage>;
  return (
    message.type === "CART_INVALIDATED" &&
    typeof message.eventId === "string" &&
    message.eventId.length > 0 &&
    typeof message.sourceTabId === "string" &&
    typeof message.occurredAt === "number" &&
    typeof message.reason === "string" &&
    CART_SYNC_REASONS.has(message.reason as CartSyncReason)
  );
}

function rememberEvent(eventId: string): void {
  handledEventIds.add(eventId);
  if (handledEventIds.size <= 100) return;
  const oldest = handledEventIds.values().next().value;
  if (oldest) handledEventIds.delete(oldest);
}

async function drainRefreshQueue(): Promise<void> {
  if (refreshing || !refreshCart) {
    refreshPending = true;
    return;
  }
  refreshing = true;
  try {
    do {
      refreshPending = false;
      try {
        await refreshCart();
      } catch {
        // A later event can retry; never leave an unhandled cross-tab rejection.
      }
    } while (refreshPending);
  } finally {
    refreshing = false;
  }
}

function handleCartInvalidated(value: unknown): void {
  if (
    !isCartInvalidatedMessage(value) ||
    value.sourceTabId === sourceTabId ||
    handledEventIds.has(value.eventId)
  ) {
    return;
  }
  rememberEvent(value.eventId);
  void drainRefreshQueue();
}

export function setupCartSync(
  refresh: () => Promise<unknown>,
): () => void {
  if (typeof window === "undefined" || setupComplete) return () => undefined;
  setupComplete = true;
  refreshCart = refresh;

  const handleChannelMessage = (event: MessageEvent<unknown>) => {
    handleCartInvalidated(event.data);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      handleCartInvalidated(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed values written by unrelated scripts.
    }
  };

  if ("BroadcastChannel" in globalThis) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", handleChannelMessage);
  }
  window.addEventListener("storage", handleStorage);

  return () => {
    channel?.removeEventListener("message", handleChannelMessage);
    channel?.close();
    channel = null;
    window.removeEventListener("storage", handleStorage);
    setupComplete = false;
    refreshing = false;
    refreshPending = false;
    refreshCart = null;
    handledEventIds.clear();
  };
}

export function publishCartInvalidated(reason: CartSyncReason): void {
  const message: CartInvalidatedMessage = {
    type: "CART_INVALIDATED",
    eventId:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sourceTabId,
    occurredAt: Date.now(),
    reason,
  };
  channel?.postMessage(message);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(message));
  } catch {
    // BroadcastChannel remains available when storage is restricted.
  }
}
