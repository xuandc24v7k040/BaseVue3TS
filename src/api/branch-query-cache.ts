import type { QueryClient, QueryKey } from '@tanstack/vue-query'

export const branchScopedQueryKeys = {
  all: ['branch-scoped'] as const,
  scope: (branchId: string) => ['branch-scoped', branchId] as const,
  resource: (
    branchId: string,
    resource: string,
    params?: Readonly<Record<string, unknown>>,
  ): QueryKey => ['branch-scoped', branchId, resource, params ?? null] as const,
}

export async function changeBranchQueryScope(
  client: QueryClient,
  previousBranchId: string | null,
  nextBranchId: string | null,
  applySelection: () => void,
): Promise<void> {
  if (previousBranchId) {
    await client.cancelQueries({
      queryKey: branchScopedQueryKeys.scope(previousBranchId),
    })
  }

  applySelection()

  if (nextBranchId) {
    await client.invalidateQueries({
      queryKey: branchScopedQueryKeys.scope(nextBranchId),
    })
  }
}
