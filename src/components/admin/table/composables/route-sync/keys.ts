import type { LocationQueryRaw } from 'vue-router'
import type { ResolvedRouteSyncConfig, RouteSyncDefaults } from './types'

export function routeQueryKey(config: ResolvedRouteSyncConfig, key: string): string {
  return `${config.keyPrefix}.${key}`
}

export function filterValueKey(config: ResolvedRouteSyncConfig, columnId: string): string {
  return `${config.keyPrefix}.filter.${columnId}`
}

export function getFilterColumnIdFromKey(
  config: ResolvedRouteSyncConfig,
  key: string,
): string | null {
  const prefix = `${config.keyPrefix}.filter.`
  return key.startsWith(prefix) ? key.slice(prefix.length) : null
}

export function compactFilterParamBase(config: ResolvedRouteSyncConfig, columnId: string): string {
  return config.filterParamMap[columnId] ?? columnId
}

export function getCompactFilterIds(
  config: ResolvedRouteSyncConfig,
  defaults?: Pick<RouteSyncDefaults, 'filterIds'>,
): string[] {
  return Array.from(
    new Set([...(defaults?.filterIds ?? []), ...Object.keys(config.filterParamMap)]),
  )
}

export function getCompactManagedKeys(
  config: ResolvedRouteSyncConfig,
  defaults?: Pick<RouteSyncDefaults, 'filterIds'>,
): string[] {
  const keys = new Set<string>()

  if (config.search) keys.add(config.paramNames.search)
  if (config.page) keys.add(config.paramNames.page)
  if (config.pageSize) keys.add(config.paramNames.pageSize)
  if (config.sorting) keys.add(config.paramNames.sort)

  if (config.filters) {
    getCompactFilterIds(config, defaults).forEach((filterId) => {
      const base = compactFilterParamBase(config, filterId)
      keys.add(base)
      keys.add(`${base}From`)
      keys.add(`${base}To`)
    })
  }

  return Array.from(keys)
}

export function isTableRouteQueryKey(
  config: ResolvedRouteSyncConfig,
  key: string,
  defaults?: Pick<RouteSyncDefaults, 'filterIds'>,
): boolean {
  const isNamespacedKey =
    key === routeQueryKey(config, 'page') ||
    key === routeQueryKey(config, 'pageSize') ||
    key === routeQueryKey(config, 'search') ||
    key === routeQueryKey(config, 'sort') ||
    key === routeQueryKey(config, 'sortBy') ||
    key === routeQueryKey(config, 'sortOrder') ||
    key === routeQueryKey(config, 'filters') ||
    key.startsWith(`${config.keyPrefix}.filter.`) ||
    key.startsWith(`${config.keyPrefix}.filterOperator.`)

  if (config.mode === 'compact') {
    return isNamespacedKey || getCompactManagedKeys(config, defaults).includes(key)
  }

  return isNamespacedKey
}

export function clearTableRouteQueryKeys(
  query: LocationQueryRaw,
  config: ResolvedRouteSyncConfig,
  defaults?: Pick<RouteSyncDefaults, 'filterIds'>,
): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...query }

  Object.keys(nextQuery).forEach((key) => {
    if (isTableRouteQueryKey(config, key, defaults)) {
      nextQuery[key] = undefined
    }
  })

  return nextQuery
}

export function getSyncedRouteQueryKeys(
  currentQuery: LocationQueryRaw,
  nextQuery: LocationQueryRaw,
  config: ResolvedRouteSyncConfig,
  defaults?: Pick<RouteSyncDefaults, 'filterIds'>,
): string[] {
  return Array.from(
    new Set(
      [...Object.keys(currentQuery), ...Object.keys(nextQuery)].filter((key) =>
        isTableRouteQueryKey(config, key, defaults),
      ),
    ),
  )
}
