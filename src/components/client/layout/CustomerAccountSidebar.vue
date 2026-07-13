<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Bell, ClipboardList, Heart, Home, LogOut, MapPin, Settings, Star, UserRound } from '@lucide/vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useCustomerLogout } from '@/composables/use-customer-logout'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const { isLoggingOut, logoutCustomer } = useCustomerLogout()
const initials = computed(() => authStore.user?.fullName
  .split(/\s+/u)
  .filter(Boolean)
  .slice(-2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || 'BK')
const items = [
  { label: 'Tổng quan', to: '/account', icon: Home }, { label: 'Đơn hàng của tôi', to: '/account/orders', icon: ClipboardList },
  { label: 'Địa chỉ của tôi', to: '/account/addresses', icon: MapPin }, { label: 'Sách yêu thích', to: '/account/favorites', icon: Heart },
  { label: 'Đánh giá của tôi', to: '/account/reviews', icon: Star }, { label: 'Thông tin tài khoản', to: '/account/profile', icon: UserRound },
  { label: 'Thông báo', to: '/account/notifications', icon: Bell }, { label: 'Cài đặt tài khoản', to: '/account/settings', icon: Settings },
]
</script>

<template>
  <aside class="min-w-0 rounded-xl border border-[var(--bookora-border)] bg-white p-3 text-[var(--bookora-ink)] shadow-sm">
    <div class="px-2 pb-3 pt-2 text-center">
      <Avatar class="mx-auto size-18 bg-[var(--bookora-soft)]"><AvatarFallback class="bg-[var(--bookora-soft)] text-lg font-bold text-[var(--bookora-green)]">{{ initials }}</AvatarFallback></Avatar>
      <p class="mt-2.5 font-semibold">{{ authStore.user?.fullName }}</p>
      <p class="mt-1 break-all text-sm text-[var(--bookora-muted)]">{{ authStore.user?.email }}</p>
    </div>
    <nav aria-label="Tài khoản khách hàng" class="grid gap-1">
      <RouterLink v-for="item in items" :key="item.to" v-slot="{ isExactActive, isActive }" :to="item.to" custom>
        <RouterLink :to="item.to" :aria-current="(item.to === '/account' ? isExactActive : isActive) ? 'page' : undefined" class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors hover:bg-[var(--bookora-soft)]" :class="(item.to === '/account' ? isExactActive : isActive) ? 'bg-[var(--bookora-soft)] font-semibold text-[var(--bookora-green)]' : ''">
          <component :is="item.icon" class="size-5 shrink-0" />{{ item.label }}
        </RouterLink>
      </RouterLink>
    </nav>
    <div class="mt-3 border-t border-[var(--bookora-border)] pt-3">
      <button type="button" :disabled="isLoggingOut" class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm hover:bg-[var(--bookora-soft)] disabled:opacity-60" @click="logoutCustomer"><LogOut class="size-5" />{{ isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất' }}</button>
    </div>
  </aside>
</template>
