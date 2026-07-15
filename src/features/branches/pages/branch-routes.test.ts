// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import { routes } from '@/router'

describe('branch management routes', () => {
  it('protects list and detail with branches.read', () => {
    const root = routes.find((route) => route.path === '/super-admin')
    const branchRoutes = root?.children?.filter((route) => route.path.startsWith('branches')) ?? []
    expect(branchRoutes.map((route) => route.name)).toEqual([
      'super-admin-branches',
      'super-admin-branch-detail',
    ])
    branchRoutes.forEach((route) => {
      expect(route.meta?.requiredPermissions).toEqual([ADMIN_PERMISSIONS.BRANCHES_READ])
    })
  })
})
