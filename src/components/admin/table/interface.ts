import type { Component } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'

export type DataTableFilterVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'muted'

export interface DataTableFilterOption {
  label: string
  value: string
  icon?: Component
  variant?: DataTableFilterVariant
  count?: number
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
  mode?: 'single' | 'range' | 'single-datetime' | 'range-datetime'
  enablePresets?: boolean
  /**
   * Prevents selection of dates in the future.
   * Note: In datetime modes, this constraint only restricts the date part,
   * not the hour/minute portion of the current day.
   */
  disableFutureDates?: boolean
  /**
   * Prevents selection of dates in the past.
   * Note: In datetime modes, this constraint only restricts the date part,
   * not the hour/minute portion of the current day.
   */
  disablePastDates?: boolean
  minValue?: string
  maxValue?: string
  locale?: string
  dateStyle?: 'full' | 'long' | 'medium' | 'short'
  /**
   * Date-only display pattern for formatting date labels.
   * Supported tokens: YYYY, YY, MM, DD (case-insensitive).
   * Does NOT support time tokens (HH, mm for minutes, ss).
   * Example: 'DD/MM/YYYY' → '09/06/2026'
   */
  dateFormatPattern?: string
  presetEndTime?: 'endOfDay' | 'now'
}

/**
 * Date filter value.
 *
 * Date-only modes use `YYYY-MM-DD`.
 * Datetime modes use timezone-free local ISO-like strings such as `YYYY-MM-DDTHH:mm`.
 * DataTable does not append timezone offsets, normalize UTC bounds, or choose
 * inclusive/exclusive range semantics. Parent/API adapters must convert these UI
 * strings to the backend timezone contract before sending requests.
 */
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
export type PrimitiveFilterValue = string | number | boolean
export type DataTableFilterValue = PrimitiveFilterValue | PrimitiveFilterValue[] | DateRangeValue
export type DataTableStickyColumnSide = 'left' | 'right'
export type DataTableColumnStickyState = Record<
  string,
  DataTableStickyColumnSide | null | undefined
>

/**
 * Server-side admin table configuration.
 *
 * DataTable is designed for server-owned pagination, sorting, and filtering:
 * parent pages receive update:query, fetch rows, then pass the current page back
 * through data/pageCount/rowCount. Keep page sizes small to medium (10-100).
 * For hundreds or thousands of rendered client rows, add virtualization instead
 * of raising maxPageSize indefinitely.
 *
 * **Reactivity contract:** Most config properties are "setup-time only" — they are
 * read once during component initialization and are NOT reactive after mount.
 * This includes: `tableId`, `rowIdKey`, `getRowId`, `getSubRows`, `initialSorting`,
 * `initialFilters`, `initialSearch`, `persistence`, `routeSync`.
 *
 * Properties that ARE reactive after mount: `enableRowSelection`, `enableMultiRowSelection`,
 * `enableExpanding`, `expandOnRowClick`, `pageSize`, `maxPageSize`, `enableColumnVisibility`,
 * `enableColumnSticky`.
 *
 * Persistence and route sync are opt-in. Provide tableId, storageKey, or the
 * explicit feature key to avoid collisions when multiple tables share a route.
 */
export interface DataTableConfig<TData = unknown> {
  // Identity / row id
  tableId?: string
  storageKey?: string
  rowIdKey?: Extract<keyof TData, string>
  getRowId?: (row: TData, index: number, parent?: { original: TData; id?: string }) => string
  /**
   * Controls whether a row is expandable.
   *
   * Default:
   * - detail mode: every row can expand
   * - tree mode: row can expand when it has subRows
   */
  getRowCanExpand?: (row: TData) => boolean
  getRowAriaLabel?: (row: TData) => string
  /**
   * Enables row-level click/keyboard shortcut behavior.
   *
   * When true, clicking an actionable row emits `@row-click`.
   * If `expandOnRowClick` is also true and the row can expand, expansion takes priority
   * and `@row-click` is not emitted.
   */
  enableRowClick?: boolean

  // Pagination
  pageSize?: number
  maxPageSize?: number

  // Initial state
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

  // Query/search debounce
  /** @deprecated Use queryDebounce/searchDebounce. */
  filterDebounce?: number
  queryDebounce?: number
  searchDebounce?: number
  emitInitialQuery?: boolean
  clearSelectionOnQueryChange?: boolean
  clearSelectionOnPageChange?: boolean

  // Selection
  /**
   * Whether to enable row selection checkboxes.
   *
   * Selection mode can be uncontrolled or controlled:
   * - **Uncontrolled Mode**: Default when `selectedRowIds` is omitted or passed as `undefined`.
   *   The table owns selection state and emits `@update:selectedRowIds` for parent side effects.
   * - **Controlled Mode**: Enabled when `selectedRowIds` is passed as an array (including `[]`).
   *   Parent owns the source of truth. DataTable only emits `@update:selectedRowIds`.
   *   Visual selection updates only after the parent passes the next `selectedRowIds` value back.
   *
   * WARNING: To clear selection in controlled mode, pass an empty array `[]`. Do not pass `undefined`,
   * as passing `undefined` switches the table back to uncontrolled mode.
   */
  enableRowSelection?: boolean
  enableMultiRowSelection?: boolean
  stickySelectionColumn?: boolean
  stickyExpansionColumn?: boolean
  stickyActionColumn?: boolean

