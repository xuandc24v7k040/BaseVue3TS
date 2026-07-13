// @vitest-environment happy-dom

import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/router'

describe('customer auth route regression', () => {
  const router = createRouter({ history: createMemoryHistory(), routes })

  it.each([
    ['/login', 'customer-login'],
    ['/register', 'customer-register'],
    ['/auth/callback', 'customer-auth-callback'],
    ['/admin/login', 'admin-login'],
  ])('keeps %s mapped to %s', (path, name) => {
    expect(router.resolve(path).name).toBe(name)
  })
})
