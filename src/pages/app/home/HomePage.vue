<script setup lang="ts">
import BookSection from '@/components/client/home/BookSection.vue'
import HomeCategoryStrip from '@/components/client/home/HomeCategoryStrip.vue'
import HomeHero from '@/components/client/home/HomeHero.vue'
import MemberPromotionCard from '@/components/client/home/MemberPromotionCard.vue'
import UpcomingBooksSection from '@/components/client/home/UpcomingBooksSection.vue'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useStorefrontCategoriesQuery, useStorefrontHomeQuery } from '@/features/storefront/api/storefront-api'

const categoriesQuery = useStorefrontCategoriesQuery()
const homeQuery = useStorefrontHomeQuery()
const categoryItems = computed(() => [
  ...(categoriesQuery.data.value ?? []).slice(0, 7),
  { id: 'all', name: 'Xem tất cả', slug: 'all', imageUrl: null, sortOrder: 999, children: [] },
])
</script>

<template>
  <div class="w-full min-w-0 max-w-full space-y-5">
    <HomeHero />
    <div v-if="categoriesQuery.isPending.value" class="grid grid-cols-4 gap-3 rounded-xl border bg-background p-4 lg:grid-cols-8">
      <Skeleton v-for="index in 8" :key="index" class="h-16" />
    </div>
    <HomeCategoryStrip v-else-if="categoryItems.length" :categories="categoryItems" />
    <div v-else class="rounded-xl border border-dashed bg-background p-6 text-center text-sm text-[var(--bookora-muted)]">
      Không thể tải danh mục.
      <Button type="button" variant="link" @click="categoriesQuery.refetch()">Thử lại</Button>
    </div>

    <div v-if="homeQuery.isPending.value" class="grid gap-5 xl:grid-cols-3">
      <Skeleton class="h-80 xl:col-span-2" /><Skeleton class="h-80" />
      <Skeleton class="h-80 xl:col-span-2" /><Skeleton class="h-80" />
    </div>
    <div v-else-if="homeQuery.data.value" class="space-y-5">
    <div class="grid min-w-0 max-w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <BookSection
        title="Sách bán chạy"
        :books="homeQuery.data.value.bestSellers"
        view-all-href="/books?sort=popular"
        show-controls
      />
      <MemberPromotionCard />
    </div>

    <div class="grid min-w-0 max-w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <BookSection
        title="Sách mới"
        :books="homeQuery.data.value.newest"
        view-all-href="/books?sort=newest"
      />
      <UpcomingBooksSection :books="homeQuery.data.value.upcoming" />
    </div>
    </div>
    <div v-else class="rounded-xl border border-dashed bg-background p-8 text-center">
      <p class="text-sm text-[var(--bookora-muted)]">Không thể tải sản phẩm trang chủ.</p>
      <Button type="button" class="mt-3" @click="homeQuery.refetch()">Thử lại</Button>
    </div>
  </div>
</template>
