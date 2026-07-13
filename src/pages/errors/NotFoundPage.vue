<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-background px-4 text-foreground">
    <section class="max-w-md text-center">
      <p class="text-sm font-medium text-primary">404</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight">Không tìm thấy trang</h1>
      <p class="mt-3 text-muted-foreground">Đường dẫn bạn yêu cầu không tồn tại.</p>
      <Button as-child class="mt-6">
        <RouterLink :to="{ name: 'client-home' }">Về trang chủ</RouterLink>
      </Button>
    </section>
  </main>
</template>
