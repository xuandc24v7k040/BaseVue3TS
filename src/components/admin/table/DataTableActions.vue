<script setup lang="ts">
import { MoreHorizontal } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataTableAction } from './interface'

interface Props {
  actions: DataTableAction[]
  label?: string
}

defineProps<Props>()

async function handleActionClick(action: DataTableAction) {
  try {
    await action.onClick()
  } catch (error) {
    console.error('[DataTable Actions] Action execution failed:', error)
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md">
        <span class="sr-only">Mở menu thao tác</span>
        <MoreHorizontal class="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuLabel v-if="label" class="text-xs font-medium text-muted-foreground">
        {{ label }}
      </DropdownMenuLabel>

      <template v-for="(action, index) in actions" :key="action.key || `${action.label}-${index}`">
        <DropdownMenuSeparator v-if="action.separator" />
        <DropdownMenuItem
          :disabled="action.disabled"
          :class="[
            'cursor-pointer gap-2',
            action.variant === 'destructive'
              ? 'text-destructive focus:bg-destructive/10 focus:text-destructive'
              : '',
          ]"
          @select="handleActionClick(action)"
        >
          <component v-if="action.icon" :is="action.icon" class="h-4 w-4 text-muted-foreground" />
          <span>{{ action.label }}</span>
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
