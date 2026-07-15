<script setup lang="ts">
import { computed } from 'vue'
import type { AdminPermission } from '@/authorization/admin-permissions'
import { useAdminPermissions } from '@/composables/use-admin-permissions'

const props = withDefaults(defineProps<{
  allOf?: readonly AdminPermission[]
  anyOf?: readonly AdminPermission[]
}>(), {
  allOf: () => [],
  anyOf: () => [],
})

const { canAll, canAny } = useAdminPermissions()
const isAllowed = computed(() => {
  const hasAllRequirement = props.allOf.length > 0
  const hasAnyRequirement = props.anyOf.length > 0
  if (!hasAllRequirement && !hasAnyRequirement) return false
  return (!hasAllRequirement || canAll(props.allOf))
    && (!hasAnyRequirement || canAny(props.anyOf))
})
</script>

<template>
  <slot v-if="isAllowed" />
</template>
