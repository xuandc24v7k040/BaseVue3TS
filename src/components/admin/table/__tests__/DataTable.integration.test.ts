// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ColumnDef } from '@tanstack/vue-table'
import { h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import DataTable from '../DataTable.vue'
import type {
  DataTableConfig,
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableGlobalSearch,
  DataTableQuery,
} from '../interface'

interface UserRow {
  id: string
  name: string
  role: string
  createdAt: string
}

const rows: UserRow[] = [
  { id: 'A', name: 'Alice', role: 'admin', createdAt: '2026-06-01' },
  { id: 'B', name: 'Bob', role: 'manager', createdAt: '2026-06-02' },
]

const columns: ColumnDef<UserRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) =>
      h(
        'button',
        {
          type: 'button',
          'aria-label': 'Sort name',
          onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        },
        'Name',
      ),
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: 'role',
    cell: ({ row }) => row.original.role,
  },
  {
    accessorKey: 'createdAt',
    cell: ({ row }) => row.original.createdAt,
  },
]

const globalSearch: DataTableGlobalSearch = {
  columnIds: ['name'],
  title: 'Search users',
  placeholder: 'Search users',
}

const roleFilter: DataTableFilterableColumn = {
  id: 'role',
  title: 'Role',
  options: [
    { label: 'Admin', value: 'admin' },
    { label: 'Manager', value: 'manager' },
  ],
}

const dateColumn: DataTableDateColumn = {
  id: 'createdAt',
  title: 'Created at',
  mode: 'range',
}

const mountedWrappers: VueWrapper[] = []

function compactConfig(overrides: Partial<DataTableConfig<UserRow>> = {}): DataTableConfig<UserRow> {
  return {
    tableId: 'users',
    rowIdKey: 'id',
    pageSize: 10,
    searchDebounce: 50,
    routeSync: {
      mode: 'compact',
      filterIds: ['role'],
      arrayFilterIds: ['role'],
      stringFilterIds: ['role'],
    },
    ...overrides,
  }
}

async function createRouterAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/users', component: { template: '<div />' } }],
  })
  await router.push(path)
  await router.isReady()
  return router
}

async function mountRoutedTable(options: {
  router: Router
  config?: DataTableConfig<UserRow>
  filterableColumns?: DataTableFilterableColumn[]
  dateColumns?: DataTableDateColumn[]
}) {
  const wrapper = mount(DataTable<UserRow>, {
    attachTo: document.body,
    props: {
      columns,
      data: rows,
      pageCount: 5,
      rowCount: 100,
      globalSearch,
      filterableColumns: options.filterableColumns ?? [roleFilter],
      dateColumns: options.dateColumns ?? [],
      config: options.config ?? compactConfig(),
    },
    slots: {
      filters: ({ table }) =>
        h('div', [
          h(
            'button',
            {
              type: 'button',
              'data-test': 'set-role-filter',
              onClick: () => table.getColumn('role')?.setFilterValue(['admin']),
            },
            'Set role filter',
          ),
          h(
            'button',
            {
              type: 'button',
              'data-test': 'set-date-filter',
              onClick: () =>
                table.getColumn('createdAt')?.setFilterValue({
                  start: '2026-06-01',
                  end: '2026-06-10',
                }),
            },
            'Set date filter',
          ),
          h(
            'button',
            {
              type: 'button',
              'data-test': 'clear-created-filter',
              onClick: () => table.getColumn('createdAt')?.setFilterValue(undefined),
            },
            'Clear created filter',
          ),
        ]),
    },
    global: {
      plugins: [options.router],
    },
  })

  await nextTick()
  mountedWrappers.push(wrapper)
  return wrapper
}

function emittedQueries(wrapper: VueWrapper) {
  return ((wrapper.emitted('update:query') ?? []) as [DataTableQuery][]).map(([query]) => query)
}

