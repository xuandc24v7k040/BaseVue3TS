// @vitest-environment happy-dom

import { createMemoryHistory, createRouter } from 'vue-router'
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

  it('exposes only read-only product catalog routes to BRANCH users', () => {
    const root = routes.find((route) => route.path === '/branch-admin')
    const products = root?.children?.filter((route) => route.path.startsWith('products')) ?? []
    expect(products.map((route) => route.name)).toEqual([
      'branch-admin-products',
      'branch-admin-product-new-denied',
      'branch-admin-product-edit-denied',
      'branch-admin-product-detail',
    ])
    expect(products.find((route) => route.name === 'branch-admin-products')?.meta?.requiredPermissions)
      .toEqual([ADMIN_PERMISSIONS.PRODUCTS_READ])
    expect(products.find((route) => route.name === 'branch-admin-product-detail')?.meta?.requiredPermissions)
      .toEqual([ADMIN_PERMISSIONS.PRODUCTS_READ])
    expect(products.filter((route) => /denied/.test(String(route.name))).every((route) => route.component === undefined))
      .toBe(true)
  })

  it('never resolves mutation or invalid direct URLs as Product Detail', () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    const validId = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

    expect(router.resolve('/branch-admin/products/new').name).toBe('branch-admin-product-new-denied')
    expect(router.resolve(`/branch-admin/products/${validId}/edit`).name).toBe('branch-admin-product-edit-denied')
    expect(router.resolve(`/branch-admin/products/${validId}`).name).toBe('branch-admin-product-detail')
    expect(router.resolve('/branch-admin/products/not-a-ulid').name).not.toBe('branch-admin-product-detail')
  })
})
