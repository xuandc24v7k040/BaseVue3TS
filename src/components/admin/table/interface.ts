import type { Component } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'

export type DataTableFilterVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'active'
  | 'inactive'
  | 'invited'
  | 'removed'

export interface DataTableFilterOption {
  label: string
  value: string
  icon?: Component
  variant?: DataTableFilterVariant
}

export interface DataTableSearchableColumn {
  id: string
  title: string
  placeholder?: string
  operator?: DataTableFilterOperator
  getLabel?: (value: unknown) => string
}

export interface DataTableGlobalSearch {
  columnIds: string[]
  placeholder?: string
  title?: string
}

export interface DataTableFilterableColumn {
  id: string
  title: string
  options: DataTableFilterOption[]
  operator?: DataTableFilterOperator
  getLabel?: (value: unknown, options: DataTableFilterOption[]) => string
}

export interface DataTableDateColumn {
  id: string
  title: string
  placeholder?: string
  operator?: DataTableFilterOperator
  getLabel?: (value: unknown) => string
}

export interface DateRangeValue {
  start?: string
  end?: string
}

export type DataTableFilterOperator =
  | 'contains'
  | 'in'
  | 'between'
  | 'equals'
  | 'notEquals'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'startsWith'
  | 'endsWith'
export type DataTableFilterValue = string | string[] | number | boolean | DateRangeValue

export interface DataTableConfig<TData = unknown> {
  tableId?: string
  storageKey?: string
  persistence?: boolean | DataTablePersistenceConfig
  routeSync?: boolean | DataTableRouteSyncConfig
  enableRowSelection?: boolean
  enableMultiRowSelection?: boolean
  pageSize?: number
  rowIdKey?: Extract<keyof TData, string>
  getRowId?: (row: TData, index: number, parent?: TData) => string
  /**
   * Initial table state for server-side tables.
   * Changes after mount are intentionally not treated as controlled state.
   */
  initialSearch?: string
  initialFilters?: Array<{ id: string; value: DataTableFilterValue }>
  initialSorting?: Array<{ id: string; desc: boolean }>
  /** 0-based TanStack page index. Prefer this over initialPage for clarity. */
  initialPageIndex?: number
  /** @deprecated 0-based alias kept for backward compatibility. */
  initialPage?: number
  initialExpanded?: Record<string, boolean>
  initialColumnVisibility?: Record<string, boolean>
  /** @deprecated Use queryDebounce/searchDebounce. */
  filterDebounce?: number
  queryDebounce?: number
  searchDebounce?: number
  emitInitialQuery?: boolean
  clearSelectionOnQueryChange?: boolean
  clearSelectionOnPageChange?: boolean
  maxPageSize?: number
  enableColumnVisibility?: boolean
  enableExpanding?: boolean
  expandOnRowClick?: boolean
  autoExpandAll?: boolean
  autoExpandOnFilterIds?: string[]
  getSubRows?: (row: TData) => TData[] | undefined
}

export interface DataTablePersistenceConfig {
  key?: string
  version?: number
  columns?: boolean
  pageSize?: boolean
  sorting?: boolean
}

export type DataTableRouteSyncMode = 'namespaced' | 'compact'

export interface DataTableRouteSyncConfig {
  enabled?: boolean
  mode?: DataTableRouteSyncMode
  keyPrefix?: string
  page?: boolean
  pageSize?: boolean
  search?: boolean
  sorting?: boolean
  filters?: boolean
  replace?: boolean
  paramNames?: {
    search?: string
    page?: string
    pageSize?: string
    sort?: string
  }
  filterParamMap?: Record<string, string>
  arrayFormat?: 'comma' | 'repeated'
}

export interface DataTableServerParams {
  page: number
  limit: number
  search?: string
  searchBy?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: string
}

export interface DataTableAction {
  key?: string
  label: string
  icon?: Component
  onClick: () => void
  variant?: 'default' | 'destructive'
  separator?: boolean
  disabled?: boolean
}

export interface DataTableBulkAction<TData = Record<string, unknown>> {
  label: string
  icon?: Component
  onClick: (rows: TData[], ids: string[]) => void | Promise<void>
  variant?: 'default' | 'destructive' | 'ghost' | 'outline'
  confirmMessage?: string
  show?: (rows: TData[]) => boolean
}

export interface DataTableSearchQuery {
  value: string
  columnIds: string[]
}

export interface DataTableQuery {
  /** 1-based page number for API/server query params. */
  page: number
  pageSize: number
  search?: DataTableSearchQuery
  sort?: Array<{
    id: string
    desc: boolean
  }>
  filters?: DataTableFilterQuery[]
  metadata?: DataTableQueryMetadata
}

export interface DataTableFilterQuery {
  id: string
  value: DataTableFilterValue
  operator: DataTableFilterOperator
}

export interface DataTableQueryMetadata {
  globalSearch?: DataTableSearchQuery
  columnSearch?: DataTableFilterQuery[]
  facetedFilters?: DataTableFilterQuery[]
  dateFilters?: DataTableFilterQuery[]
}

export type ColumnHeaderMode =
  | { type: 'sort' }
  | { type: 'filter'; options: DataTableFilterOption[] }
  | { type: 'none' }

declare module '@tanstack/vue-table' {
  interface ColumnMeta<TData, TValue> {
    title?: string
    options?: DataTableFilterOption[]
  }
}

export function defineDataTableColumns<TData>(
  columns: ColumnDef<TData, unknown>[],
): ColumnDef<TData, unknown>[] {
  return columns
}
