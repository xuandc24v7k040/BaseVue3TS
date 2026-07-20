<script setup lang="ts">
defineProps<{ active: boolean; effectiveActive?: boolean }>();
</script>
<template>
  <span
    class="whitespace-nowrap text-sm font-medium"
    :class="
      active
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400'
    "
    >{{
      active ? "Đang hoạt động" : "Tạm ẩn"
    }}</span
  >
</template>
