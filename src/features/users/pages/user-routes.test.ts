// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { routes } from '@/router'

describe('Users routes', () => {
  const superAdmin = routes.find((route) => route.path === '/super-admin')

  it('keeps list and detail global with exact users.read permission', () => {
    const list = superAdmin?.children?.find((route) => route.name === 'super-admin-users')
    const detail = superAdmin?.children?.find((route) => route.name === 'super-admin-user-detail')

    expect(list?.meta).toMatchObject({ requiredPermissions: ['users.read'] })
    expect(detail?.meta).toMatchObject({ requiredPermissions: ['users.read'] })
    expect(list?.meta?.requiresSelectedBranch).not.toBe(true)
    expect(detail?.meta?.requiresSelectedBranch).not.toBe(true)
  })
})
