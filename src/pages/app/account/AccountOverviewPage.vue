<script setup lang="ts">
import { ArrowRight, Bell, ClipboardCheck, ShoppingBag, Star, Truck, Wallet } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import nhaGiaKim from '@/assets/client/home/books/nha-gia-kim.svg'
import { useAuthStore } from '@/stores/auth.store'
import { favoriteBooks } from './account.mock'

const authStore = useAuthStore()

const stats = [
  { value: '12', label: 'Tổng đơn hàng', icon: ShoppingBag, to: '/account/orders' },
  { value: '2.560.000đ', label: 'Tổng tiền đã chi tiêu', icon: Wallet, to: '/account/orders' },
  { value: '14', label: 'Sản phẩm đã đánh giá', icon: Star, to: '/account/reviews' },
]
const attention = [
  { title: 'Đang giao', value: '2', detail: 'Đơn hàng đang trên đường', action: 'Xem chi tiết', icon: Truck, to: '/account/orders' },
  { title: 'Chờ đánh giá', value: '3', detail: 'Sản phẩm chờ bạn đánh giá', action: 'Đánh giá ngay', icon: ClipboardCheck, to: '/account/reviews' },
  { title: 'Thông báo chưa đọc', value: '2', detail: 'Thông báo mới từ Bookora', action: 'Xem ngay', icon: Bell, to: '/account/notifications' },
]
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
</script>

<template>
  <div class="grid min-w-0 gap-4 sm:gap-5">
    <section class="relative overflow-hidden rounded-xl border border-[var(--bookora-border)] bg-[var(--bookora-cream)] px-6 py-7 sm:px-8">
      <div class="relative z-10 max-w-xl"><p class="font-semibold text-[var(--bookora-green)]">Chào mừng trở lại,</p><h1 class="mt-1 text-2xl font-bold text-[var(--bookora-green)] sm:text-3xl">{{ authStore.user?.fullName }}!</h1><p class="mt-3 text-sm leading-6">Cảm ơn bạn đã luôn đồng hành cùng Bookora.<br>Cùng khám phá những cuốn sách hay nhé!</p></div>
      <div aria-hidden="true" class="absolute -bottom-8 right-6 hidden items-end gap-2 opacity-70 lg:flex"><div class="h-20 w-36 rotate-[-3deg] rounded-md bg-[#87936b] shadow-md" /><div class="size-20 rounded-b-2xl rounded-t-md bg-[var(--bookora-green)]" /><div class="h-28 w-14 rounded-t-full bg-[#9cab75]" /></div>
    </section>

    <section aria-label="Thống kê tài khoản" class="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Card v-for="stat in stats" :key="stat.label" class="min-w-0 p-5 shadow-none"><div class="flex items-center gap-4"><span class="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--bookora-soft)] text-[var(--bookora-green)]"><component :is="stat.icon" class="size-7" /></span><div class="min-w-0"><p class="text-2xl font-bold text-[var(--bookora-green)]">{{ stat.value }}</p><p class="text-sm text-[var(--bookora-muted)]">{{ stat.label }}</p><RouterLink :to="stat.to" class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--bookora-green)]">Xem chi tiết <ArrowRight class="size-3.5" /></RouterLink></div></div></Card>
    </section>

    <Card class="min-w-0 bg-[var(--bookora-cream)] p-5 shadow-none"><h2 class="font-semibold">Việc cần quan tâm</h2><div class="mt-4 grid gap-5 md:grid-cols-3 md:divide-x md:divide-[var(--bookora-border)]">
      <div v-for="item in attention" :key="item.title" class="flex min-w-0 gap-3 md:px-4 first:md:pl-0"><span class="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--bookora-soft)] text-[var(--bookora-green)]"><component :is="item.icon" class="size-6" /></span><div class="min-w-0"><p class="text-sm font-semibold">{{ item.title }}</p><p><strong class="mr-2 text-lg">{{ item.value }}</strong><span class="text-xs text-[var(--bookora-muted)]">{{ item.detail }}</span></p><RouterLink :to="item.to" class="mt-1 inline-flex items-center gap-1 text-xs text-[var(--bookora-green)]">{{ item.action }} <ArrowRight class="size-3" /></RouterLink></div></div>
    </div></Card>

    <Card class="min-w-0 p-5 shadow-none"><div class="flex items-center justify-between"><h2 class="font-semibold">Đơn hàng gần đây</h2><RouterLink to="/account/orders" class="text-xs text-[var(--bookora-green)]">Xem tất cả →</RouterLink></div><div class="mt-4 grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-4 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(8rem,auto)_auto] sm:items-center"><img :src="nhaGiaKim" alt="Bìa Nhà Giả Kim" class="h-24 w-16 rounded object-cover"><div class="min-w-0"><p class="font-semibold">Nhà Giả Kim</p><p class="text-sm text-[var(--bookora-muted)]">Paulo Coelho</p><p class="text-sm">x1</p></div><div class="col-span-2 text-sm sm:col-span-1"><p>#ORD2505091234</p><p class="text-[var(--bookora-muted)]">09/05/2025</p></div><div class="col-span-2 text-right sm:col-span-1"><Badge class="bg-[var(--bookora-soft)] text-[var(--bookora-green)]">Đã giao hàng</Badge><p class="mt-2 font-semibold">119.000đ</p></div></div></Card>

    <Card class="min-w-0 overflow-hidden p-5 shadow-none"><div class="flex justify-between"><h2 class="font-semibold">Sản phẩm yêu thích</h2><RouterLink to="/account/favorites" class="text-xs text-[var(--bookora-green)]">Xem tất cả →</RouterLink></div><ScrollArea class="mt-4 min-w-0 max-w-full" scrollbar-orientation="horizontal"><div class="flex w-max gap-5 pb-4"><article v-for="book in favoriteBooks" :key="book.title" class="grid w-60 shrink-0 grid-cols-[4rem_1fr] gap-3"><img :src="book.cover" :alt="`Bìa ${book.title}`" class="h-24 w-16 rounded object-cover"><div class="min-w-0"><h3 class="font-medium">{{ book.title }}</h3><p class="mt-1 text-sm text-[var(--bookora-muted)]">{{ book.author }}</p><p class="mt-2 text-sm font-semibold">{{ money.format(book.price) }}</p></div></article></div></ScrollArea></Card>
  </div>
</template>
