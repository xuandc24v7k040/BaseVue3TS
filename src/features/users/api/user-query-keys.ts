import type { UsersFindAllParams } from '@/api/generated/models'

export const userKeys = {
  all: () => ['users'] as const,
  lists: () => [...userKeys.all(), 'list'] as const,
  list: (params: UsersFindAllParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all(), 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}
