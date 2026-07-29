import { describe, expect, it } from "vitest";
import reviewDialogSource from "@/features/engagement/components/ReviewFormDialog.vue?raw";
import mainSource from "@/main.ts?raw";
import accountOrdersSource from "@/pages/app/account/AccountOrdersPage.vue?raw";
import {
  ORDER_DETAIL_QUERY_POLICY,
  ORDER_LIST_QUERY_POLICY,
} from "./api/order-query-policy";

describe("Phase 17 order list refresh and review textarea hotfix", () => {
  it("invalidates every customer list plus the affected detail on an order signal", () => {
    expect(mainSource).toContain(
      "queryClient.invalidateQueries({ queryKey: customerOrderKeys.all })",
    );
    expect(mainSource).toContain("customerOrderKeys.detail(orderId)");
  });

  it("always refreshes order lists on mount, focus and reconnect without polling", () => {
    expect(ORDER_LIST_QUERY_POLICY).toEqual({
      staleTime: 45_000,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
      refetchOnReconnect: "always",
    });
    expect(ORDER_LIST_QUERY_POLICY).not.toHaveProperty("refetchInterval");
    expect(ORDER_DETAIL_QUERY_POLICY).not.toHaveProperty("refetchInterval");
  });

  it("keeps each status tab in the server query and cache key", () => {
    expect(accountOrdersSource).toContain("activeTab.value.statuses");
    expect(accountOrdersSource).toContain("activeTab.value.semanticTab");
    expect(accountOrdersSource).toContain(
      "customerOrderKeys.list(listParams.value)",
    );
    expect(accountOrdersSource).toContain("placeholderData: keepPreviousData");
    expect(accountOrdersSource).toContain(
      "queryFn: ({ signal }) => listCustomerOrders(listParams.value, signal)",
    );
  });

  it("uses one body ScrollArea and lets the bounded textarea own its content scroll", () => {
    expect(reviewDialogSource.match(/<ScrollArea\b/g)).toHaveLength(1);
    expect(reviewDialogSource).toContain('<ScrollArea type="auto"');
    expect(reviewDialogSource).toContain("<Textarea");
    expect(reviewDialogSource).toContain("min-h-36 max-h-56");
    expect(reviewDialogSource).toContain("resize-y overflow-y-auto");
    expect(reviewDialogSource).toContain(
      "focus-visible:border-[var(--bookora-green)]/35",
    );
    expect(reviewDialogSource).toContain("focus-visible:ring-1");
    expect(reviewDialogSource).toContain(
      "focus-visible:ring-[var(--bookora-green)]/15",
    );
    expect(reviewDialogSource).toContain('maxlength="2000"');
    expect(reviewDialogSource).toContain("{{ content.length }}/2000");
    expect(reviewDialogSource).toContain(
      '<DialogFooter class="border-t bg-background',
    );
  });
});
