import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import type { Permission } from '@/features/permissions/types'
import { listPermissionCatalog } from '@/features/permissions/api/permission-api'
import { permissionKeys } from '@/features/permissions/api/permission-query-keys'
import {
  computePermissionDiff,
  selectedPermissionIds,
} from '../adapters/role-permission.adapter'
import type {
  RolePermissionMutationKind,
  RolePermissionPolicyContext,
} from '../adapters/role-permission.adapter'
import {
  assignRolePermission,
  listRolePermissions,
  removeRolePermission,
} from '../api/role-permission-api'
import { rolePermissionKeys } from '../api/role-permission-query-keys'
import { roleKeys } from '../api/role-query-keys'

export interface RolePermissionMutationItem {
  permission: Permission
  kind: RolePermissionMutationKind
  success: boolean
  error?: unknown
}

export interface RolePermissionMutationResult {
  items: RolePermissionMutationItem[]
  authoritativeSelectedIds: Set<string>
  total: number
  successCount: number
  failureCount: number
}

interface UseRolePermissionEditorOptions {
  open: MaybeRefOrGetter<boolean>
  roleId: MaybeRefOrGetter<string | null>
}

export function useRolePermissionEditor(options: UseRolePermissionEditorOptions) {
  const queryClient = useQueryClient()
  const selectedIds = ref<Set<string>>(new Set())
  const authoritativeSelectedIds = ref<Set<string>>(new Set())
  const initializedFor = ref<string | null>(null)
  const progressCurrent = ref(0)
  const progressTotal = ref(0)

  const catalogQuery = useQuery({
    queryKey: permissionKeys.catalog(),
    queryFn: ({ signal }) => listPermissionCatalog(signal),
    enabled: computed(() => toValue(options.open)),
    staleTime: 5 * 60 * 1000,
  })

  const assignmentsQuery = useQuery({
    queryKey: computed(() => rolePermissionKeys.list(toValue(options.roleId) ?? 'pending')),
    queryFn: ({ signal }) => listRolePermissions(toValue(options.roleId)!, signal),
    enabled: computed(() => toValue(options.open) && Boolean(toValue(options.roleId))),
  })

  watch(
    [
      () => toValue(options.open),
      () => toValue(options.roleId),
      () => assignmentsQuery.data.value,
    ],
    ([open, roleId, response]) => {
      if (!open || !roleId || !response || initializedFor.value === roleId) return
      const current = selectedPermissionIds(response.data)
      selectedIds.value = new Set(current)
      authoritativeSelectedIds.value = new Set(current)
      initializedFor.value = roleId
    },
    { immediate: true },
  )

  const isReady = computed(() => {
    if (!catalogQuery.data.value || catalogQuery.isError.value) return false
    const roleId = toValue(options.roleId)
    return !roleId || (
      initializedFor.value === roleId
      && !assignmentsQuery.isPending.value
      && !assignmentsQuery.isError.value
    )
  })

  function resetDraft(roleId: string | null): void {
    progressCurrent.value = 0
    progressTotal.value = 0
    if (!roleId) {
      initializedFor.value = 'create'
      selectedIds.value = new Set()
      authoritativeSelectedIds.value = new Set()
      return
    }
    initializedFor.value = null
    selectedIds.value = new Set()
    authoritativeSelectedIds.value = new Set()
    if (assignmentsQuery.data.value && toValue(options.roleId) === roleId) {
      const current = selectedPermissionIds(assignmentsQuery.data.value.data)
      selectedIds.value = new Set(current)
      authoritativeSelectedIds.value = new Set(current)
      initializedFor.value = roleId
    }
  }

  function adoptCreatedRole(roleId: string): void {
    initializedFor.value = roleId
    authoritativeSelectedIds.value = new Set()
  }

  function applyDraft(next: ReadonlySet<string>): void {
    selectedIds.value = new Set(next)
  }

  async function retryQueries(): Promise<void> {
    await catalogQuery.refetch()
    if (toValue(options.roleId)) await assignmentsQuery.refetch()
  }

  async function persistPermissions(
    roleId: string,
    context: RolePermissionPolicyContext,
  ): Promise<RolePermissionMutationResult> {
    const catalog = catalogQuery.data.value
    if (!catalog) throw new Error('Permission catalog chưa tải hoàn tất.')

    const currentResponse = await listRolePermissions(roleId)
    const currentIds = selectedPermissionIds(currentResponse.data)
    authoritativeSelectedIds.value = new Set(currentIds)
    const diff = computePermissionDiff(catalog, currentIds, selectedIds.value, context)
    const operations = [
      ...diff.toAdd.map((permission) => ({ permission, kind: 'add' as const })),
      ...diff.toRemove.map((permission) => ({ permission, kind: 'remove' as const })),
    ]

    progressCurrent.value = 0
    progressTotal.value = operations.length
    const items: RolePermissionMutationItem[] = []

    for (const operation of operations) {
      try {
        if (operation.kind === 'add') {
          await assignRolePermission(roleId, operation.permission.id)
        } else {
          await removeRolePermission(roleId, operation.permission.id)
        }
        items.push({ ...operation, success: true })
      } catch (error) {
        items.push({ ...operation, success: false, error })
      } finally {
        progressCurrent.value += 1
      }
    }

    await queryClient.invalidateQueries({ queryKey: rolePermissionKeys.list(roleId) })
    await queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) })
    for (const item of items) {
      if (item.success) {
        await queryClient.invalidateQueries({
          queryKey: permissionKeys.detail(item.permission.id),
        })
      }
    }

    const authoritative = await listRolePermissions(roleId)
    const reconciled = selectedPermissionIds(authoritative.data)
    authoritativeSelectedIds.value = new Set(reconciled)
    if (toValue(options.roleId) === roleId) await assignmentsQuery.refetch()

    const successCount = items.filter(({ success }) => success).length
    return {
      items,
      authoritativeSelectedIds: reconciled,
      total: items.length,
      successCount,
      failureCount: items.length - successCount,
    }
  }

  return {
    catalog: computed(() => catalogQuery.data.value ?? []),
    selectedIds,
    authoritativeSelectedIds,
    isReady,
    isLoading: computed(() => {
      const roleId = toValue(options.roleId)
      return catalogQuery.isPending.value || (Boolean(roleId) && assignmentsQuery.isPending.value)
    }),
    isError: computed(() => {
      const roleId = toValue(options.roleId)
      return catalogQuery.isError.value || (Boolean(roleId) && assignmentsQuery.isError.value)
    }),
    progressCurrent,
    progressTotal,
    resetDraft,
    adoptCreatedRole,
    applyDraft,
    retryQueries,
    persistPermissions,
  }
}
