<script setup lang="ts">
import { computed } from 'vue'
import { LockKeyhole, TriangleAlert } from '@lucide/vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPermissionLabel } from '@/features/permissions/utils/permission-labels'
import {
  getGroupTriState,
} from '../adapters/role-permission.adapter'
import type {
  RolePermissionCapability,
  RolePermissionGroup,
} from '../adapters/role-permission.adapter'

const props = defineProps<{
  group: RolePermissionGroup
  selectedIds: ReadonlySet<string>
  capabilities: ReadonlyMap<string, RolePermissionCapability>
}>()
const emit = defineEmits<{
  toggleGroup: []
  togglePermission: [permissionId: string]
}>()

const parentState = computed(() =>
  getGroupTriState(props.group, props.selectedIds, props.capabilities),
)
const mutableCount = computed(() => props.group.permissions.filter((permission) => {
  const capability = props.capabilities.get(permission.id)
  return capability?.canAdd || capability?.canRemove
}).length)
</script>

<template>
  <section class="mb-4 inline-block w-full break-inside-avoid rounded-lg border bg-card p-4 shadow-sm">
    <div class="flex items-start gap-3 border-b pb-3">
      <Checkbox
        :id="`permission-group-${group.resource}`"
        :model-value="parentState === 'indeterminate' ? 'indeterminate' : parentState === 'checked'"
        :aria-checked="parentState === 'indeterminate' ? 'mixed' : parentState === 'checked'"
        :disabled="mutableCount === 0"
        @update:model-value="emit('toggleGroup')"
      />
      <label
        :for="`permission-group-${group.resource}`"
        class="min-w-0 flex-1 cursor-pointer font-medium leading-none"
      >
        {{ group.label }}
        <span class="ml-1 text-xs font-normal text-muted-foreground">{{ mutableCount }} có thể thao tác</span>
      </label>
    </div>

    <TooltipProvider :delay-duration="250">
      <div class="mt-3 space-y-3">
        <div
          v-for="permission in group.permissions"
          :key="permission.id"
          class="flex min-w-0 items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
        >
          <Tooltip>
            <TooltipTrigger as-child>
              <span :tabindex="capabilities.get(permission.id)?.reason ? 0 : -1">
                <Checkbox
                  :id="`role-permission-${permission.id}`"
                  :model-value="selectedIds.has(permission.id)"
                  :disabled="!(capabilities.get(permission.id)?.canAdd || capabilities.get(permission.id)?.canRemove)"
                  @update:model-value="emit('togglePermission', permission.id)"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent
              v-if="capabilities.get(permission.id)?.reason"
              side="top"
              class="z-[100] max-w-72"
            >
              {{ capabilities.get(permission.id)?.reason }}
            </TooltipContent>
          </Tooltip>

          <label :for="`role-permission-${permission.id}`" class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-1.5 text-sm font-medium">
              {{ formatPermissionLabel(permission) }}
              <TriangleAlert
                v-if="capabilities.get(permission.id)?.dangerous"
                class="h-4 w-4 text-destructive"
                aria-label="Quyền nhạy cảm"
              />
              <LockKeyhole
                v-else-if="capabilities.get(permission.id)?.reason"
                class="h-4 w-4 text-muted-foreground"
                aria-label="Quyền bị khóa"
              />
            </span>
            <span class="mt-0.5 block break-all font-mono text-xs text-muted-foreground">{{ permission.code }}</span>
            <span
              v-if="permission.description"
              class="mt-1 line-clamp-2 block text-xs text-muted-foreground"
              :title="permission.description"
            >{{ permission.description }}</span>
            <span
              v-if="capabilities.get(permission.id)?.dangerous"
              class="mt-1 block text-xs font-medium text-destructive"
            >Quyền nhạy cảm</span>
          </label>
        </div>
      </div>
    </TooltipProvider>
  </section>
</template>
