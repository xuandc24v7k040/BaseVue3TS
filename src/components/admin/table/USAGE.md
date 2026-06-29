# DataTable Usage

DataTable is a strict server-side component. It owns table UI state, then emits a
`DataTableQuery` through `update:query`. The parent owns API calls, loading/error
state, `data`, `pageCount`, and `rowCount`.

Do not pass all server rows into DataTable for client-side filtering/sorting.
Fetch only the current server page and pass the total count returned by the API.

## Admin Table Config Preset

Use `createAdminTableConfig` for standard admin tables so every page does not
manually repeat route sync, persistence, page-size, and row-id defaults.

```ts
import { createAdminTableConfig } from '@/components/admin/table/presets'

const tableConfig = createAdminTableConfig<OrderRow>({
  tableId: 'orders',
  rowIdKey: 'id',
  pageSize: 20,
  enableRowSelection: true,
})
```

Default preset behavior:

- `routeSync: { mode: 'compact', replace: true }`
- `persistence: { columns: true, pageSize: true, sorting: false }`
- `pageSize: 10`
- `maxPageSize: 100`
- `rowIdKey: 'id'`

## Parent API Adapter

Use an adapter in the parent page so DataTable query shape does not leak into API
services.

```ts
import { computed, ref } from 'vue'
import DataTable from '@/components/admin/table/DataTable.vue'
import { createDataTableApiQueryAdapter } from '@/components/admin/table/adapters'
import type { DataTableQuery, DateRangeValue } from '@/components/admin/table/interface'

interface OrderRow {
  id: string
  code: string
  status: string
  createdAt: string
}

interface OrderListParams {
  page: number
  limit: number
  search?: string
  searchBy?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: string[]
  createdAtFrom?: string
  createdAtTo?: string
}

const rows = ref<OrderRow[]>([])
const rowCount = ref(0)
const isLoading = ref(false)
const error = ref<Error | null>(null)
const selectedRowIds = ref<string[]>([])

const pageSize = 20
const pageCount = computed(() => Math.max(1, Math.ceil(rowCount.value / pageSize)))

const toApiParams = createDataTableApiQueryAdapter<OrderListParams>({
  pageKey: 'page',
  pageSizeKey: 'limit',
  serializeFilters(query) {
    const params: Partial<OrderListParams> = {}

    for (const filter of query.filters ?? []) {
      if (filter.id === 'status' && Array.isArray(filter.value)) {
        params.status = filter.value.map(String)
      }

      if (filter.id === 'createdAt' && isDateRangeValue(filter.value)) {
        params.createdAtFrom = toApiDateBound(filter.value.start, 'start')
        params.createdAtTo = toApiDateBound(filter.value.end, 'end')
      }
    }

    return params
  },
  map(params) {
    return params as OrderListParams
  },
})

async function handleQueryChange(query: DataTableQuery) {
  isLoading.value = true
  error.value = null

  try {
    const response = await orderApi.list(toApiParams(query))
    rows.value = response.items
    rowCount.value = response.total
  } catch (cause) {
    error.value = cause instanceof Error ? cause : new Error('Failed to load orders')
  } finally {
    isLoading.value = false
  }
}

function isDateRangeValue(value: unknown): value is DateRangeValue {
  return Boolean(value && typeof value === 'object' && ('start' in value || 'end' in value))
}

const APP_OFFSET = '+07:00'

function toApiDateBound(value: string | undefined, bound: 'start' | 'end') {
  if (!value) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = bound === 'start' ? '00:00:00.000' : '23:59:59.999'
    return `${value}T${time}${APP_OFFSET}`
  }
  return `${value}:00.000${APP_OFFSET}`
}
```

```vue
<DataTable
  v-model:selected-row-ids="selectedRowIds"
  :columns="columns"
  :data="rows"
  :page-count="pageCount"
  :row-count="rowCount"
  :is-loading="isLoading"
  :error="error"
  :config="{
    tableId: 'orders',
    rowIdKey: 'id',
    pageSize,
    enableRowSelection: true,
    clearSelectionOnQueryChange: true,
    routeSync: { mode: 'compact' },
  }"
  @update:query="handleQueryChange"
/>
```

## Standard API Query Adapter

For common admin endpoints, use `toDataTableApiParams` instead of mapping
`DataTableQuery` by hand in every page.

```ts
import { toDataTableApiParams } from '@/components/admin/table/adapters'

function handleQueryChange(query: DataTableQuery) {
  const apiParams = toDataTableApiParams(query, {
    pageBase: 1,
    sortFormat: 'csv',
    filterKeyMap: {
      createdAt: 'createdAt',
      role: 'role',
    },
    sortKeyMap: {
      createdAt: 'created_at',
    },
  })

  return orderApi.list(apiParams)
}
```

Default output shape:

```ts
{
  page: 1,
  limit: 20,
  search: 'abc',
  sort: 'name:asc,createdAt:desc',
  role: ['admin', 'manager'],
  status: 'active',
  createdAtFrom: '2026-06-01',
  createdAtTo: '2026-06-10',
}
```

