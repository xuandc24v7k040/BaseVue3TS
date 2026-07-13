<script setup lang="ts">
import { RouterView } from 'vue-router'
import ClientFooter from '@/components/client/layout/ClientFooter.vue'
import ClientHeader from '@/components/client/layout/ClientHeader.vue'
import CustomerAccountSidebar from '@/components/client/layout/CustomerAccountSidebar.vue'
import { Menu } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
</script>

<template>
  <div class="bookora-client bookora-account flex min-h-svh min-w-0 flex-col bg-[var(--bookora-canvas)] text-[var(--bookora-ink)]">
    <ClientHeader />
    <main class="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-10 xl:px-12">
      <Sheet><SheetTrigger as-child><Button variant="outline" class="mb-4 md:hidden"><Menu class="size-4" />Menu tài khoản</Button></SheetTrigger>
        <SheetContent side="left" class="bookora-client w-[min(22rem,calc(100vw-1rem))] p-3"><SheetHeader class="sr-only"><SheetTitle>Menu tài khoản</SheetTitle><SheetDescription>Điều hướng khu vực tài khoản</SheetDescription></SheetHeader><CustomerAccountSidebar class="mt-8 border-0 shadow-none" /></SheetContent>
      </Sheet>
      <div class="grid min-w-0 gap-6 md:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <CustomerAccountSidebar class="sticky top-4 hidden self-start md:block" />
      <div class="min-w-0">
        <RouterView />
      </div>
      </div>
    </main>
    <ClientFooter />
  </div>
</template>

<style>
.bookora-client { --bookora-green: oklch(0.38 0.095 148); --bookora-green-hover: oklch(0.32 0.085 148); --bookora-soft: oklch(0.96 0.018 130); --bookora-cream: oklch(0.975 0.012 83); --bookora-canvas: oklch(0.995 0.004 90); --bookora-ink: oklch(0.19 0.025 148); --bookora-muted: oklch(0.49 0.02 145); --bookora-border: oklch(0.9 0.012 120); }
</style>
