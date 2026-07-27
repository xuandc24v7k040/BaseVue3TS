export const ORDER_DETAIL_QUERY_POLICY = {
  staleTime: 20_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

export const ORDER_LIST_QUERY_POLICY = {
  staleTime: 45_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;
