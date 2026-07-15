import { QueryClient } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
import {
  branchScopedQueryKeys,
  changeBranchQueryScope,
} from '@/api/branch-query-cache'

const BRANCH_A = '01K00000000000000000000001'
const BRANCH_B = '01K00000000000000000000002'

describe('branch-scoped query cache', () => {
  it('isolates the same resource by branch ID', () => {
    const first = branchScopedQueryKeys.resource(BRANCH_A, 'staff', { page: 1 })
    const second = branchScopedQueryKeys.resource(BRANCH_B, 'staff', { page: 1 })

    expect(first).not.toEqual(second)
    expect(first).toEqual(['branch-scoped', BRANCH_A, 'staff', { page: 1 }])
  })

  it('cancels the old scope, applies selection, and invalidates only the new scope', async () => {
    const client = new QueryClient()
    const cancel = vi.spyOn(client, 'cancelQueries')
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const apply = vi.fn()

    client.setQueryData(['auth', 'me'], { id: 'user' })
    client.setQueryData(['public', 'books'], ['book'])

    await changeBranchQueryScope(client, BRANCH_A, BRANCH_B, apply)

    expect(cancel).toHaveBeenCalledWith({ queryKey: ['branch-scoped', BRANCH_A] })
    expect(apply).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['branch-scoped', BRANCH_B] })
    expect(client.getQueryData(['auth', 'me'])).toEqual({ id: 'user' })
    expect(client.getQueryData(['public', 'books'])).toEqual(['book'])
  })

  it('does not clear global cache when moving to system scope', async () => {
    const client = new QueryClient()
    client.setQueryData(['global', 'settings'], { locale: 'vi' })

    await changeBranchQueryScope(client, BRANCH_A, null, () => undefined)

    expect(client.getQueryData(['global', 'settings'])).toEqual({ locale: 'vi' })
  })
})
