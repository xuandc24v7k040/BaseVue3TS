// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import type { AuthMeResponseDto } from '@/api/generated/models'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import { resolveVisibleAdminMenu } from '@/authorization/admin-menu'
import { createPermissionPolicy } from '@/authorization/permission-policy'
import { routes } from '@/router'

const modules = [
  ['suppliers', ADMIN_PERMISSIONS.SUPPLIERS_READ],
  ['publishers', ADMIN_PERMISSIONS.PUBLISHERS_READ],
  ['authors', ADMIN_PERMISSIONS.AUTHORS_READ],
  ['product-attributes', ADMIN_PERMISSIONS.PRODUCT_ATTRIBUTES_READ],
] as const

describe('product master data routes and menu', () => {
  const superAdmin = routes.find((route) => route.path === '/super-admin')

  it.each(modules)(
    'protects list and detail routes for %s',
    (path, permission) => {
      const matching = superAdmin?.children?.filter((route) =>
        route.path.startsWith(path),
      )
      expect(matching).toHaveLength(2)
      expect(
        matching?.every(
          (route) => route.meta?.requiresSelectedBranch === false,
        ),
      ).toBe(true)
      expect(
        matching?.every((route) =>
          route.meta?.requiredPermissions?.includes(permission),
        ),
      ).toBe(true)
    },
  )

  it.each(modules)('resolves the lazy list component for %s', async (path) => {
    const route = superAdmin?.children?.find((item) => item.path === path)
    const loadComponent = route?.component as
      | (() => Promise<unknown>)
      | undefined

    expect(loadComponent).toBeTypeOf('function')
    await expect(loadComponent?.()).resolves.toBeDefined()
  })

  it('shows all four modules only to a permitted SYSTEM principal', () => {
    const principal = {
      type: 'SYSTEM',
      globalPermissions: modules.map(([, permission]) => permission),
      isSuperAdmin: false,
    } as AuthMeResponseDto
    const policy = createPermissionPolicy(principal, {
      isInitialized: true,
      effectivePermissions: [],
    })
    const ids = resolveVisibleAdminMenu('SYSTEM', policy).flatMap(
      (group) => group.children?.map((child) => child.id) ?? [],
    )
    expect(ids).toEqual(
      expect.arrayContaining([
        'suppliers',
        'publishers',
        'authors',
        'product-attributes',
      ]),
    )
    expect(
      resolveVisibleAdminMenu('BRANCH', policy).flatMap(
        (group) => group.children ?? [],
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'suppliers' }),
        expect.objectContaining({ id: 'publishers' }),
        expect.objectContaining({ id: 'authors' }),
        expect.objectContaining({ id: 'product-attributes' }),
      ]),
    )
  })
})