async function flushAsync() {
  await vi.runOnlyPendingTimersAsync()
  for (let i = 0; i < 5; i += 1) {
    await nextTick()
    await Promise.resolve()
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => {
    try {
      wrapper.unmount()
    } catch {
      // The wrapper may already be unmounted inside an individual test.
    }
  })
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('DataTable route-sync integration', () => {
  it('hydrates compact route query on initial mount and emits DataTableQuery', async () => {
    const router = await createRouterAt(
      '/users?q=abc&page=2&limit=20&sort=name:asc&role=admin,manager',
    )
    const wrapper = await mountRoutedTable({
      router,
      config: compactConfig({ pageSize: 10 }),
    })

    const [initialQuery] = emittedQueries(wrapper)

    expect(initialQuery).toMatchObject({
      page: 2,
      pageSize: 20,
      search: { value: 'abc', columnIds: ['name'] },
      sort: [{ id: 'name', desc: false }],
      filters: [{ id: 'role', value: ['admin', 'manager'], operator: 'in' }],
    })
  })

  it('syncs table state changes back to compact URL without removing unrelated params', async () => {
    const router = await createRouterAt('/users?tab=staff')
    const wrapper = await mountRoutedTable({ router })

    await wrapper.get('input[aria-label="Search users"]').setValue('alice')
    await vi.advanceTimersByTimeAsync(49)
    expect(router.currentRoute.value.query.q).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    await flushAsync()
    expect(router.currentRoute.value.query).toMatchObject({
      tab: 'staff',
      q: 'alice',
    })

    await wrapper.get('button[aria-label="Trang sau"]').trigger('click')
    await flushAsync()
    expect(emittedQueries(wrapper).at(-1)).toMatchObject({ page: 2 })
    expect(router.currentRoute.value.query).toMatchObject({
      tab: 'staff',
      q: 'alice',
      page: '2',
    })

    await wrapper.get('button[aria-label="Sort name"]').trigger('click')
    await flushAsync()
    expect(router.currentRoute.value.query).toMatchObject({
      tab: 'staff',
      sort: 'name:asc',
    })

    await wrapper.get('[data-test="set-role-filter"]').trigger('click')
    await flushAsync()
    expect(router.currentRoute.value.query).toMatchObject({
      tab: 'staff',
      role: 'admin',
    })

    await wrapper.get('input[aria-label="Search users"]').setValue('')
    await vi.advanceTimersByTimeAsync(50)
    await flushAsync()
    expect(router.currentRoute.value.query.tab).toBe('staff')
    expect(router.currentRoute.value.query.q).toBeUndefined()
  })

  it('updates table state when browser route query changes externally', async () => {
    const router = await createRouterAt('/users')
    const wrapper = await mountRoutedTable({ router })

    await router.push('/users?q=external&page=3&limit=50')
    await flushAsync()

    const latestQuery = emittedQueries(wrapper).at(-1)
    expect(latestQuery).toMatchObject({
      page: 3,
      pageSize: 50,
      search: { value: 'external', columnIds: ['name'] },
    })
  })

  it('keeps legacy namespaced fallback supported in compact mode', async () => {
    const router = await createRouterAt('/users?users.search=legacy&users.page=2')
    const wrapper = await mountRoutedTable({ router })

    const [initialQuery] = emittedQueries(wrapper)
    expect(initialQuery).toMatchObject({
      page: 2,
      search: { value: 'legacy', columnIds: ['name'] },
    })
  })

  it('throws for duplicate compact route keys in DEV', async () => {
    const router = await createRouterAt('/users')

    expect(() =>
      mount(DataTable<UserRow>, {
        props: {
          columns,
          data: rows,
          globalSearch,
          config: compactConfig({
            routeSync: {
              mode: 'compact',
              paramNames: { page: 'q' },
            },
          }),
        },
        global: {
          plugins: [router],
        },
      }),
    ).toThrow(/Duplicate route query key/)
  })

  it('hydrates valid date routes and ignores invalid or timezone-bearing date routes', async () => {
    const validRouter = await createRouterAt(
      '/users?createdAtFrom=2026-06-01&createdAtTo=2026-06-10',
    )
    const validWrapper = await mountRoutedTable({
      router: validRouter,
      config: compactConfig({
        routeSync: { mode: 'compact', filterIds: ['createdAt'] },
      }),
      filterableColumns: [],
      dateColumns: [dateColumn],
    })

    expect(emittedQueries(validWrapper)[0]?.filters).toEqual([
      {
        id: 'createdAt',
        value: { start: '2026-06-01', end: '2026-06-10' },
        operator: 'between',
      },
    ])
    validWrapper.unmount()

    const invalidRouter = await createRouterAt('/users?createdAtFrom=2026-06-01T08:30Z')
    const invalidWrapper = await mountRoutedTable({
      router: invalidRouter,
      config: compactConfig({
        routeSync: { mode: 'compact', filterIds: ['createdAt'] },
      }),
      filterableColumns: [],
      dateColumns: [dateColumn],
    })

    expect(emittedQueries(invalidWrapper)[0]?.filters).toBeUndefined()
  })

  it('syncs compact date filter changes to URL', async () => {
    const router = await createRouterAt('/users')
    const wrapper = await mountRoutedTable({
      router,
      config: compactConfig({
        routeSync: { mode: 'compact', filterIds: ['createdAt'] },
      }),
      filterableColumns: [],
      dateColumns: [dateColumn],
    })

    await wrapper.get('[data-test="set-date-filter"]').trigger('click')
    await flushAsync()

    expect(router.currentRoute.value.query).toMatchObject({
      createdAtFrom: '2026-06-01',
      createdAtTo: '2026-06-10',
    })

    await wrapper.get('[data-test="clear-created-filter"]').trigger('click')
    await flushAsync()
    expect(router.currentRoute.value.query.createdAtFrom).toBeUndefined()
    expect(router.currentRoute.value.query.createdAtTo).toBeUndefined()
  })
})
