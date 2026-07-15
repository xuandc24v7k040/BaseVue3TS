<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <span
    :class="active
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400'"
    class="inline-flex items-center font-semibold"
  >
    <span
      aria-hidden="true"
      :class="active ? 'mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500' : 'mr-1.5 h-1.5 w-1.5 rounded-full bg-rose-500'"
    />
    {{ active ? 'Đang hoạt động' : 'Ngừng hoạt động' }}
  </span>
</template>
