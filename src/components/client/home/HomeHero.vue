<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Truck,
} from "@lucide/vue";
import { onBeforeUnmount, ref, shallowRef } from "vue";
import { RouterLink } from "vue-router";
import banner1 from "@/assets/client/home/banner1.png";
import banner2 from "@/assets/client/home/banner2.png";
import banner3 from "@/assets/client/home/banner3.png";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const benefits = [
  { title: "Giao hàng nhanh", description: "Toàn quốc", icon: Truck },
  {
    title: "Thanh toán an toàn",
    description: "Bảo mật tuyệt đối",
    icon: LockKeyhole,
  },
  { title: "Hỗ trợ 24/7", description: "Tận tâm phục vụ", icon: Clock3 },
];

const banners = [
  {
    src: banner1,
    alt: "Bộ sách nổi bật gồm Đắc Nhân Tâm, Nhà Giả Kim và Atomic Habits",
  },
  { src: banner2, alt: "Thế giới truyện tranh đầy sắc màu tại Bookora" },
  { src: banner3, alt: "Sách thiếu nhi khơi mở niềm vui học tập" },
];
const activeBannerIndex = ref(0);
const carouselApi = shallowRef<CarouselApi>();
const carouselOptions = {
  align: "start" as const,
  duration: 30,
  loop: false,
};

function syncActiveBanner(api: CarouselApi): void {
  if (!api) return;
  activeBannerIndex.value = api.selectedScrollSnap();
}

function setCarouselApi(api: CarouselApi): void {
  if (!api) return;
  carouselApi.value = api;
  syncActiveBanner(api);
  api.on("select", syncActiveBanner);
}

function selectBanner(index: number): void {
  if (index < 0 || index >= banners.length) return;
  carouselApi.value?.scrollTo(index);
}

function showPreviousBanner(): void {
  carouselApi.value?.scrollPrev();
}

function showNextBanner(): void {
  carouselApi.value?.scrollNext();
}

onBeforeUnmount(() => {
  carouselApi.value?.off("select", syncActiveBanner);
});
</script>

<template>
  <section
    aria-labelledby="home-hero-title"
    class="relative isolate overflow-hidden rounded-2xl border border-[var(--bookora-border)] bg-[var(--bookora-cream)]"
  >
    <div class="grid min-h-[380px] xl:grid-cols-[0.82fr_1.18fr]">
      <div
        class="relative z-10 flex flex-col justify-center px-6 pb-8 pt-10 sm:px-10 lg:px-14 lg:pt-16"
      >
        <h1
          id="home-hero-title"
          class="text-[clamp(2.15rem,3.2vw,3rem)] font-bold leading-[1.08] tracking-[-0.035em] text-[var(--bookora-green)]"
        >
          <span class="block text-[var(--bookora-ink)]">Đọc sách hôm nay</span>
          mở lối ngày mai.
        </h1>
        <p
          class="mt-5 max-w-sm text-base font-medium leading-7 text-[var(--bookora-ink)] sm:text-lg"
        >
          Hàng ngàn đầu sách hay<br />
          đang chờ bạn khám phá
        </p>

        <div class="mt-6 flex flex-wrap gap-3">
          <Button
            as-child
            class="h-11 bg-[var(--bookora-green)] px-6 text-white hover:bg-[var(--bookora-green-hover)]"
          >
            <RouterLink to="/san-pham">Khám phá ngay</RouterLink>
          </Button>
          <Button
            as-child
            variant="outline"
            class="h-11 border-[var(--bookora-border)] bg-transparent px-7 hover:bg-background"
          >
            <RouterLink to="/san-pham?sort=new">Sách mới</RouterLink>
          </Button>
        </div>

        <div
          class="mt-8 grid gap-4 border-t border-[var(--bookora-border)] pt-5 sm:grid-cols-3 xl:mt-6 xl:border-0 xl:pt-0"
        >
          <div
            v-for="benefit in benefits"
            :key="benefit.title"
            class="flex items-center gap-3 sm:border-r sm:border-[var(--bookora-border)] sm:last:border-0"
          >
            <component
              :is="benefit.icon"
              aria-hidden="true"
              class="size-6 shrink-0 text-[var(--bookora-ink)]"
              :stroke-width="1.6"
            />
            <p class="text-xs leading-5">
              <strong class="block font-semibold">{{ benefit.title }}</strong>
              <span class="text-[var(--bookora-muted)]">{{
                benefit.description
              }}</span>
            </p>
          </div>
        </div>
      </div>

      <Carousel
        aria-label="Banner nổi bật"
        class="relative aspect-[16/9] min-h-0 overflow-hidden bg-[var(--bookora-cream)] xl:aspect-auto xl:min-h-full"
        :opts="carouselOptions"
        @init-api="setCarouselApi"
      >
        <CarouselContent data-testid="home-hero-track" class="-ml-0 h-full">
          <CarouselItem
            v-for="(banner, index) in banners"
            :key="banner.src"
            class="h-full pl-0"
            :aria-hidden="activeBannerIndex !== index"
          >
            <img
              :src="banner.src"
              :alt="activeBannerIndex === index ? banner.alt : ''"
              class="h-full w-full object-cover object-center"
              width="1674"
              height="941"
              :loading="index === 0 ? 'eager' : 'lazy'"
              :fetchpriority="index === 0 ? 'high' : 'auto'"
              draggable="false"
            />
          </CarouselItem>
        </CarouselContent>
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-20 bg-gradient-to-r from-[var(--bookora-cream)] via-[var(--bookora-cream)]/55 to-transparent xl:block"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[var(--bookora-cream)] via-[var(--bookora-cream)]/55 to-transparent sm:h-20 xl:hidden"
        />
        <button
          type="button"
          aria-label="Hiển thị banner trước"
          :disabled="activeBannerIndex === 0"
          class="absolute left-2 top-1/2 z-20 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/70 bg-white/45 text-[var(--bookora-green)] shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow,transform] duration-200 hover:scale-105 hover:border-white hover:bg-white/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 sm:left-3 sm:size-10"
          @click="showPreviousBanner"
        >
          <ChevronLeft aria-hidden="true" class="size-4" :stroke-width="2.2" />
        </button>
        <button
          type="button"
          aria-label="Hiển thị banner tiếp theo"
          :disabled="activeBannerIndex === banners.length - 1"
          class="absolute right-2 top-1/2 z-20 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/70 bg-white/45 text-[var(--bookora-green)] shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow,transform] duration-200 hover:scale-105 hover:border-white hover:bg-white/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 sm:right-3 sm:size-10"
          @click="showNextBanner"
        >
          <ChevronRight aria-hidden="true" class="size-4" :stroke-width="2.2" />
        </button>
      </Carousel>
    </div>

    <div
      aria-label="Chọn banner"
      class="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-0.5 lg:bottom-3 xl:left-[70.5%]"
      role="group"
    >
      <button
        v-for="(_, index) in banners"
        :key="index"
        type="button"
        class="group grid size-6 cursor-pointer place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] focus-visible:ring-offset-2"
        :aria-label="`Hiển thị banner ${index + 1}`"
        :aria-current="activeBannerIndex === index ? 'true' : undefined"
        @click="selectBanner(index)"
      >
        <span
          aria-hidden="true"
          class="h-1.5 rounded-full shadow-sm transition-[width,background-color] duration-200 motion-reduce:transition-none"
          :class="
            activeBannerIndex === index
              ? 'w-5 bg-[var(--bookora-green)]'
              : 'w-1.5 bg-background/90 group-hover:bg-background'
          "
        />
      </button>
    </div>
  </section>
</template>
