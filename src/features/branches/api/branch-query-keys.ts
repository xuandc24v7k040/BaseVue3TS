import type { BranchesListParams } from '@/api/generated/models'

export const branchKeys = {
  all: ['branch-management'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (scopeId: string | null, params: BranchesListParams) =>
    [...branchKeys.lists(), scopeId ?? 'system', params] as const,
  details: () => [...branchKeys.all, 'detail'] as const,
  detail: (scopeId: string | null, branchId: string) =>
    [...branchKeys.details(), scopeId ?? 'system', branchId] as const,
  options: () => [...branchKeys.all, 'options'] as const,
}
