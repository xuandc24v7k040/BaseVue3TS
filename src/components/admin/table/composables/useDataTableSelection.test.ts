import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, effectScope, nextTick, ref, type EffectScope } from 'vue'
import type { DataTableConfig } from '../interface'
import { useDataTable } from './useDataTable'
import { useDataTableSelection } from './useDataTableSelection'

interface Row {
  id: string
  name: string
}

let activeScope: EffectScope | null = null

afterEach(() => {
  activeScope?.stop()
  activeScope = null
  vi.restoreAllMocks()
})

function createSelectionHarness(options: {
  config?: DataTableConfig<Row>
  controlled?: boolean
  selectedRowIds?: string[]
}) {
  const resolvedConfig = ref<DataTableConfig<Row>>(options.config ?? {})
  const selectedRowIds = ref<string[] | undefined>(options.selectedRowIds)
  const resolvedIsSelectionControlled = ref(options.controlled ?? false)
  const nonPaginationQueryKey = ref('query-a')
  const queryPage = ref(1)
  const queryPageSize = ref(10)
  const emitted: string[][] = []

  activeScope = effectScope()
  const selection = activeScope.run(() =>
    useDataTableSelection<Row>({
      resolvedConfig,
      resolvedSelectedRowIds: computed(() => selectedRowIds.value),
      resolvedIsSelectionControlled,
      nonPaginationQueryKey,
      queryPage,
      queryPageSize,
      onSelectionChange: (ids) => emitted.push(ids),
    }),
  )

  if (!selection) throw new Error('Selection harness failed to initialize')

  return {
    emitted,
    nonPaginationQueryKey,
    queryPage,
    queryPageSize,
    resolvedConfig,
    selectedRowIds,
    selection,
  }
}

describe('useDataTableSelection', () => {
  it('supports uncontrolled selection and clearing', () => {
    const { selection } = createSelectionHarness({ controlled: false })

    selection.rowSelection.value = { A: true, B: true }

    expect(selection.selectedIds.value).toEqual(['A', 'B'])

    selection.resetSelection()

    expect(selection.selectedIds.value).toEqual([])
  })

  it('supports controlled selection without mutating local source of truth', () => {
    const { emitted, selectedRowIds, selection } = createSelectionHarness({
      controlled: true,
      selectedRowIds: ['A'],
    })

    expect(selection.selectedIds.value).toEqual(['A'])

    selection.rowSelection.value = { A: true, B: true }

    expect(emitted).toEqual([['A', 'B']])
    expect(selection.selectedIds.value).toEqual(['A'])

    selectedRowIds.value = ['A', 'B']

    expect(selection.selectedIds.value).toEqual(['A', 'B'])
  })

  it('clears selection on query change when configured', async () => {
    const { nonPaginationQueryKey, selection } = createSelectionHarness({
      config: { clearSelectionOnQueryChange: true },
    })

    selection.rowSelection.value = { A: true }
    nonPaginationQueryKey.value = 'query-b'
    await nextTick()

    expect(selection.selectedIds.value).toEqual([])
  })

  it('clears selection on page change when configured', async () => {
    const { queryPage, selection } = createSelectionHarness({
      config: { clearSelectionOnPageChange: true },
    })

    selection.rowSelection.value = { A: true }
    queryPage.value = 2
    await nextTick()

    expect(selection.selectedIds.value).toEqual([])
  })

  it('preserves selection on query/page change when clearing is disabled', async () => {
    const { nonPaginationQueryKey, queryPage, selection } = createSelectionHarness({
      config: {
        clearSelectionOnQueryChange: false,
        clearSelectionOnPageChange: false,
      },
    })

    selection.rowSelection.value = { A: true }
    nonPaginationQueryKey.value = 'query-b'
    queryPage.value = 2
    await nextTick()

    expect(selection.selectedIds.value).toEqual(['A'])
  })

  it('emits an empty array when controlled selection is reset', () => {
    const { emitted, selection } = createSelectionHarness({
      controlled: true,
      selectedRowIds: ['A', 'B'],
    })

    selection.resetSelection()

    expect(emitted).toEqual([[]])
  })
})

describe('useDataTable cross-page selection contract', () => {
  it('keeps selectedIds across pages while current page rows only include loaded rows', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const data = ref<Row[]>([
      { id: 'A', name: 'Alpha' },
      { id: 'B', name: 'Beta' },
    ])
    const selectedRowIds = ref<string[] | undefined>(['A', 'C', 'D'])
    const columns: ColumnDef<Row, unknown>[] = [
      {
        accessorKey: 'id',
      },
      {
        accessorKey: 'name',
      },
    ]

    activeScope = effectScope()
    const table = activeScope.run(() =>
      useDataTable<Row>({
        columns,
        data,
        config: {
          rowIdKey: 'id',
          enableRowSelection: true,
          emitInitialQuery: false,
        },
        selectedRowIds,
        isSelectionControlled: true,
        pageCount: 1,
      }),
    )

    if (!table) throw new Error('Table harness failed to initialize')
    await nextTick()

    expect(table.selectedIds.value).toEqual(['A', 'C', 'D'])
    expect(table.selectedCurrentPageRows.value.map((row) => row.id)).toEqual(['A'])
    expect(table.selectedRows.value.map((row) => row.id)).toEqual(['A'])
  })
})
