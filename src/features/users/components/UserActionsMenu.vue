<script setup lang="ts">
import { Eye, LockKeyhole, MoreHorizontal, Pencil, RotateCcw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '../types'

defineProps<{ user: User; canUpdate: boolean; canDelete: boolean }>()
defineEmits<{ view: []; edit: []; disable: []; activate: [] }>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md">
        <span class="sr-only">Mở menu thao tác</span><MoreHorizontal class="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel class="truncate text-xs text-muted-foreground">
        {{ user.fullName || user.email }}
      </DropdownMenuLabel>
      <DropdownMenuItem class="gap-2" @select="$emit('view')"><Eye class="h-4 w-4" />Xem chi tiết</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem v-if="canUpdate" disabled class="gap-2" @select="$emit('edit')"><Pencil class="h-4 w-4" />Chỉnh sửa hồ sơ</DropdownMenuItem>
      <DropdownMenuItem v-if="user.isActive && canDelete" class="gap-2 text-destructive focus:text-destructive" @select="$emit('disable')"><LockKeyhole class="h-4 w-4" />Khóa tài khoản</DropdownMenuItem>
      <DropdownMenuItem v-if="!user.isActive && canUpdate" class="gap-2" @select="$emit('activate')"><RotateCcw class="h-4 w-4" />Kích hoạt tài khoản</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
