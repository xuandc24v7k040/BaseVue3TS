<script setup lang="ts">
import { Clock3, LockKeyhole, Sprout, Truck } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import atomicHabitsCover from '@/assets/client/home/books/atomic-habits.svg'
import dacNhanTamCover from '@/assets/client/home/books/dac-nhan-tam.svg'
import nhaGiaKimCover from '@/assets/client/home/books/nha-gia-kim.svg'
import sapiensCover from '@/assets/client/home/books/sapiens.svg'
import { Button } from '@/components/ui/button'

const benefits = [
  { title: 'Giao hàng nhanh', description: 'Toàn quốc', icon: Truck },
  { title: 'Thanh toán an toàn', description: 'Bảo mật tuyệt đối', icon: LockKeyhole },
  { title: 'Hỗ trợ 24/7', description: 'Tận tâm phục vụ', icon: Clock3 },
]
</script>

<template>
  <section
    aria-labelledby="home-hero-title"
    class="relative isolate overflow-hidden rounded-2xl border border-[var(--bookora-border)] bg-[var(--bookora-cream)]"
  >
    <div class="grid min-h-[380px] lg:grid-cols-[0.82fr_1.18fr]">
      <div class="relative z-10 flex flex-col justify-center px-6 pb-8 pt-10 sm:px-10 lg:px-14 lg:pb-20 lg:pt-16">
        <h1 id="home-hero-title" class="text-[clamp(2.15rem,3.2vw,3rem)] font-bold leading-[1.08] tracking-[-0.035em] text-[var(--bookora-green)]">
          <span class="block text-[var(--bookora-ink)]">Đọc sách hôm nay</span>
          mở lối ngày mai.
        </h1>
        <p class="mt-5 max-w-sm text-base font-medium leading-7 text-[var(--bookora-ink)] sm:text-lg">
          Hàng ngàn đầu sách hay<br>
          đang chờ bạn khám phá
        </p>

        <div class="mt-6 flex flex-wrap gap-3">
          <Button as-child class="h-11 bg-[var(--bookora-green)] px-6 text-white hover:bg-[var(--bookora-green-hover)]">
            <RouterLink to="/books">Khám phá ngay</RouterLink>
          </Button>
          <Button as-child variant="outline" class="h-11 border-[var(--bookora-border)] bg-transparent px-7 hover:bg-background">
            <RouterLink to="/books?sort=new">Sách mới</RouterLink>
          </Button>
        </div>

        <div class="mt-8 grid gap-4 border-t border-[var(--bookora-border)] pt-5 sm:grid-cols-3 lg:absolute lg:bottom-6 lg:left-14 lg:right-4 lg:mt-0 lg:border-0 lg:pt-0">
          <div v-for="benefit in benefits" :key="benefit.title" class="flex items-center gap-3 sm:border-r sm:border-[var(--bookora-border)] sm:last:border-0">
            <component :is="benefit.icon" aria-hidden="true" class="size-6 shrink-0 text-[var(--bookora-ink)]" :stroke-width="1.6" />
            <p class="text-xs leading-5">
              <strong class="block font-semibold">{{ benefit.title }}</strong>
              <span class="text-[var(--bookora-muted)]">{{ benefit.description }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="relative min-h-[310px] overflow-hidden bg-[linear-gradient(145deg,oklch(0.98_0.01_85),oklch(0.91_0.025_84))] lg:min-h-full">
        <div class="absolute inset-x-0 bottom-0 h-16 border-t border-[var(--bookora-border)] bg-[oklch(0.78_0.06_75)]/55" />
        <div class="absolute bottom-14 left-[7%] right-[15%] flex items-end justify-center gap-2 sm:gap-4">
          <img :src="dacNhanTamCover" alt="Bìa Đắc Nhân Tâm trong bộ sách nổi bật" class="w-[21%] max-w-40 drop-shadow-xl" width="300" height="450">
          <img :src="nhaGiaKimCover" alt="Bìa Nhà Giả Kim trong bộ sách nổi bật" class="w-[19%] max-w-36 drop-shadow-xl" width="300" height="450">
          <img :src="atomicHabitsCover" alt="Bìa Atomic Habits trong bộ sách nổi bật" class="w-[20%] max-w-38 drop-shadow-xl" width="300" height="450">
          <img :src="sapiensCover" alt="Bìa Sapiens trong bộ sách nổi bật" class="hidden w-[18%] max-w-34 drop-shadow-xl sm:block" width="300" height="450">
        </div>
        <div class="absolute bottom-15 right-[2%] hidden flex-col items-center md:flex">
          <Sprout aria-hidden="true" class="size-28 text-[var(--bookora-green)] lg:size-36" :stroke-width="1.25" />
          <div class="-mt-5 h-20 w-24 rounded-b-3xl rounded-t-lg bg-[oklch(0.78_0.035_75)] shadow-lg lg:h-24 lg:w-28" />
        </div>
      </div>
    </div>

    <div aria-hidden="true" class="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
      <span class="h-1.5 w-5 rounded-full bg-[var(--bookora-green)]" />
      <span class="size-1.5 rounded-full bg-background" />
      <span class="size-1.5 rounded-full bg-background" />
    </div>
  </section>
</template>
