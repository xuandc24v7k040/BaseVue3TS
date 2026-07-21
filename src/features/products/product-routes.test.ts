// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { routes } from '@/router'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'

describe('SYSTEM product routes', () => {
  it('declares lazy list, create, detail and edit routes with explicit permissions', () => {
    const root = routes.find((route) => route.path === '/super-admin')
    const products = root?.children?.filter((route) => route.path.startsWith('products')) ?? []
    expect(products.map((route) => [route.name, route.meta?.requiredPermissions])).toEqual([
      ['super-admin-products', [ADMIN_PERMISSIONS.PRODUCTS_READ]],
      ['super-admin-product-new', [ADMIN_PERMISSIONS.PRODUCTS_CREATE]],
      ['super-admin-product-detail', [ADMIN_PERMISSIONS.PRODUCTS_READ]],
      ['super-admin-product-edit', [ADMIN_PERMISSIONS.PRODUCTS_UPDATE]],
    ])
    expect(products.every((route) => typeof route.component === 'function')).toBe(true)
  })

  it('does not expose product catalog routes to BRANCH users', () => {
    const root = routes.find((route) => route.path === '/branch-admin')
    expect(root?.children?.some((route) => String(route.path).startsWith('products'))).toBe(false)
  })
})
