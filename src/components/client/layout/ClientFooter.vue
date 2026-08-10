<script setup lang="ts">
import { Clock3, Mail, MapPin, Phone } from "@lucide/vue";
import { RouterLink } from "vue-router";
import ClientBrand from "@/components/client/layout/ClientBrand.vue";
</script>

<template>
  <footer
    class="bookora-client-theme border-t border-[var(--bookora-border)] bg-[var(--bookora-cream)] text-[var(--bookora-ink)]"
  >
    <div
      class="mx-auto grid w-full max-w-[1440px] gap-9 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.35fr_1fr_1fr_1.2fr] lg:px-10 xl:px-12"
    >
      <div class="max-w-sm space-y-4">
        <ClientBrand />
        <p class="text-sm leading-6 text-[var(--bookora-muted)]">
          Không gian sách dành cho mọi lứa tuổi, nơi mỗi trang mở ra một góc
          nhìn mới.
        </p>
      </div>

      <nav aria-label="Khám phá" class="space-y-3">
        <h2 class="font-semibold">Khám phá</h2>
        <RouterLink
          class="block text-sm text-[var(--bookora-muted)] hover:text-[var(--bookora-green)]"
          to="/san-pham?sort=new"
          >Sách mới</RouterLink
        >
        <RouterLink
          class="block text-sm text-[var(--bookora-muted)] hover:text-[var(--bookora-green)]"
          to="/san-pham?sort=best-selling"
          >Sách bán chạy</RouterLink
        >
        <RouterLink
          class="block text-sm text-[var(--bookora-muted)] hover:text-[var(--bookora-green)]"
          to="/san-pham?filter=upcoming"
          >Sách sắp phát hành</RouterLink
        >
        <RouterLink
          class="block text-sm text-[var(--bookora-muted)] hover:text-[var(--bookora-green)]"
          to="/san-pham"
          >Danh mục sản phẩm</RouterLink
        >
      </nav>

      <nav aria-label="Hỗ trợ" class="space-y-3">
        <h2 class="font-semibold">Hỗ trợ</h2>
        <RouterLink
          class="block text-sm text-[var(--bookora-muted)] hover:text-[var(--bookora-green)]"
          to="/san-pham"
          >Hướng dẫn mua hàng</RouterLink
        >
        <RouterLink
          class="block text-sm text-[var(--bookora-muted)] hover:text-[var(--bookora-green)]"
          to="/san-pham"
          >Chính sách đổi trả</RouterLink
        >
        <RouterLink
          class="block text-sm text-[var(--bookora-muted)] hover:text-[var(--bookora-green)]"
          to="/san-pham"
          >Chính sách bảo mật</RouterLink
        >
        <RouterLink
          class="block text-sm text-[var(--bookora-muted)] hover:text-[var(--bookora-green)]"
          to="/account/notifications"
          >Liên hệ hỗ trợ</RouterLink
        >
      </nav>

      <div class="space-y-3">
        <h2 class="font-semibold">Thông tin Bookora</h2>
        <p class="flex gap-2 text-sm text-[var(--bookora-muted)]">
          <MapPin aria-hidden="true" class="mt-0.5 size-4 shrink-0" />Chi nhánh
          Cần Thơ
        </p>
        <p class="flex gap-2 text-sm text-[var(--bookora-muted)]">
          <Phone aria-hidden="true" class="mt-0.5 size-4 shrink-0" />1900 6868
        </p>
        <p class="flex gap-2 text-sm text-[var(--bookora-muted)]">
          <Mail
            aria-hidden="true"
            class="mt-0.5 size-4 shrink-0"
          />hotro@bookora.vn
        </p>
        <p class="flex gap-2 text-sm text-[var(--bookora-muted)]">
          <Clock3 aria-hidden="true" class="mt-0.5 size-4 shrink-0" />08:00 -
          21:00 mỗi ngày
        </p>
      </div>
    </div>
    <div class="border-t border-[var(--bookora-border)]">
      <div
        class="mx-auto w-full max-w-[1440px] px-4 py-4 text-sm text-[var(--bookora-muted)] sm:px-6 lg:px-10 xl:px-12"
      >
        © 2026 Bookora. All rights reserved.
      </div>
    </div>
  </footer>
</template>
