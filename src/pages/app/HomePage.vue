<script setup lang="ts">
import { ArrowRight } from "@lucide/vue";
import { RouterLink } from "vue-router";
import { Button } from "@/components/ui/button";
</script>

<template>
  <section class="grid gap-6 py-12">
    <div class="max-w-3xl space-y-4">
      <p class="text-sm font-medium text-primary">
        Vue 3 + TypeScript architecture
      </p>
      <h1 class="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Frontend foundation for REST, dashboard, and AI features.
      </h1>
      <p class="text-lg text-muted-foreground">
        Pinia keeps client state. TanStack Query owns server state. Axios
        centralizes API and JWT handling.
      </p>
    </div>

    <div class="flex flex-wrap gap-3">
      <Button as-child>
        <RouterLink :to="{ name: 'dashboard' }">
          Mở bảng điều khiển
          <ArrowRight class="ml-2 h-4 w-4" />
        </RouterLink>
      </Button>
      <Button as-child variant="outline">
        <RouterLink :to="{ name: 'login' }">Đăng nhập</RouterLink>
      </Button>
    </div>
  </section>
</template>
