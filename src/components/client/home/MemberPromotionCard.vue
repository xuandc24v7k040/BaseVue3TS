<script setup lang="ts">
import { RouterLink } from 'vue-router'
import memberCardImage from '@/assets/client/home/promotions/member-card.svg'
import { Button } from '@/components/ui/button'
</script>

<template>
  <aside class="relative flex w-full min-w-0 max-w-full min-h-64 overflow-hidden rounded-xl border border-[var(--bookora-border)] bg-[var(--bookora-cream)] p-6 sm:p-7">
    <div class="relative z-10 min-w-0 max-w-[58%]">
      <p class="text-sm font-semibold text-[var(--bookora-ink)]">Ưu đãi thành viên</p>
      <h2 class="mt-4 text-3xl font-bold tracking-tight text-[var(--bookora-green)]">Giảm đến 20%</h2>
      <p class="mt-3 text-sm leading-6 text-[var(--bookora-muted)]">
        Dành riêng cho thành viên Bookora
      </p>
      <Button as-child class="mt-5 bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]">
        <RouterLink to="/register">Đăng ký ngay</RouterLink>
      </Button>
    </div>
    <img
      :src="memberCardImage"
      alt="Thẻ thành viên Bookora cùng hộp quà"
      class="absolute -bottom-2 -right-10 w-[64%] max-w-80"
      width="520"
      height="300"
      loading="lazy"
    >
  </aside>
</template>
