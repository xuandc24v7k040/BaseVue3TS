import { watch, unref, type Ref } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type {
  DataTableConfig,
  DataTableSearchableColumn,
  DataTableFilterableColumn,
  DataTableDateColumn,
} from '../interface'
import { resolveRouteSyncConfig } from './route-sync'

function getMissingRowIdMessage(detail: string): string {
  return `[DataTable] Row selection requires stable row ids. ${detail} Provide config.rowIdKey or config.getRowId; index-based row ids are unsafe with server-side pagination.`
}

export function assertRowSelectionHasStableId<TData>(config: DataTableConfig<TData>): void {
  if (!config.enableRowSelection) return
  if (config.rowIdKey || config.getRowId) return

  const message = getMissingRowIdMessage('Missing both config.rowIdKey and config.getRowId.')
  throw new Error(message)
}

export function assertRowExpandingHasStableId<TData>(config: DataTableConfig<TData>): void {
  if (!config.enableExpanding) return
  if (config.rowIdKey || config.getRowId) return

  const message = getMissingRowIdMessage(
    'Row expanding requires stable row ids to prevent rendering inconsistencies when pages or data change.',
  )
  throw new Error(message)
}

interface UseDataTableDevWarningsProps<TData> {
  columns: ColumnDef<TData, unknown>[] | Ref<ColumnDef<TData, unknown>[]>
  resolvedSearchableColumns: Ref<DataTableSearchableColumn[]>
  resolvedFilterableColumns: Ref<DataTableFilterableColumn[]>
  resolvedDateColumns: Ref<DataTableDateColumn[]>
  resolvedConfig: Ref<DataTableConfig<TData>>
  resolvedSelectedRowIds: Ref<string[] | undefined>
}

export function useDataTableDevWarnings<TData>({
  columns,
  resolvedSearchableColumns,
  resolvedFilterableColumns,
  resolvedDateColumns,
  resolvedConfig,
  resolvedSelectedRowIds,
}: UseDataTableDevWarningsProps<TData>): void {
  if (import.meta.env.DEV) {
    watch(
      [
        () => unref(columns),
        resolvedSearchableColumns,
        resolvedFilterableColumns,
        resolvedDateColumns,
        resolvedConfig,
        resolvedSelectedRowIds,
      ],
      ([unrefColumns, searchable, filterable, dates, currentConfig, selectedIds]) => {
        const tableColumns = unrefColumns
          ? unrefColumns
              .map(
                (c) =>
                  (c as { id?: string; accessorKey?: string }).id ||
                  (c as { id?: string; accessorKey?: string }).accessorKey,
              )
              .filter((id): id is string => typeof id === 'string')
          : []
        const tableColumnSet = new Set(tableColumns)

        searchable.forEach((col) => {
          if (!tableColumnSet.has(col.id)) {
            console.warn(`[DataTable] Searchable column id "${col.id}" does not exist in columns definition.`)
          }
        })
        filterable.forEach((col) => {
          if (!tableColumnSet.has(col.id)) {
            console.warn(`[DataTable] Filterable column id "${col.id}" does not exist in columns definition.`)
          }
        })
        dates.forEach((col) => {
          if (!tableColumnSet.has(col.id)) {
            console.warn(`[DataTable] Date column id "${col.id}" does not exist in columns definition.`)
          }
        })

        // Check for duplicate column IDs across searchable, filterable, and date columns
        const searchableIds = new Set(searchable.map((c) => c.id))
        const filterableIds = new Set(filterable.map((c) => c.id))
        const dateIds = new Set(dates.map((c) => c.id))

        searchableIds.forEach((id) => {
          if (filterableIds.has(id)) {
            console.warn(
              `[DataTable] Column ID "${id}" is configured as both searchable and filterable. This is a duplicate configuration.`
            )
          }
          if (dateIds.has(id)) {
            console.warn(
              `[DataTable] Column ID "${id}" is configured as both searchable and a date column. This is a duplicate configuration.`
            )
          }
        })
        filterableIds.forEach((id) => {
          if (dateIds.has(id)) {
            console.warn(
              `[DataTable] Column ID "${id}" is configured as both filterable and a date column. This is a duplicate configuration.`
            )
          }
        })

        if (currentConfig.enableMultiRowSelection === false && selectedIds && selectedIds.length > 1) {
          console.warn(
            `[DataTable] enableMultiRowSelection is false but selectedRowIds contains ${selectedIds.length} items. Only the first item will be selected.`
          )
        }

        if (currentConfig.maxPageSize !== undefined && currentConfig.maxPageSize <= 0) {
          console.warn(
            `[DataTable] maxPageSize is configured with an invalid value: ${currentConfig.maxPageSize}. It must be greater than 0.`
          )
        }

        const routeSync = resolveRouteSyncConfig(currentConfig)
        if (routeSync && routeSync.mode === 'namespaced' && dates.length > 0) {
          console.warn(
            `[DataTable] Namespaced routeSync mode will serialize date range filter values as JSON strings in URL parameters. Consider using 'compact' mode or providing custom serializers for clean date params (From/To).`
          )
        }

        if (routeSync && routeSync.mode === 'compact') {
          const routeSyncObject =
            currentConfig.routeSync && typeof currentConfig.routeSync === 'object'
              ? currentConfig.routeSync
              : {}
          const reservedKeys = new Set(Object.values(routeSync.paramNames))
          const filterIds = Array.from(
            new Set([
              ...searchable.map((c) => c.id),
              ...filterable.map((c) => c.id),
              ...dates.map((c) => c.id),
              ...(routeSyncObject.filterIds ?? []),
              ...Object.keys(routeSync.filterParamMap),
            ])
          )
          filterIds.forEach((filterId) => {
            const paramKey = routeSync.filterParamMap[filterId] ?? filterId
            if (reservedKeys.has(paramKey)) {
              console.warn(
                `[DataTable] Filter column ID or param key "${paramKey}" (for filter ID "${filterId}") collides with reserved table query parameters in compact mode. Please rename the filter column or specify a unique mapping in routeSync.filterParamMap.`
              )
            }
          })
        }
      },
      { immediate: true, deep: true },
    )
  }
}
