import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";
import { useThemeStore } from "@/stores/theme.store";
import { setupApiInterceptors } from "@/services/api.service";
import { setupInventorySync } from "@/features/storefront/state/inventory-sync-channel";
import { useCartActions } from "@/features/cart/api/cart-api";
import { setupCartSync } from "@/features/cart/state/cart-sync-channel";
import { customerOrderKeys } from "@/features/orders/api/customer-orders-api";
import { setupOrderSync } from "@/features/orders/state/order-sync-channel";
import { adminOrderKeys } from "@/features/admin-orders/api/admin-order-query-keys";
import { useBranchStore } from "@/stores/branch.store";

const app = createApp(App);
const pinia = createPinia();
const branchStore = useBranchStore(pinia);

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });

setupApiInterceptors(pinia, { queryClient, router });
const stopInventorySync = setupInventorySync();
const stopCartSync = setupCartSync(() => useCartActions().refresh());
const stopOrderSync = setupOrderSync((orderId) => {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: customerOrderKeys.all }),
    queryClient.invalidateQueries({
      queryKey: customerOrderKeys.detail(orderId),
    }),
  ];
  if (branchStore.selectedBranchId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.lists(branchStore.selectedBranchId),
      }),
      queryClient.invalidateQueries({
        queryKey: adminOrderKeys.detail(
          branchStore.selectedBranchId,
          orderId,
        ),
      }),
    );
  }
  return Promise.all(invalidations);
});

useThemeStore(pinia).initTheme();

app.mount("#app");

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopInventorySync();
    stopCartSync();
    stopOrderSync();
  });
}
