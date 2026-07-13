<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
</script>

<template>
  <div class="grid min-h-[590px] w-full md:grid-cols-[42fr_58fr]" aria-label="Đang kiểm tra phiên đăng nhập">
    <div class="hidden bg-[var(--bookora-auth-cream)] p-10 md:block">
      <Skeleton class="h-full min-h-[510px] w-full rounded-2xl" />
    </div>
    <div class="flex items-center justify-center bg-white px-6 py-10">
      <div class="w-full max-w-[420px] space-y-5">
        <Skeleton class="h-10 w-36" />
        <Skeleton class="h-9 w-72 max-w-full" />
        <Skeleton class="h-11 w-full" />
        <Skeleton class="h-11 w-full" />
        <Skeleton class="h-11 w-full" />
      </div>
    </div>
  </div>
</template>
