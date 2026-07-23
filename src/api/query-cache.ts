import type { QueryClient } from '@tanstack/vue-query'
import { getAuthMeQueryKey } from '@/api/generated/endpoints/auth/auth'
import type { AuthMeResponseDto } from '@/api/generated/models'
import { cartQueryKey } from '@/features/cart/api/cart-api'

export function clearAuthSensitiveQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: getAuthMeQueryKey() })
  queryClient.removeQueries({ queryKey: cartQueryKey })
}

export function syncAuthMeQuery(
  queryClient: QueryClient,
  user: AuthMeResponseDto,
): void {
  queryClient.setQueryData(getAuthMeQueryKey(), {
    statusCode: 200,
    message: 'Authenticated',
    data: user,
  })
}
