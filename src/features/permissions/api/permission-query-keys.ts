import type { PermissionsListParams } from '@/api/generated/models'

export const permissionKeys = {
  all: ['permission-management'] as const,
  catalog: () => [...permissionKeys.all, 'catalog'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: (params: PermissionsListParams) => [...permissionKeys.lists(), params] as const,
  details: () => [...permissionKeys.all, 'detail'] as const,
  detail: (permissionId: string) => [...permissionKeys.details(), permissionId] as const,
}
