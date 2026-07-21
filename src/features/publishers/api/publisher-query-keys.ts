import type { PublishersListParams } from '@/api/generated/models'
export const publisherKeys = {
  all: ['publishers'] as const,
  lists: () => ['publishers', 'list'] as const,
  list: (p: PublishersListParams) => ['publishers', 'list', p] as const,
  detail: (id: string) => ['publishers', 'detail', id] as const,
}
