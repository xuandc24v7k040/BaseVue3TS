const CHANNEL_NAME = "bookora-order-sync";
const STORAGE_KEY = "bookora:order-invalidated";

interface OrderInvalidatedMessage {
  type: "ORDER_INVALIDATED";
  eventId: string;
  sourceTabId: string;
  occurredAt: number;
  orderId: string;
}

const sourceTabId =
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const handledEventIds = new Set<string>();
let channel: BroadcastChannel | null = null;
let setupComplete = false;

function isOrderInvalidatedMessage(
  value: unknown,
): value is OrderInvalidatedMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<OrderInvalidatedMessage>;
  return (
    message.type === "ORDER_INVALIDATED" &&
    typeof message.eventId === "string" &&
    message.eventId.length > 0 &&
    typeof message.sourceTabId === "string" &&
    typeof message.occurredAt === "number" &&
    typeof message.orderId === "string" &&
    message.orderId.length > 0
  );
}

function rememberEvent(eventId: string): void {
  handledEventIds.add(eventId);
  if (handledEventIds.size <= 100) return;
  const oldest = handledEventIds.values().next().value;
  if (oldest) handledEventIds.delete(oldest);
}

export function setupOrderSync(
  refresh: (orderId: string) => Promise<unknown>,
): () => void {
  if (typeof window === "undefined" || setupComplete) return () => undefined;
  setupComplete = true;

  const handleInvalidated = (value: unknown): void => {
    if (
      !isOrderInvalidatedMessage(value) ||
      value.sourceTabId === sourceTabId ||
      handledEventIds.has(value.eventId)
    ) {
      return;
    }
    rememberEvent(value.eventId);
    void refresh(value.orderId).catch(() => undefined);
  };
  const handleChannelMessage = (event: MessageEvent<unknown>) => {
    handleInvalidated(event.data);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      handleInvalidated(JSON.parse(event.newValue));
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
    handledEventIds.clear();
  };
}

export function publishOrderInvalidated(orderId: string): void {
  const message: OrderInvalidatedMessage = {
    type: "ORDER_INVALIDATED",
    eventId:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sourceTabId,
    occurredAt: Date.now(),
    orderId,
  };
  channel?.postMessage(message);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(message));
  } catch {
    // BroadcastChannel remains available when storage is restricted.
  }
}
