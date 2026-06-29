# DataTable

DataTable is a server-side admin table for Bookora dashboards. It owns UI state
for search, filters, sorting, pagination, selection, expansion, route sync, and
optional persistence. Parent pages own API calls and server data.

## 1. Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import DataTable from '@/components/admin/table/DataTable.vue'
import { createAdminTableConfig } from '@/components/admin/table/presets'
import type { DataTableQuery } from '@/components/admin/table/interface'

interface UserRow {
  id: string
  name: string
  role: string
}

const rows = ref<UserRow[]>([])
const rowCount = ref(0)
const selectedRowIds = ref<string[]>([])

const tableConfig = createAdminTableConfig<UserRow>({
  tableId: 'users',
  rowIdKey: 'id',
  enableRowSelection: true,
})

async function handleQueryChange(query: DataTableQuery) {
  // Convert query to API params, fetch rows, then update rows/rowCount.
}
</script>

<template>
  <DataTable
    v-model:selected-row-ids="selectedRowIds"
    :columns="columns"
    :data="rows"
    :row-count="rowCount"
    :config="tableConfig"
    @update:query="handleQueryChange"
  />
</template>
```

## 2. Server-Side Query Flow

```txt
User interacts with the table
-> DataTable emits update:query
-> Page converts DataTableQuery to API params
-> Page calls API
-> Page passes data/pageCount/rowCount/isLoading/error back to DataTable
```

Do not pass every server row into DataTable for client-side filtering or sorting.
Keep the table server-side and fetch only the current page.

## 3. Route Sync Compact Mode

`createAdminTableConfig()` enables compact route sync by default:

```ts
routeSync: {
  mode: 'compact',
  replace: true,
}
```

Compact URLs use keys such as `q`, `page`, `limit`, `sort`, and filter ids. Use
distinct `tableId`, `routeSync.keyPrefix`, or namespaced mode when multiple
tables live on one route. Duplicate compact keys throw in DEV/test.

## 4. Selection Mode

Uncontrolled mode:

```vue
<DataTable enable-selection />
```

DataTable owns visual selection state and still emits `update:selectedRowIds`
for parent side effects.

Controlled mode:

```vue
<DataTable
  :selected-row-ids="selectedRowIds"
  @update:selected-row-ids="(ids) => selectedRowIds = ids"
/>
```

Parent owns `selectedRowIds`. DataTable emits the next ids only. The checked UI
updates after the parent passes the new `selectedRowIds` value back. If the
parent ignores the event, the UI remains unchanged by design.

For cross-page bulk actions, use `selectedIds`. `selectedCurrentPageRows` only
contains row objects loaded on the current server page. `selectedRows` is a
deprecated alias for `selectedCurrentPageRows`.

## 5. Date Filter

Date filters emit local UI strings:

- `YYYY-MM-DD`
- `YYYY-MM-DDTHH:mm`

DataTable does not append timezone offsets or convert to UTC. Convert date
ranges in the parent adapter before calling the backend.

## 6. Faceted Filter

Use `filterableColumns` for enum-like filters:

```ts
const filterableColumns = [
  {
    id: 'role',
    title: 'Role',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'Manager', value: 'manager' },
    ],
  },
]
```

If a custom slot sets a filter that is not listed in `filterableColumns`,
`searchableColumns`, or `dateColumns`, register it in `config.routeSync.filterIds`
so route sync can serialize, parse, and clear it.

## 7. Row Action

Use the `row-actions` slot for explicit per-row actions:

```vue
<template #row-actions="{ rowData }">
  <Button size="icon" @click="openDetails(rowData)">...</Button>
</template>
```

If `enableRowClick` is enabled, interactive content inside cells should stop
propagation or use `data-ignore-row-click="true"` to avoid triggering row click.

## 8. Bulk Action

```vue
<template #bulk-actions="{ selectedIds, selectedCurrentPageRows }">
  <Button :disabled="selectedIds.length === 0" @click="bulkDisable(selectedIds)">
    Disable selected
  </Button>
</template>
```

Use ids for server-side bulk operations. Current-page row objects are for local
display only.

## 9. Common Mistakes

- Passing `selectedRowIds` but not updating it after `update:selectedRowIds`.
- Using `selectedRows` for cross-page bulk API calls.
- Reusing one `tableId` or `persistence.key` for multiple mounted tables.
- Adding compact route filters without checking key collisions.
- Passing timezone strings such as `Z` or `+07:00` into date filter state.
- Triggering an extra initial fetch in `onMounted` when `emitInitialQuery` is
  already enabled.
- Raising `maxPageSize` for thousands of rows instead of adding virtualization.

