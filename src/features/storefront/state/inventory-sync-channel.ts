import {
  invalidateInventoryState,
  type InventoryInvalidationContext,
} from "./inventory-state";

const CHANNEL_NAME = "bookora-inventory-sync";
const STORAGE_KEY = "bookora:inventory-changed";

interface InventoryChangedMessage {
  type: "INVENTORY_INVALIDATED";
  eventId: string;
  sourceTabId: string;
  occurredAt: number;
  context: InventoryInvalidationContext;
}

let channel: BroadcastChannel | null = null;
let setupComplete = false;
const sourceTabId =
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const handledEventIds = new Set<string>();
const listeners = new Set<(context: InventoryInvalidationContext) => void>();

function isInventoryChangedMessage(
  value: unknown,
): value is InventoryChangedMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<InventoryChangedMessage>;
  return (
    message.type === "INVENTORY_INVALIDATED" &&
    typeof message.eventId === "string" &&
    message.eventId.length > 0 &&
    typeof message.sourceTabId === "string" &&
    typeof message.occurredAt === "number" &&
    Boolean(message.context) &&
    typeof message.context === "object"
  );
}

function rememberEvent(eventId: string): void {
  handledEventIds.add(eventId);
  if (handledEventIds.size <= 100) return;
  const oldest = handledEventIds.values().next().value;
  if (oldest) handledEventIds.delete(oldest);
}

function handleInventoryChanged(value: unknown): void {
  if (
    !isInventoryChangedMessage(value) ||
    value.sourceTabId === sourceTabId ||
    handledEventIds.has(value.eventId)
  ) {
    return;
  }
  rememberEvent(value.eventId);
  void invalidateInventoryState(value.context);
  listeners.forEach((listener) => listener(value.context));
}

export function setupInventorySync(): () => void {
  if (typeof window === "undefined" || setupComplete) return () => undefined;
  setupComplete = true;

  const handleChannelMessage = (event: MessageEvent<unknown>) => {
    handleInventoryChanged(event.data);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      handleInventoryChanged(JSON.parse(event.newValue));
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

export function publishInventoryChanged(
  context: InventoryInvalidationContext = {},
): void {
  const message: InventoryChangedMessage = {
    type: "INVENTORY_INVALIDATED",
    eventId:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sourceTabId,
    occurredAt: Date.now(),
    context,
  };
  channel?.postMessage(message);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(message));
  } catch {
    // BroadcastChannel remains available when storage is restricted.
  }
}

export function subscribeInventoryInvalidation(
  listener: (context: InventoryInvalidationContext) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
