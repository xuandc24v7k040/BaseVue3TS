<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <span
    class="whitespace-nowrap font-medium"
    :class="active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
  >
    {{ active ? 'Đang hoạt động' : 'Đã khóa' }}
  </span>
</template>
