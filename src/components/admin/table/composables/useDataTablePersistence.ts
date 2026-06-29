import type { SortingState, VisibilityState } from '@tanstack/vue-table'
import type { InjectionKey, Ref } from 'vue'
import { computed, getCurrentInstance, onUnmounted, watch } from 'vue'
import type { DataTableConfig, DataTablePersistenceConfig } from '../interface'
import { isRecord, isStorageAvailable } from '../utils'

export const DATA_TABLE_STORAGE_PREFIX_KEY = Symbol(
  'DataTableStoragePrefix',
) as InjectionKey<string>

export interface DataTablePersistedState {
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
  storagePrefix?: string
}

const activePersistenceKeysRegistry = import.meta.env.DEV ? new Map<string, string>() : null

function resolvePersistenceConfig<TData>(
  config: DataTableConfig<TData>,
  injectedPrefix?: string,
): ResolvedPersistenceConfig | null {
  if (!config.persistence) return null

  const persistence =
    typeof config.persistence === 'object'
      ? config.persistence
      : ({} satisfies DataTablePersistenceConfig)
  const rawKey = persistence.key ?? config.storageKey ?? config.tableId

  if (!rawKey) return null

  const prefix = persistence.storagePrefix ?? injectedPrefix ?? 'dt'

  return {
    key: rawKey.startsWith(prefix) ? rawKey : `${prefix}:${rawKey}`,
    version: persistence.version ?? 1,
    columns: persistence.columns ?? true,
    pageSize: persistence.pageSize ?? true,
    sorting: persistence.sorting ?? false,
  }
}

function isVisibilityState(value: unknown): value is VisibilityState {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'boolean')
}

function isSortingState(value: unknown): value is SortingState {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => isRecord(item) && typeof item.id === 'string' && typeof item.desc === 'boolean',
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
  injectedPrefix?: string,
): DataTablePersistedState {
  const persistence = resolvePersistenceConfig(config, injectedPrefix)
  if (!persistence) return {}

  const state = readPersistedState(persistence.key)
  if (!state) return {}
  if (state.version !== persistence.version) return {}

  return {
    columnVisibility:
      persistence.columns && isVisibilityState(state.columnVisibility)
        ? state.columnVisibility
        : undefined,
    pageSize: persistence.pageSize && isValidPageSize(state.pageSize) ? state.pageSize : undefined,
    sorting: persistence.sorting && isSortingState(state.sorting) ? state.sorting : undefined,
  }
}

export function clearDataTablePersistedState<TData>(
  config: DataTableConfig<TData>,
  injectedPrefix?: string,
): void {
  const persistence = resolvePersistenceConfig(config, injectedPrefix)
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
  storagePrefix,
}: UseDataTablePersistenceProps<TData>): void {
  const persistence = computed(() => resolvePersistenceConfig(config.value, storagePrefix))
  let lastWrittenState = ''

  if (import.meta.env.DEV) {
    const conf = config.value
    if (conf.persistence) {
      const persistenceObj = typeof conf.persistence === 'object' ? conf.persistence : {}
      const rawKey = persistenceObj.key ?? conf.storageKey ?? conf.tableId
      if (!rawKey) {
        console.warn(
          '[DataTable] persistence requires tableId, storageKey, or persistence.key. Persistence disabled.',
        )
      }
    }

    const instance = getCurrentInstance()
    const initialPersistence = persistence.value
    if (instance && initialPersistence && activePersistenceKeysRegistry) {
      const instanceId = String(instance.uid)
      const existing = activePersistenceKeysRegistry.get(initialPersistence.key)
      if (existing && existing !== instanceId) {
        console.warn(
          `[DataTable] Duplicate persistence key "${initialPersistence.key}" detected. ` +
            'Multiple mounted DataTable instances will overwrite the same localStorage table state. ' +
            'Use a distinct tableId, storageKey, or persistence.key.',
        )
      }
      activePersistenceKeysRegistry.set(initialPersistence.key, instanceId)

      onUnmounted(() => {
        if (activePersistenceKeysRegistry.get(initialPersistence.key) === instanceId) {
          activePersistenceKeysRegistry.delete(initialPersistence.key)
        }
      })
    }
  }

  watch(
    () => {
      const nextPersistence = persistence.value
      if (!nextPersistence) return null
      return {
        key: nextPersistence.key,
        version: nextPersistence.version,
        columnVisibility: nextPersistence.columns ? columnVisibility.value : undefined,
        pageSize: nextPersistence.pageSize ? pageSize.value : undefined,
        sorting: nextPersistence.sorting ? sorting.value : undefined,
      }
    },
    (nextState) => {
      if (!nextState) return

      const serializedState = JSON.stringify(nextState)
      if (serializedState === lastWrittenState) return

      lastWrittenState = serializedState
      writePersistedState(nextState.key, nextState)
    },
    { deep: true },
  )
}
