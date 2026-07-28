import type { QueryClient } from "@tanstack/vue-query";
import { engagementKeys } from "@/features/engagement/api/engagement-api";
import { clearWishlistStatuses } from "@/features/engagement/composables/use-wishlist-status";
import { getAuthMeQueryKey } from "@/api/generated/endpoints/auth/auth";
import type { AuthMeResponseDto } from "@/api/generated/models";
import { cartQueryKey } from "@/features/cart/api/cart-api";

export function clearAuthSensitiveQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: getAuthMeQueryKey() });
  queryClient.removeQueries({ queryKey: cartQueryKey });
  queryClient.removeQueries({ queryKey: engagementKeys.all });
  clearWishlistStatuses();
}

export function syncAuthMeQuery(
  queryClient: QueryClient,
  user: AuthMeResponseDto,
): void {
  queryClient.setQueryData(getAuthMeQueryKey(), {
    statusCode: 200,
    message: "Authenticated",
    data: user,
  });
}
