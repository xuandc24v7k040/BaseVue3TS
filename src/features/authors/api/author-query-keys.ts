import type { AuthorsListParams } from '@/api/generated/models'
export const authorKeys = {
  all: ['authors'] as const,
  list: (p: AuthorsListParams) => ['authors', 'list', p] as const,
  detail: (id: string) => ['authors', 'detail', id] as const,
}
