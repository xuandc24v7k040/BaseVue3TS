import { describe, expect, it } from 'vitest'
import { createAdminTableConfig } from './presets'

interface UserRow {
  id: string
  name: string
  createdAt: string
}

describe('createAdminTableConfig', () => {
  it('creates a compact route-synced persistent admin table config by default', () => {
    const config = createAdminTableConfig<UserRow>({
      tableId: 'users',
      rowIdKey: 'id',
    })

    expect(config).toMatchObject({
      tableId: 'users',
      rowIdKey: 'id',
      pageSize: 10,
      maxPageSize: 100,
      routeSync: {
        mode: 'compact',
        replace: true,
      },
      persistence: {
        columns: true,
        pageSize: true,
        sorting: false,
      },
    })
  })

  it('allows disabling route sync and persistence for one-off tables', () => {
    const config = createAdminTableConfig<UserRow>({
      tableId: 'users',
      routeSync: false,
      persistence: false,
    })

    expect(config.routeSync).toBe(false)
    expect(config.persistence).toBe(false)
  })

  it('merges route-sync and persistence overrides without changing defaults', () => {
    const config = createAdminTableConfig<UserRow>({
      tableId: 'orders',
      pageSize: 20,
      maxPageSize: 50,
      routeSync: {
        keyPrefix: 'orders',
        arrayFormat: 'repeated',
      },
      persistence: {
        key: 'admin-orders',
        sorting: true,
      },
      enableRowSelection: true,
    })

    expect(config).toMatchObject({
      tableId: 'orders',
      rowIdKey: 'id',
      pageSize: 20,
      maxPageSize: 50,
      enableRowSelection: true,
      routeSync: {
        mode: 'compact',
        replace: true,
        keyPrefix: 'orders',
        arrayFormat: 'repeated',
      },
      persistence: {
        key: 'admin-orders',
        columns: true,
        pageSize: true,
        sorting: true,
      },
    })
  })
})

