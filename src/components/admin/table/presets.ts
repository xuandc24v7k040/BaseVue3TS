import type {
  DataTableConfig,
  DataTablePersistenceConfig,
  DataTableRouteSyncConfig,
} from './interface'

type AdminTableRouteSyncPreset = boolean | Partial<DataTableRouteSyncConfig> | undefined
type AdminTablePersistencePreset = boolean | Partial<DataTablePersistenceConfig> | undefined

export interface CreateAdminTableConfigOptions<TData extends object> {
  tableId: string
  rowIdKey?: Extract<keyof TData, string>
  storageKey?: string
  pageSize?: number
  maxPageSize?: number
  routeSync?: AdminTableRouteSyncPreset
  persistence?: AdminTablePersistencePreset
  enableRowSelection?: boolean
  clearSelectionOnQueryChange?: boolean
  clearSelectionOnPageChange?: boolean
}

function resolvePresetRouteSync(
  routeSync: AdminTableRouteSyncPreset,
): DataTableConfig['routeSync'] {
  if (routeSync === false) return false
  if (routeSync === true || routeSync === undefined) {
    return {
      mode: 'compact',
      replace: true,
    }
  }

  return {
    mode: 'compact',
    replace: true,
    ...routeSync,
  }
}

function resolvePresetPersistence(
  persistence: AdminTablePersistencePreset,
): DataTableConfig['persistence'] {
  if (persistence === false) return false
  if (persistence === true || persistence === undefined) {
    return {
      columns: true,
      pageSize: true,
      sorting: false,
    }
  }

  return {
    columns: true,
    pageSize: true,
    sorting: false,
    ...persistence,
  }
}

export function createAdminTableConfig<TData extends object>(
  options: CreateAdminTableConfigOptions<TData>,
): DataTableConfig<TData> {
  return {
    tableId: options.tableId,
    storageKey: options.storageKey,
    rowIdKey: options.rowIdKey ?? ('id' as Extract<keyof TData, string>),
    pageSize: options.pageSize ?? 10,
    maxPageSize: options.maxPageSize ?? 100,
    routeSync: resolvePresetRouteSync(options.routeSync),
    persistence: resolvePresetPersistence(options.persistence),
    enableRowSelection: options.enableRowSelection,
    clearSelectionOnQueryChange: options.clearSelectionOnQueryChange,
    clearSelectionOnPageChange: options.clearSelectionOnPageChange,
  }
}
