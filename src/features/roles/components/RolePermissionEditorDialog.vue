<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RefreshCcw, RotateCcw, Search, ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { Permission } from '@/features/permissions/types'
import {
  filterPermissionGroups,
  getPermissionCapability,
  groupPermissions,
  togglePermissionGroup,
} from '../adapters/role-permission.adapter'
import type {
  RolePermissionCapability,
  RolePermissionFilter,
  RolePermissionPolicyContext,
} from '../adapters/role-permission.adapter'
import RolePermissionGroup from './RolePermissionGroup.vue'

const props = defineProps<{
  open: boolean
  roleName: string
  roleCode: string
  catalog: readonly Permission[]
  selectedIds: ReadonlySet<string>
  policyContext: RolePermissionPolicyContext
  loading: boolean
  error: boolean
}>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  apply: [selectedIds: Set<string>]
  retry: []
}>()

const draftSelectedIds = ref<Set<string>>(new Set())
const search = ref('')
const filter = ref<RolePermissionFilter>('all')
const filterOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'selected', label: 'Đã chọn' },
  { value: 'unselected', label: 'Chưa chọn' },
] as const

watch(
  () => props.open,
  (open) => {
    if (!open) return
    draftSelectedIds.value = new Set(props.selectedIds)
    search.value = ''
    filter.value = 'all'
  },
  { immediate: true },
)

const groups = computed(() => groupPermissions(props.catalog))
const capabilities = computed<ReadonlyMap<string, RolePermissionCapability>>(() => {
  const values = new Map<string, RolePermissionCapability>()
  for (const permission of props.catalog) {
    values.set(
      permission.id,
      getPermissionCapability(
        permission,
        draftSelectedIds.value.has(permission.id),
        props.policyContext,
      ),
    )
  }
  return values
})
const visibleGroups = computed(() => filterPermissionGroups(
  groups.value,
  draftSelectedIds.value,
  search.value,
  filter.value,
))

function togglePermission(permissionId: string): void {
  const capability = capabilities.value.get(permissionId)
  const selected = draftSelectedIds.value.has(permissionId)
  if ((!selected && !capability?.canAdd) || (selected && !capability?.canRemove)) return
  const next = new Set(draftSelectedIds.value)
  if (selected) next.delete(permissionId)
  else next.add(permissionId)
  draftSelectedIds.value = next
}

function toggleGroup(resource: string): void {
  const group = groups.value.find((item) => item.resource === resource)
  if (!group) return
  draftSelectedIds.value = togglePermissionGroup(
    group,
    draftSelectedIds.value,
    capabilities.value,
  )
}

function apply(): void {
  if (props.loading || props.error || props.policyContext.isSystemRole) return
  emit('apply', new Set(draftSelectedIds.value))
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="z-[70] grid max-h-[90dvh] w-[calc(100vw-1rem)] max-w-5xl grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
      <DialogHeader class="border-b px-4 py-4 sm:px-6">
        <DialogTitle class="flex items-center gap-2"><ShieldCheck class="h-5 w-5" />Chọn quyền hạn</DialogTitle>
        <DialogDescription class="space-y-1">
          <span class="block break-words">{{ roleName || 'Vai trò mới' }} · <span class="font-mono">{{ roleCode || 'Chưa có mã' }}</span></span>
          <span class="block">Đã chọn {{ draftSelectedIds.size }} quyền. Thay đổi chỉ được lưu khi submit form vai trò.</span>
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3 border-b px-4 py-3 sm:px-6">
        <div class="relative">
          <Label for="role-permission-search" class="sr-only">Tìm quyền hạn</Label>
          <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="role-permission-search"
            v-model="search"
            class="pl-9"
            placeholder="Tìm theo nhãn, mã, tài nguyên hoặc mô tả..."
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            size="sm"
            :variant="filter === option.value ? 'default' : 'outline'"
            @click="filter = option.value"
          >{{ option.label }}</Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            class="sm:ml-auto"
            @click="draftSelectedIds = new Set(selectedIds)"
          ><RotateCcw class="mr-2 h-4 w-4" />Đặt lại bản nháp</Button>
        </div>
      </div>

      <div class="min-h-0 overflow-hidden">
        <ScrollArea class="h-full">
          <div v-if="loading" class="grid gap-4 p-4 md:grid-cols-2 sm:p-6">
            <Skeleton v-for="index in 6" :key="index" class="h-52 w-full" />
          </div>
          <div v-else-if="error" class="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center sm:m-6">
            <p class="font-medium">Không thể tải đầy đủ dữ liệu quyền hạn.</p>
            <p class="mt-1 text-sm text-muted-foreground">Không thể áp dụng quyền khi catalog hoặc quyền hiện tại chưa tải xong.</p>
            <Button type="button" variant="outline" class="mt-4" @click="emit('retry')"><RefreshCcw class="mr-2 h-4 w-4" />Thử lại</Button>
          </div>
          <div v-else-if="!catalog.length" class="p-8 text-center text-sm text-muted-foreground">Catalog chưa có quyền hạn nào.</div>
          <div v-else-if="!visibleGroups.length" class="p-8 text-center text-sm text-muted-foreground">Không tìm thấy quyền phù hợp.</div>
          <div v-else class="columns-1 gap-4 p-4 md:columns-2 sm:p-6">
            <RolePermissionGroup
              v-for="group in visibleGroups"
              :key="group.resource"
              :group="group"
              :selected-ids="draftSelectedIds"
              :capabilities="capabilities"
              @toggle-group="toggleGroup(group.resource)"
              @toggle-permission="togglePermission"
            />
          </div>
        </ScrollArea>
      </div>

      <DialogFooter class="flex-col-reverse border-t bg-background px-4 py-4 sm:flex-row sm:px-6">
        <Button type="button" variant="outline" class="w-full sm:w-auto" @click="emit('update:open', false)">Hủy</Button>
        <Button
          type="button"
          class="w-full sm:w-auto"
          :disabled="loading || error || policyContext.isSystemRole"
          @click="apply"
        >{{ policyContext.isSystemRole ? 'Chỉ đọc' : 'Áp dụng quyền' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
