// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import { routes } from '@/router'

describe('role management routes', () => {
  it('protects list and detail with roles.read and does not require a branch', () => {
    const root = routes.find((route) => route.path === '/super-admin')
    const roleRoutes = root?.children?.filter((route) => route.path.startsWith('roles')) ?? []
    expect(roleRoutes.map((route) => route.name)).toEqual(['super-admin-roles', 'super-admin-role-detail'])
    roleRoutes.forEach((route) => {
      expect(route.meta?.requiredPermissions).toEqual([ADMIN_PERMISSIONS.ROLES_READ])
      expect(route.meta?.requiresSelectedBranch).not.toBe(true)
    })
  })
})
