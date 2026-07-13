<script setup lang="ts">
import {
  BookOpen,
  Heart,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BranchSelector from '@/components/client/layout/BranchSelector.vue'
import ClientBrand from '@/components/client/layout/ClientBrand.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { hasSessionHint } from '@/features/auth/session-hint'
import { useAuthStore } from '@/stores/auth.store'

interface HeaderCategory {
  name: string
  href: string
}

interface HeaderLink {
  label: string
  href: string
}

const categories: HeaderCategory[] = [
  { name: 'Văn học', href: '/books?category=van-hoc' },
  { name: 'Kinh tế', href: '/books?category=kinh-te' },
  { name: 'Kỹ năng sống', href: '/books?category=ky-nang-song' },
  { name: 'Thiếu nhi', href: '/books?category=thieu-nhi' },
  { name: 'Tâm lý', href: '/books?category=tam-ly' },
  { name: 'Khoa học', href: '/books?category=khoa-hoc' },
  { name: 'Lịch sử', href: '/books?category=lich-su' },
]

const navigationLinks: HeaderLink[] = [
  { label: 'Sách mới', href: '/books?sort=new' },
  { label: 'Sách bán chạy', href: '/books?sort=best-selling' },
  { label: 'Sách sắp phát hành', href: '/books?filter=upcoming' },
  { label: 'Tác giả', href: '/search?type=author' },
  { label: 'Nhà xuất bản', href: '/search?type=publisher' },
  { label: 'Khuyến mãi', href: '/books?filter=promotion' },
]

const router = useRouter()
const authStore = useAuthStore()
const searchQuery = ref('')
const showAccountSkeleton = computed(
  () => hasSessionHint()
    && authStore.status === 'unknown'
    && !authStore.bootstrapError,
)
const accountTarget = computed(() => {
  if (authStore.user?.type === 'CUSTOMER') return '/account'
  if (authStore.user?.type === 'SYSTEM') return '/super-admin/dashboard'
  if (authStore.user?.type === 'BRANCH') return '/branch-admin/dashboard'
  return '/login'
})
const accountPrimaryLabel = computed(() => authStore.user?.fullName || 'Đăng nhập')
const accountSecondaryLabel = computed(() => authStore.user ? (authStore.user.type === 'CUSTOMER' ? 'Tài khoản' : 'Quản trị') : 'Tài khoản')

function submitSearch(): void {
  const query = searchQuery.value.trim()
  if (!query) return

  void router.push({ path: '/search', query: { q: query } })
}
</script>

<template>
  <header class="bookora-client-theme border-b border-[var(--bookora-border)] bg-[var(--bookora-canvas)] text-[var(--bookora-ink)]">
    <div class="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
      <div class="hidden min-h-24 grid-cols-[210px_minmax(280px,1fr)_auto] items-center gap-7 lg:grid">
        <ClientBrand />

        <form role="search" class="flex min-w-0" @submit.prevent="submitSearch">
          <label for="desktop-book-search" class="sr-only">Tìm kiếm sách</label>
          <Input
            id="desktop-book-search"
            v-model="searchQuery"
            aria-label="Tìm kiếm sách"
            placeholder="Bạn đang tìm sách gì?"
            class="h-12 rounded-r-none border-[var(--bookora-border)] bg-background px-5 shadow-none focus-visible:z-10 focus-visible:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/20"
          />
          <Button
            type="submit"
            aria-label="Tìm kiếm"
            class="h-12 w-14 rounded-l-none bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
          >
            <Search aria-hidden="true" class="size-5" />
          </Button>
        </form>

        <div class="flex items-center gap-5">
          <div v-if="showAccountSkeleton" class="flex min-h-11 w-32 items-center gap-2" aria-label="Đang kiểm tra tài khoản">
            <Skeleton class="size-6 rounded-full" />
            <div class="space-y-1"><Skeleton class="h-4 w-20" /><Skeleton class="h-3 w-16" /></div>
          </div>
          <RouterLink
            v-else
            :to="accountTarget"
            class="flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          >
            <UserRound aria-hidden="true" class="size-6" :stroke-width="1.6" />
            <span>
              <span class="block max-w-32 truncate text-sm font-semibold">{{ accountPrimaryLabel }}</span>
              <span class="block text-xs text-[var(--bookora-muted)]">{{ accountSecondaryLabel }}</span>
            </span>
          </RouterLink>
          <RouterLink
            to="/account/favorites"
            class="flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          >
            <Heart aria-hidden="true" class="size-6" :stroke-width="1.6" />
            <span class="hidden xl:block">
              <span class="block text-sm font-semibold">Yêu thích</span>
              <span class="block text-xs text-[var(--bookora-muted)]">Danh sách yêu thích</span>
            </span>
          </RouterLink>
          <RouterLink
            to="/cart"
            class="relative flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          >
            <ShoppingCart aria-hidden="true" class="size-7" :stroke-width="1.6" />
            <Badge class="absolute -right-1 -top-1 size-5 rounded-full border-0 bg-red-500 p-0 text-[10px] text-white xl:right-10">2</Badge>
            <span class="hidden xl:block text-sm font-semibold">Giỏ hàng</span>
          </RouterLink>
        </div>
      </div>

      <div class="grid gap-3 py-3 lg:hidden">
        <div class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
          <Sheet>
            <SheetTrigger as-child>
              <Button type="button" variant="ghost" size="icon" aria-label="Mở menu">
                <Menu aria-hidden="true" class="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" class="bookora-client-theme border-[var(--bookora-border)] bg-[var(--bookora-cream)]">
              <SheetHeader class="text-left">
                <SheetTitle><ClientBrand /></SheetTitle>
                <SheetDescription>Khám phá sách và dịch vụ của Bookora.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menu di động" class="grid gap-1 px-4">
                <SheetClose as-child>
                  <RouterLink :to="accountTarget" class="rounded-md px-3 py-3 font-medium hover:bg-[var(--bookora-soft)]">{{ accountPrimaryLabel }}</RouterLink>
                </SheetClose>
                <SheetClose
                  v-for="link in navigationLinks"
                  :key="link.label"
                  as-child
                >
                  <RouterLink :to="link.href" class="rounded-md px-3 py-3 font-medium hover:bg-[var(--bookora-soft)]">
                    {{ link.label }}
                  </RouterLink>
                </SheetClose>
                <p class="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--bookora-muted)]">Danh mục</p>
                <SheetClose v-for="category in categories" :key="category.name" as-child>
                  <RouterLink :to="category.href" class="rounded-md px-3 py-2.5 text-sm hover:bg-[var(--bookora-soft)]">
                    {{ category.name }}
                  </RouterLink>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>

          <ClientBrand compact />

          <RouterLink to="/account/favorites" aria-label="Yêu thích" class="grid size-11 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]">
            <Heart aria-hidden="true" class="size-5.5" />
          </RouterLink>
          <RouterLink to="/cart" aria-label="Giỏ hàng, 2 sản phẩm" class="relative grid size-11 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]">
            <ShoppingCart aria-hidden="true" class="size-6" />
            <Badge class="absolute right-0 top-0 size-5 rounded-full border-0 bg-red-500 p-0 text-[10px] text-white">2</Badge>
          </RouterLink>
        </div>

        <form role="search" class="flex" @submit.prevent="submitSearch">
          <label for="mobile-book-search" class="sr-only">Tìm kiếm sách</label>
          <Input
            id="mobile-book-search"
            v-model="searchQuery"
            aria-label="Tìm kiếm sách"
            placeholder="Bạn đang tìm sách gì?"
            class="h-11 rounded-r-none border-[var(--bookora-border)] bg-background shadow-none focus-visible:z-10 focus-visible:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/20"
          />
          <Button type="submit" aria-label="Tìm kiếm" class="h-11 w-12 rounded-l-none bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]">
            <Search aria-hidden="true" class="size-5" />
          </Button>
        </form>

        <BranchSelector />
      </div>

      <div class="hidden min-h-16 items-center gap-6 border-t border-[var(--bookora-border)]/70 lg:flex">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button type="button" variant="ghost" class="gap-2 px-2 text-sm font-semibold hover:bg-[var(--bookora-soft)]">
              <Menu aria-hidden="true" class="size-5" />
              Danh mục
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="bookora-client-theme w-52 border-[var(--bookora-border)]">
            <DropdownMenuItem v-for="category in categories" :key="category.name" as-child>
              <RouterLink :to="category.href">
                <BookOpen aria-hidden="true" class="size-4 text-[var(--bookora-green)]" />
                {{ category.name }}
              </RouterLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <nav aria-label="Điều hướng mua sắm" class="flex min-w-0 flex-1 items-center justify-around gap-4">
          <RouterLink
            v-for="link in navigationLinks"
            :key="link.label"
            :to="link.href"
            class="whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold transition-colors hover:text-[var(--bookora-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          >
            {{ link.label }}
          </RouterLink>
        </nav>

        <BranchSelector />
      </div>
    </div>
  </header>
</template>
