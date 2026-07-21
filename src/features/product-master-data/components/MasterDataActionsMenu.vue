<script setup lang="ts">
import { Eye, MoreHorizontal, Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{
  canUpdate: boolean
  canDelete: boolean
  deleteDisabled?: boolean
}>()
const emit = defineEmits<{ view: []; edit: []; delete: [] }>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child
      ><Button variant="ghost" size="icon" aria-label="Mở menu thao tác"
        ><MoreHorizontal class="h-4 w-4" /></Button
    ></DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="z-60">
      <DropdownMenuItem @select="emit('view')"
        ><Eye class="mr-2 h-4 w-4" />Xem chi tiết</DropdownMenuItem
      >
      <DropdownMenuItem v-if="canUpdate" @select="emit('edit')"
        ><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</DropdownMenuItem
      >
      <template v-if="canDelete"
        ><DropdownMenuSeparator /><DropdownMenuItem
          class="text-destructive focus:text-destructive"
          :disabled="deleteDisabled"
          @select="emit('delete')"
          ><Trash2 class="mr-2 h-4 w-4" />Xóa</DropdownMenuItem
        ></template
      >
    </DropdownMenuContent>
  </DropdownMenu>
</template>
