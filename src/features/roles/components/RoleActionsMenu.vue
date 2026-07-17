<script setup lang="ts">
import { Eye, MoreHorizontal, Pencil, Power } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Role } from '../types'

const SYSTEM_ROLE_MESSAGE = 'Vai trò hệ thống được bảo vệ và không thể chỉnh sửa.'

const props = defineProps<{
  role: Role
  canUpdate: boolean
  canDelete: boolean
}>()

defineEmits<{
  view: []
  edit: []
  deactivate: []
}>()

function editDisabledMessage(): string | undefined {
  if (props.role.isSystem) return SYSTEM_ROLE_MESSAGE
  if (!props.canUpdate) return 'Bạn không có quyền chỉnh sửa vai trò.'
  return undefined
}

function deactivateDisabledMessage(): string | undefined {
  if (props.role.isSystem) return SYSTEM_ROLE_MESSAGE
  if (!props.canDelete) return 'Bạn không có quyền ngừng hoạt động vai trò.'
  return undefined
}
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md">
          <span class="sr-only">Mở menu thao tác</span>
          <MoreHorizontal class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuLabel class="truncate text-xs font-medium text-muted-foreground">
          {{ role.name }}
        </DropdownMenuLabel>
        <DropdownMenuItem class="gap-2" @select="$emit('view')">
          <Eye class="h-4 w-4 text-muted-foreground" />
          <span>Xem chi tiết</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <Tooltip>
          <TooltipTrigger as-child>
            <span class="block" :tabindex="editDisabledMessage() ? 0 : -1">
              <DropdownMenuItem
                class="gap-2"
                :disabled="Boolean(editDisabledMessage())"
                @select="$emit('edit')"
              >
                <Pencil class="h-4 w-4 text-muted-foreground" />
                <span>Chỉnh sửa</span>
              </DropdownMenuItem>
            </span>
          </TooltipTrigger>
          <TooltipContent v-if="editDisabledMessage()" side="left" class="max-w-64">
            {{ editDisabledMessage() }}
          </TooltipContent>
        </Tooltip>
        <Tooltip v-if="role.isSystem || role.isActive">
          <TooltipTrigger as-child>
            <span class="block" :tabindex="deactivateDisabledMessage() ? 0 : -1">
              <DropdownMenuItem
                class="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                :disabled="Boolean(deactivateDisabledMessage())"
                @select="$emit('deactivate')"
              >
                <Power class="h-4 w-4" />
                <span>Ngừng hoạt động</span>
              </DropdownMenuItem>
            </span>
          </TooltipTrigger>
          <TooltipContent v-if="deactivateDisabledMessage()" side="left" class="max-w-64">
            {{ deactivateDisabledMessage() }}
          </TooltipContent>
        </Tooltip>
      </DropdownMenuContent>
    </DropdownMenu>
  </TooltipProvider>
</template>
