// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ColumnDef } from '@tanstack/vue-table'
import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import { useDataTable } from './useDataTable'
import {
  getDataTablePersistedState,
  useDataTablePersistence,
} from './useDataTablePersistence'

interface Row {
  id: string
  name: string
}

let activeScope: EffectScope | null = null

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'id' },
  { accessorKey: 'name' },
]

const data: Row[] = [
  { id: 'A', name: 'Alpha' },
]

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  activeScope?.stop()
  activeScope = null
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useDataTablePersistence', () => {
  it('does not write localStorage without tableId/storageKey/persistence.key', async () => {
    activeScope = effectScope()
    activeScope.run(() =>
      useDataTablePersistence({
        config: ref({ persistence: true }),
        columnVisibility: ref({}),
        pageSize: ref(10),
        sorting: ref([]),
      }),
    )

    await nextTick()
    expect(localStorage.length).toBe(0)
  })

  it('writes pageSize, sorting, and columnVisibility with schema version', async () => {
    const columnVisibility = ref({ name: false })
    const pageSize = ref(10)
    const sorting = ref([{ id: 'name', desc: true }])

    activeScope = effectScope()
    activeScope.run(() =>
      useDataTablePersistence({
        config: ref({
          tableId: 'orders',
          persistence: {
            version: 3,
            pageSize: true,
            columns: true,
            sorting: true,
          },
        }),
        columnVisibility,
        pageSize,
        sorting,
      }),
    )

    pageSize.value = 20
    await nextTick()

    expect(JSON.parse(localStorage.getItem('dt:orders') ?? '{}')).toEqual({
      key: 'dt:orders',
      version: 3,
      columnVisibility: { name: false },
      pageSize: 20,
      sorting: [{ id: 'name', desc: true }],
    })
  })

  it('ignores version mismatch and corrupted JSON', () => {
    localStorage.setItem('dt:orders', JSON.stringify({ version: 1, pageSize: 20 }))
    expect(
      getDataTablePersistedState({
        tableId: 'orders',
        persistence: { version: 2 },
      }),
    ).toEqual({})

    localStorage.setItem('dt:broken', '{not json')
    expect(
      getDataTablePersistedState({
        tableId: 'broken',
        persistence: true,
      }),
    ).toEqual({})
  })

  it('clamps persisted pageSize to maxPageSize through useDataTable', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    localStorage.setItem('dt:orders', JSON.stringify({ version: 1, pageSize: 500 }))

    activeScope = effectScope()
    const table = activeScope.run(() =>
      useDataTable<Row>({
        columns,
        data,
        config: {
          tableId: 'orders',
          rowIdKey: 'id',
          maxPageSize: 100,
          persistence: { pageSize: true },
          emitInitialQuery: false,
        },
      }),
    )

    if (!table) throw new Error('Table harness failed to initialize')
    expect(table.query.value.pageSize).toBe(100)
  })

  it('keeps table usable when persisted visibility references stale column ids', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    localStorage.setItem(
      'dt:orders',
      JSON.stringify({
        version: 1,
        columnVisibility: {
          missing: false,
          id: false,
        },
      }),
    )

    activeScope = effectScope()
    const table = activeScope.run(() =>
      useDataTable<Row>({
        columns,
        data,
        config: {
          tableId: 'orders',
          rowIdKey: 'id',
          persistence: { columns: true },
          emitInitialQuery: false,
        },
      }),
    )

    if (!table) throw new Error('Table harness failed to initialize')
    expect(table.table.getColumn('id')?.getIsVisible()).toBe(false)
    expect(table.table.getColumn('name')?.getIsVisible()).toBe(true)
  })
})
