<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  Bell,
  ClipboardList,
  Eye,
  Heart,
  Home,
  LogOut,
  MapPin,
  Star,
  UserRound,
} from "@lucide/vue";
import ImagePreviewDialog from "@/components/shared/ImagePreviewDialog.vue";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCustomerLogout } from "@/composables/use-customer-logout";
import CustomerAvatarDialog from "@/features/customer-account/components/CustomerAvatarDialog.vue";
import { useCustomerProfile } from "@/features/customer-account/composables/use-customer-account";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();
const profileQuery = useCustomerProfile();
const { isLoggingOut, logoutCustomer } = useCustomerLogout();
const avatarDialogOpen = ref(false);
const previewOpen = ref(false);
const displayName = computed(
  () => profileQuery.data.value?.fullName ?? authStore.user?.fullName ?? "",
);
const displayEmail = computed(
  () => profileQuery.data.value?.email ?? authStore.user?.email ?? "",
);
const avatarUrl = computed(
  () =>
    profileQuery.data.value !== undefined
      ? profileQuery.data.value.avatarUrl
      : (authStore.user?.avatarUrl ?? null),
);
const initials = computed(
  () =>
    displayName.value
      .split(/\s+/u)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "BK",
);
const items = [
  { label: "Tổng quan", to: "/account", icon: Home },
  { label: "Đơn hàng của tôi", to: "/account/orders", icon: ClipboardList },
  { label: "Địa chỉ của tôi", to: "/account/addresses", icon: MapPin },
  { label: "Sách yêu thích", to: "/account/favorites", icon: Heart },
  { label: "Đánh giá của tôi", to: "/account/reviews", icon: Star },
  { label: "Thông tin tài khoản", to: "/account/profile", icon: UserRound },
  { label: "Thông báo", to: "/account/notifications", icon: Bell },
];
</script>

<template>
  <aside
    class="min-w-0 rounded-xl border border-[var(--bookora-border)] bg-white p-3 text-[var(--bookora-ink)] shadow-sm"
  >
    <div class="px-2 pb-3 pt-2 text-center">
      <div class="group relative mx-auto size-18">
        <button
          type="button"
          class="block size-full rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] focus-visible:ring-offset-2"
          aria-label="Quản lý ảnh đại diện"
          data-testid="customer-avatar-trigger"
          @click="avatarDialogOpen = true"
        >
          <Avatar
            :key="avatarUrl ?? 'avatar-fallback'"
            class="size-18 bg-[var(--bookora-soft)]"
            ><AvatarImage
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="'Ảnh đại diện ' + displayName"
            /><AvatarFallback
              class="bg-[var(--bookora-soft)] text-lg font-bold text-[var(--bookora-green)]"
              >{{ initials }}</AvatarFallback
            ></Avatar
          >
        </button>
        <button
          v-if="avatarUrl"
          type="button"
          aria-label="Xem ảnh đại diện"
          data-testid="customer-avatar-preview"
          class="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full border border-white bg-black/65 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          @click.stop="previewOpen = true"
        >
          <Eye class="size-3" />
        </button>
      </div>
      <p class="mt-2.5 truncate font-semibold" :title="displayName">
        {{ displayName }}
      </p>
      <p class="mt-1 break-all text-sm text-[var(--bookora-muted)]">
        {{ displayEmail }}
      </p>
    </div>
    <nav aria-label="Tài khoản khách hàng" class="grid gap-1">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        v-slot="{ isExactActive, isActive }"
        :to="item.to"
        custom
      >
        <RouterLink
          :to="item.to"
          :aria-current="
            (item.to === '/account' ? isExactActive : isActive)
              ? 'page'
              : undefined
          "
          class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors hover:bg-[var(--bookora-soft)]"
          :class="
            (item.to === '/account' ? isExactActive : isActive)
              ? 'bg-[var(--bookora-soft)] font-semibold text-[var(--bookora-green)]'
              : ''
          "
        >
          <component :is="item.icon" class="size-5 shrink-0" />{{ item.label }}
        </RouterLink>
      </RouterLink>
    </nav>
    <div class="mt-3 border-t border-[var(--bookora-border)] pt-3">
      <button
        type="button"
        :disabled="isLoggingOut"
        class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm hover:bg-[var(--bookora-soft)] disabled:opacity-60"
        @click="logoutCustomer"
      >
        <LogOut class="size-5" />{{
          isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"
        }}
      </button>
    </div>
  </aside>

  <CustomerAvatarDialog
    v-model:open="avatarDialogOpen"
    :avatar-url="avatarUrl"
    :full-name="displayName"
  />
  <ImagePreviewDialog
    v-if="avatarUrl"
    v-model:open="previewOpen"
    :src="avatarUrl"
    :alt="`Ảnh đại diện ${displayName}`"
    title="Ảnh đại diện"
  />
</template>
