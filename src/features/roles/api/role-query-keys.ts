import type { RolesListParams } from '@/api/generated/models'

export const roleKeys = {
  all: ['role-management'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (params: RolesListParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (roleId: string) => [...roleKeys.details(), roleId] as const,
}
