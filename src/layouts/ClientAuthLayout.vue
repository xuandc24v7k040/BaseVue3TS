<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="bookora-client-auth grid min-h-dvh place-items-center overflow-x-hidden px-4 py-5 text-[var(--bookora-auth-ink)] sm:px-6 sm:py-6">
    <section class="bookora-auth-shell mx-auto w-full max-w-[1080px] overflow-hidden rounded-[20px] border border-[var(--bookora-auth-border)] bg-white shadow-[0_16px_44px_rgba(31,52,35,0.11)]">
      <RouterView />
    </section>
  </main>
</template>

<style scoped>
.bookora-client-auth {
  --bookora-green: oklch(0.38 0.095 148);
  --bookora-green-hover: oklch(0.32 0.085 148);
  --bookora-auth-cream: oklch(0.975 0.012 83);
  --bookora-auth-canvas: oklch(0.992 0.006 88);
  --bookora-auth-ink: oklch(0.21 0.035 148);
  --bookora-auth-muted: oklch(0.49 0.02 145);
  --bookora-auth-border: oklch(0.89 0.014 115);
  background:
    radial-gradient(circle at 12% 14%, oklch(0.965 0.018 92 / 0.75), transparent 28rem),
    var(--bookora-auth-canvas);
}

@media (max-width: 767px) {
  .bookora-auth-shell {
    min-height: calc(100dvh - 2.5rem);
  }
}
</style>
