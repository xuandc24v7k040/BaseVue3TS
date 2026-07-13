<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import ClientFooter from '@/components/client/layout/ClientFooter.vue'
import ClientHeader from '@/components/client/layout/ClientHeader.vue'
import { hasSessionHint } from '@/features/auth/session-hint'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

onMounted(() => {
  if (hasSessionHint()) void authStore.ensureBootstrapped()
})
</script>

<template>
  <div class="bookora-client flex min-h-screen w-full min-w-0 max-w-full flex-col bg-[var(--bookora-canvas)] text-[var(--bookora-ink)]">
    <ClientHeader />
    <main class="mx-auto flex w-full min-w-0 max-w-[1440px] flex-1 px-4 pb-12 pt-4 sm:px-6 sm:pb-16 lg:px-10 xl:px-12">
      <RouterView />
    </main>
    <ClientFooter />
  </div>
</template>

<style>
.bookora-client {
  --bookora-green: oklch(0.38 0.095 148);
  --bookora-green-hover: oklch(0.32 0.085 148);
  --bookora-green-soft: oklch(0.63 0.09 144);
  --bookora-soft: oklch(0.96 0.018 130);
  --bookora-cream: oklch(0.975 0.012 83);
  --bookora-canvas: oklch(0.995 0.004 90);
  --bookora-ink: oklch(0.19 0.025 148);
  --bookora-muted: oklch(0.49 0.02 145);
  --bookora-border: oklch(0.9 0.012 120);
}
</style>