  // Column visibility
  enableColumnVisibility?: boolean
  enableColumnSticky?: boolean

  // Expansion
  enableExpanding?: boolean
  /**
   * Whether clicking anywhere on a row toggles its expansion state.
   *
   * @remarks
   * When enabled (and the row can expand), clicking a row toggles its expansion state
   * and does NOT emit the `@row-click` event. This prevents unintended side-effects
   * (such as navigating or opening a detail drawer) when the user only wants to expand the row.
   */
  expandOnRowClick?: boolean
  autoExpandAll?: boolean
  autoExpandOnFilterIds?: string[]
  getSubRows?: (row: TData) => TData[] | undefined
  /**
   * Declares the expansion mode for this table.
   *
   * - `'tree'`: The table uses hierarchical sub-rows via `getSubRows`. The
   *    `expanded-row` slot should NOT be used.
   * - `'detail'`: The table uses an `expanded-row` slot to render a detail
   *    panel below each row. `getSubRows` should NOT be provided.
   *
   * When unset, the component infers the mode from the presence of
   * `getSubRows` and the `expanded-row` slot, and warns in DEV if both
   * are present simultaneously.
   */
  expansionMode?: 'tree' | 'detail'

  // Persistence. Disabled by default; requires tableId, storageKey, or persistence.key.
  persistence?: boolean | DataTablePersistenceConfig

  // Route sync. Disabled by default; requires tableId or routeSync.keyPrefix.
  routeSync?: boolean | DataTableRouteSyncConfig
}

export interface DataTablePersistenceConfig {
  storagePrefix?: string
  key?: string
  version?: number
  columns?: boolean
  pageSize?: boolean
  sorting?: boolean
}

export type DataTableRouteSyncMode = 'namespaced' | 'compact'

export interface DataTableRouteSyncConfig {
  enabled?: boolean
  /**
   * Sync mode: 'namespaced' (prefixed with keyPrefix) or 'compact' (clean URLs).
   * WARNING: In 'compact' mode, keys are shared directly on the URL. If multiple tables
   * on the same route use 'compact' mode, key collisions will occur. Use 'namespaced'
   * mode for pages with multiple tables or dashboard tabs.
   */
  mode?: DataTableRouteSyncMode
  keyPrefix?: string
  page?: boolean
  pageSize?: boolean
  search?: boolean
  /**
   * Whether to sync sorting state to/from the route.
   *
   * @remarks
   * Supports legacy JSON-serialized sorting format (?sort=[...]) as a fallback.
   * Note that this legacy JSON format fallback is deprecated and will be removed in a future release.
   */
  sorting?: boolean
  /**
   * Whether to sync column filters state to/from the route.
   *
   * @remarks
   * Supports legacy JSON-serialized filters format (?filters=[...]) as a fallback.
   * Note that this legacy JSON format fallback is deprecated and will be removed in a future release.
   */
  filters?: boolean
  /**
   * Defaults to true to avoid adding one browser-history entry per search/filter
   * keystroke in admin tables. Set false only when every table state change should
   * be navigable with Back/Forward.
   */
  replace?: boolean
  paramNames?: {
    search?: string
    page?: string
    pageSize?: string
    sort?: string
  }
  filterParamMap?: Record<string, string>
  /**
   * Format for array/multiple filter query values on the URL in compact mode:
   * - `'comma'` (default): joins array values with a comma, e.g., `?tags=a,b`.
   *   WARNING: If filter values might contain literal commas (e.g. `['Tag A, B', 'Tag C']`),
   *   comma format will cause incorrect parsing on reload (splitting the single element into multiple).
   *   Only use `'comma'` for simple enums or IDs without commas.
   * - `'repeated'`: repeats the parameter for each value, e.g., `?tags=a&tags=b`.
   *   Safe for values containing literal commas.
   */
  arrayFormat?: 'comma' | 'repeated'
  /** Explicit list of filter column IDs to track in route query parameters. */
  filterIds?: string[]
  /** Explicit list of filter column IDs that should always be parsed/serialized as arrays. */
  arrayFilterIds?: string[]
  /** Explicit list of filter column IDs that should always be parsed strictly as string values. */
  stringFilterIds?: string[]
  /** Explicit list of filter column IDs that should always be parsed strictly as numeric values. */
  numericFilterIds?: string[]
  /** Explicit list of filter column IDs that should always be parsed strictly as boolean values. */
  booleanFilterIds?: string[]
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
  onClick: () => void | Promise<void>
  variant?: 'default' | 'destructive'
  separator?: boolean
  disabled?: boolean
}

/**
 * Interface representing a bulk action configuration.
 * Bulk actions are typically rendered inside the `#bulk-actions` slot in the DataTableToolbar.
 */
export interface DataTableBulkAction<TData = Record<string, unknown>> {
  label: string
  icon?: Component
  /**
   * rows only contains selected rows that are present on the current server page.
   * Use ids for cross-page bulk operations.
   */
  onClick: (rows: TData[], ids: string[]) => void | Promise<void>
  variant?: 'default' | 'destructive' | 'ghost' | 'outline'
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
    sticky?: DataTableStickyColumnSide
  }
  interface TableMeta<TData> {
    resetFilters?: () => void
    resetTableControls?: () => void
  }
}

export function defineDataTableColumns<TData>(
  columns: ColumnDef<TData, unknown>[],
): ColumnDef<TData, unknown>[] {
  return columns
}
