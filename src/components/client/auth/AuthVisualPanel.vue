<script setup lang="ts">
import { Sprout } from '@lucide/vue'
import atomicHabitsCover from '@/assets/client/home/books/atomic-habits.svg'
import dacNhanTamCover from '@/assets/client/home/books/dac-nhan-tam.svg'
import nhaGiaKimCover from '@/assets/client/home/books/nha-gia-kim.svg'
import sapiensCover from '@/assets/client/home/books/sapiens.svg'

const props = defineProps<{
  variant: 'login' | 'register'
}>()
</script>

<template>
  <aside class="auth-visual relative hidden min-h-0 overflow-hidden bg-[var(--bookora-auth-cream)] p-8 md:flex md:flex-col md:justify-between lg:p-10" aria-label="Không gian đọc sách Bookora">
    <div class="relative z-10 max-w-[340px] motion-safe:animate-[auth-panel-in_500ms_ease-out]">
      <template v-if="props.variant === 'login'">
        <span aria-hidden="true" class="text-3xl font-semibold leading-none text-[var(--bookora-green)]">“</span>
        <h2 class="mt-1 text-[2rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--bookora-auth-ink)] lg:text-[2.15rem]">
          Một cuốn sách hay<br />mở ra cả một thế giới.
        </h2>
      </template>
      <template v-else>
        <h2 class="text-[2rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--bookora-auth-ink)] lg:text-[2.15rem]">
          Tri thức hôm nay,<br />tương lai ngày mai.
        </h2>
        <p class="mt-3 max-w-xs text-sm leading-5 text-[var(--bookora-auth-muted)]">
          Tạo tài khoản để khám phá hàng ngàn đầu sách và nhiều ưu đãi hấp dẫn.
        </p>
      </template>

      <div class="mt-5 flex items-center gap-3 text-[var(--bookora-green)]" aria-hidden="true">
        <span class="h-px w-8 bg-current/60" />
        <Sprout class="size-5" :stroke-width="1.5" />
        <span class="h-px w-8 bg-current/60" />
      </div>
    </div>

    <div class="auth-books relative z-10 mx-auto mt-6 flex w-full max-w-[330px] items-end justify-center gap-2 pb-1" aria-hidden="true">
      <img :src="dacNhanTamCover" alt="" class="auth-book h-36 w-24 -rotate-3 shadow-lg lg:h-40 lg:w-24" />
      <img :src="nhaGiaKimCover" alt="" class="auth-book h-40 w-24 rotate-1 shadow-lg lg:h-44 lg:w-28" />
      <img :src="sapiensCover" alt="" class="auth-book h-32 w-20 rotate-3 shadow-lg lg:h-36 lg:w-24" />
      <img v-if="props.variant === 'register'" :src="atomicHabitsCover" alt="" class="auth-book hidden h-28 w-20 -rotate-2 shadow-lg xl:block" />
    </div>
  </aside>
</template>

<style scoped>
.auth-visual {
  isolation: isolate;
  background-image:
    radial-gradient(circle at 82% 22%, rgb(255 255 255 / 0.8), transparent 15rem),
    linear-gradient(145deg, transparent 45%, oklch(0.87 0.035 98 / 0.6));
}

.auth-visual::after {
  position: absolute;
  right: -5rem;
  bottom: -7rem;
  width: 22rem;
  height: 22rem;
  border-radius: 9999px;
  background: oklch(0.67 0.075 145 / 0.14);
  content: '';
}

.auth-book {
  border-radius: 0.35rem 0.6rem 0.6rem 0.35rem;
  object-fit: cover;
  transition: transform 250ms ease;
}

.auth-books:hover .auth-book:nth-child(2) {
  transform: translateY(-0.4rem) rotate(1deg);
}

@keyframes auth-panel-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (min-width: 1024px) and (max-height: 800px) {
  .auth-visual {
    padding: 2rem;
  }

  .auth-visual h2 {
    font-size: 1.875rem;
  }

  .auth-books {
    max-width: 18rem;
    gap: 0.375rem;
  }

  .auth-book:nth-child(1) {
    width: 5.25rem;
    height: 8.5rem;
  }

  .auth-book:nth-child(2) {
    width: 5.75rem;
    height: 9.25rem;
  }

  .auth-book:nth-child(3) {
    width: 4.75rem;
    height: 7.75rem;
  }

  .auth-book:nth-child(4) {
    width: 4.25rem;
    height: 6.75rem;
  }
}
</style>
