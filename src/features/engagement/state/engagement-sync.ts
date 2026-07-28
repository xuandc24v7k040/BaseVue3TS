import type { QueryClient } from "@tanstack/vue-query";
import { customerOrderKeys } from "@/features/orders/api/customer-orders-api";
import { engagementKeys } from "../api/engagement-api";

const CHANNEL_NAME = "bookora-engagement";
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function publishEngagementChange(): void {
  getChannel()?.postMessage({ type: "changed", at: Date.now() });
}

export function installEngagementSync(queryClient: QueryClient): () => void {
  const activeChannel = getChannel();
  if (!activeChannel) return () => undefined;
  const listener = (): void => {
    void queryClient.invalidateQueries({ queryKey: engagementKeys.all });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.all });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.details });
    window.dispatchEvent(new CustomEvent("bookora:engagement-changed"));
  };
  activeChannel.addEventListener("message", listener);
  return () => activeChannel.removeEventListener("message", listener);
}
