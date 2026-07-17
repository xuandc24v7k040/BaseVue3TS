<script setup lang="ts">
import { Eye, MoreHorizontal, Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Permission } from '../types'
import { isDangerousPermission } from '../utils/dangerous-permissions'

const props = defineProps<{ permission: Permission; canUpdate: boolean; canDelete: boolean }>()
defineEmits<{ view: []; edit: []; delete: [] }>()

function editDisabledMessage(): string | undefined {
  if (isDangerousPermission(props.permission.code)) return 'Quyền nhạy cảm được hệ thống bảo vệ và không thể thay đổi.'
  if (!props.canUpdate) return 'Bạn không có quyền chỉnh sửa quyền này.'
}
function deleteDisabledMessage(): string | undefined {
  if (isDangerousPermission(props.permission.code)) return 'Quyền nhạy cảm được hệ thống bảo vệ và không thể xóa.'
  if (!props.canDelete) return 'Bạn không có quyền xóa quyền này.'
}
</script>

<template>
  <TooltipProvider :delay-duration="200"><DropdownMenu><DropdownMenuTrigger as-child><Button variant="ghost" size="icon" class="h-8 w-8"><span class="sr-only">Mở menu thao tác</span><MoreHorizontal class="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" class="w-64"><DropdownMenuLabel class="truncate font-mono text-xs">{{ permission.code }}</DropdownMenuLabel><DropdownMenuItem class="gap-2" @select="$emit('view')"><Eye class="h-4 w-4" />Xem chi tiết</DropdownMenuItem><DropdownMenuSeparator />
    <Tooltip><TooltipTrigger as-child><span class="block" :tabindex="editDisabledMessage() ? 0 : -1"><DropdownMenuItem class="gap-2" :disabled="Boolean(editDisabledMessage())" @select="$emit('edit')"><Pencil class="h-4 w-4" />Chỉnh sửa</DropdownMenuItem></span></TooltipTrigger><TooltipContent v-if="editDisabledMessage()" side="left" class="max-w-64">{{ editDisabledMessage() }}</TooltipContent></Tooltip>
    <Tooltip><TooltipTrigger as-child><span class="block" :tabindex="deleteDisabledMessage() ? 0 : -1"><DropdownMenuItem class="gap-2 text-destructive" :disabled="Boolean(deleteDisabledMessage())" @select="$emit('delete')"><Trash2 class="h-4 w-4" />Xóa</DropdownMenuItem></span></TooltipTrigger><TooltipContent v-if="deleteDisabledMessage()" side="left" class="max-w-64">{{ deleteDisabledMessage() }}</TooltipContent></Tooltip>
  </DropdownMenuContent></DropdownMenu></TooltipProvider>
</template>
