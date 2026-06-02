import type { SortingState, VisibilityState } from '@tanstack/vue-table'
import type { Ref } from 'vue'
import { computed, watch } from 'vue'
import type { DataTableConfig, DataTablePersistenceConfig } from '../interface'

interface DataTablePersistedState {
  version?: number
  columnVisibility?: VisibilityState
  pageSize?: number
  sorting?: SortingState
}

interface ResolvedPersistenceConfig {
  key: string
  version: number
  columns: boolean
  pageSize: boolean
  sorting: boolean
}

interface UseDataTablePersistenceProps<TData> {
  config: Ref<DataTableConfig<TData>>
  columnVisibility: Ref<VisibilityState>
  pageSize: Ref<number>
  sorting: Ref<SortingState>
}

const STORAGE_PREFIX = 'bookora:data-table'

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getDefaultStorageKey(): string | null {
  if (typeof window === 'undefined') return null
  return `route:${window.location.pathname}`
}

function resolvePersistenceConfig<TData>(
  config: DataTableConfig<TData>,
): ResolvedPersistenceConfig | null {
  if (config.persistence === false) return null

  const persistence =
    typeof config.persistence === 'object'
      ? config.persistence
      : ({} satisfies DataTablePersistenceConfig)
  const rawKey = persistence.key ?? config.storageKey ?? config.tableId ?? getDefaultStorageKey()

  if (!rawKey) return null

  return {
    key: rawKey.startsWith(STORAGE_PREFIX) ? rawKey : `${STORAGE_PREFIX}:${rawKey}`,
    version: persistence.version ?? 1,
    columns: persistence.columns ?? true,
    pageSize: persistence.pageSize ?? true,
    sorting: persistence.sorting ?? false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isVisibilityState(value: unknown): value is VisibilityState {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'boolean')
}

function isSortingState(value: unknown): value is SortingState {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) && typeof item.id === 'string' && typeof item.desc === 'boolean',
    )
  )
}

function isValidPageSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function readPersistedState(key: string): DataTablePersistedState | null {
  if (!isStorageAvailable()) return null

  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? (JSON.parse(rawValue) as DataTablePersistedState) : null
  } catch {
    return null
  }
}

function writePersistedState(key: string, state: DataTablePersistedState): void {
  if (!isStorageAvailable()) return

  try {
    window.localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // Persistence is a convenience feature; storage failures should not break table usage.
  }
}

export function getDataTablePersistedState<TData>(
  config: DataTableConfig<TData>,
): DataTablePersistedState {
  const persistence = resolvePersistenceConfig(config)
  if (!persistence) return {}

  const state = readPersistedState(persistence.key)
  if (!state) return {}
  if (state.version !== persistence.version) return {}

  return {
    columnVisibility:
      persistence.columns && isVisibilityState(state.columnVisibility)
        ? state.columnVisibility
        : undefined,
    pageSize:
      persistence.pageSize && isValidPageSize(state.pageSize) ? state.pageSize : undefined,
    sorting: persistence.sorting && isSortingState(state.sorting) ? state.sorting : undefined,
  }
}

export function clearDataTablePersistedState<TData>(config: DataTableConfig<TData>): void {
  const persistence = resolvePersistenceConfig(config)
  if (!persistence || !isStorageAvailable()) return

  try {
    window.localStorage.removeItem(persistence.key)
  } catch {
    // Persistence is optional; storage failures should not break table usage.
  }
}

export function useDataTablePersistence<TData>({
  config,
  columnVisibility,
  pageSize,
  sorting,
}: UseDataTablePersistenceProps<TData>): void {
  const persistence = computed(() => resolvePersistenceConfig(config.value))
  let lastWrittenState = ''

  watch(
    [persistence, columnVisibility, pageSize, sorting],
    ([nextPersistence]) => {
      if (!nextPersistence) return

      const nextState: DataTablePersistedState = {
        version: nextPersistence.version,
        columnVisibility: nextPersistence.columns ? columnVisibility.value : undefined,
        pageSize: nextPersistence.pageSize ? pageSize.value : undefined,
        sorting: nextPersistence.sorting ? sorting.value : undefined,
      }
      const serializedState = JSON.stringify(nextState)
      if (serializedState === lastWrittenState) return

      lastWrittenState = serializedState
      writePersistedState(nextPersistence.key, nextState)
    },
    { deep: true },
  )
}
