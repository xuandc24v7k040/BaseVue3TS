<script setup lang="ts">
import BookSection from '@/components/client/home/BookSection.vue'
import HomeCategoryStrip from '@/components/client/home/HomeCategoryStrip.vue'
import HomeHero from '@/components/client/home/HomeHero.vue'
import MemberPromotionCard from '@/components/client/home/MemberPromotionCard.vue'
import UpcomingBooksSection from '@/components/client/home/UpcomingBooksSection.vue'
import {
  bestSellerBooks,
  homeCategories,
  newBooks,
  upcomingBooks,
} from '@/pages/app/home/home.mock'
</script>

<template>
  <div class="w-full min-w-0 max-w-full space-y-5">
    <HomeHero />
    <HomeCategoryStrip :categories="homeCategories" />

    <div class="grid min-w-0 max-w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <BookSection
        title="Sách bán chạy"
        :books="bestSellerBooks"
        view-all-href="/books?sort=best-selling"
        show-controls
      />
      <MemberPromotionCard />
    </div>

    <div class="grid min-w-0 max-w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <BookSection
        title="Sách mới"
        :books="newBooks"
        view-all-href="/books?sort=new"
      />
      <UpcomingBooksSection :books="upcomingBooks" />
    </div>
  </div>
</template>
