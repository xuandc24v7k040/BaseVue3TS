// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import { routes } from '@/router'

describe('permission management routes', () => {
  it('protects list and detail with permissions.read and no branch requirement', () => {
    const root = routes.find((route) => route.path === '/super-admin')
    const permissionRoutes = root?.children?.filter((route) => route.path.startsWith('permissions')) ?? []
    expect(permissionRoutes.map((route) => route.name)).toEqual(['super-admin-permissions', 'super-admin-permission-detail'])
    permissionRoutes.forEach((route) => {
      expect(route.meta?.requiredPermissions).toEqual([ADMIN_PERMISSIONS.PERMISSIONS_READ])
      expect(route.meta?.requiresSelectedBranch).not.toBe(true)
    })
  })
})
