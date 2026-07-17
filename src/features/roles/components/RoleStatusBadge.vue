<script setup lang="ts">
import { CircleCheck, CircleX } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'

defineProps<{ active: boolean }>()
</script>

<template>
  <Badge :variant="active ? 'default' : 'secondary'" class="gap-1 whitespace-nowrap">
    <CircleCheck v-if="active" class="h-3.5 w-3.5" aria-hidden="true" />
    <CircleX v-else class="h-3.5 w-3.5" aria-hidden="true" />
    {{ active ? 'Đang hoạt động' : 'Ngừng hoạt động' }}
  </Badge>
</template>