`dateFormat: 'local'` is the default and preserves DataTable UI strings. If you
use `dateFormat: 'iso'`, provide an explicit fixed `timezone` such as `+07:00`;
without it, date strings are preserved to avoid assuming UTC or the host runtime
timezone silently.

## Query Emission Contract

DataTable emits the first query by default through `emitInitialQuery`. Parent pages
should not duplicate that initial fetch in `onMounted`; use `@update:query` as the
single source of server requests.

Search inputs are debounced. Pagination, page-size changes, sorting, and
non-search filters emit immediately so the user is never left waiting on a stale
debounce timer after clicking a page control or changing a faceted/date filter.

## Route Sync Safety

Compact route sync fails fast when query keys are ambiguous. Keep `paramNames`
unique, avoid mapping a filter to the same key as `q`, `page`, `limit`, or
`sort`, and ensure filter params do not collide with date range suffixes such as
`createdAtFrom` / `createdAtTo`.

Compact date params accept only local UI date strings:

- `YYYY-MM-DD`
- `YYYY-MM-DDTHH:mm`
- `YYYY-MM-DDTHH:mm:ss`
- `YYYY-MM-DDTHH:mm:ss.SSS`

Invalid times such as `2026-06-01T99:99` and timezone values such as `Z` or
`+07:00` are rejected during route parsing.

## Custom Slot Filters

Custom filters rendered through the `#filters` slot should derive their current
value from the TanStack column state, not from a separate local `ref`. This keeps
the UI correct when route sync, browser back/forward, or `resetAllTableState()`
changes the filter externally.

```vue
<template #filters="{ table }">
  <Select
    :model-value="table.getColumn('totalAmount')?.getFilterValue() ?? 'all'"
    @update:model-value="
      (value) => table.getColumn('totalAmount')?.setFilterValue(value === 'all' ? undefined : value)
    "
  >
    <!-- options -->
  </Select>
</template>
```

## Selection Contract

DataTable supports two selection modes.

Uncontrolled mode is used when `selectedRowIds` is omitted or passed as
`undefined`. DataTable owns the checked visual state and emits
`update:selectedRowIds` so parent pages can observe selected ids.

Controlled mode is used when `selectedRowIds` is an array, including `[]`.
Parent owns the selection source of truth. DataTable only emits
`update:selectedRowIds`; the checked visual state updates after the parent passes
the next `selectedRowIds` value back.

```vue
<DataTable
  :selected-row-ids="selectedRowIds"
  @update:selected-row-ids="(ids) => { selectedRowIds = ids }"
/>
```

If the parent ignores `update:selectedRowIds`, the checkbox state will remain
unchanged. That is expected controlled-component behavior, not a table bug.

Use `selectedIds` for server-side bulk operations. It stores stable row IDs across
server pages.

Use `selectedCurrentPageRows` only when the parent needs row objects that are
present on the current page.

`selectedRows` is deprecated. It remains as a backward-compatible alias for
`selectedCurrentPageRows`, but new code should not use it.

When `enableRowSelection` or `enableExpanding` is enabled, duplicate row ids throw
in DEV because selection and expansion state depend on unique, stable ids across
server pages. Provide `config.rowIdKey` or `config.getRowId` for hierarchical or
non-standard data.

Duplicate persistence keys warn in DEV because multiple mounted tables using the
same `tableId`, `storageKey`, or `persistence.key` can overwrite each other's
localStorage state.

## Date And Timezone Contract

Date filters emit UI-safe strings only:

- Date-only modes: `YYYY-MM-DD`
- Datetime modes: `YYYY-MM-DDTHH:mm`

DataTable does not append timezone offsets, convert to UTC, or decide inclusive
and exclusive bounds. The parent API adapter must convert date filter values to
the backend contract.

Recommended backend contract:

- Document the application timezone or require UTC timestamps.
- Convert date-only start to the start of day.
- Convert date-only end to the end of day, or use an exclusive next-day bound if
  that is the backend convention.
- Never pass `Z` or `+07:00` values back into DataTable `modelValue`; normalize
  them before they enter table filter state.

## Modes To Demo

The app-level demo page should cover these modes:

- Basic server-side table
- Row selection and bulk actions
- Row click
- Detail expansion
- Tree expansion
- Date filters with parent-side timezone normalization

## Production Hardening Changes

These changes were made to raise the table closer to production readiness for
admin dashboards:

- Page-only query changes are excluded from search debounce and emit immediately.
- Compact date route parsing validates the full local datetime string, including
  invalid time values.
- Duplicate route query keys fail fast instead of only warning in development.
- Duplicate persistence keys warn in development.
- `createAdminTableConfig()` provides a standard admin-table preset.
- Persisted sorting is sanitized against the current column IDs before restore.
- Pagination custom page-size input and date-time filter inputs have explicit
  labels/error descriptions for assistive technologies.
- `OrdersPage.vue` now uses the current DataTable contract: no duplicate initial
  fetch, custom amount filter syncs from column state, and reset goes through
  `resetAllTableState()`.
