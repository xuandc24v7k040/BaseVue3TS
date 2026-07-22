<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { ArrowLeft, Edit3, RefreshCcw } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { productKeys } from '../api/product-query-keys'
import { productOptionsList, productsGet, productsUpdateStatus, productVariantsList } from '../api/product-api'
import { productErrorMessage, productReadErrorMessage } from '../utils/product-errors'
import { formatVnd } from '../utils/product-money'
import { formatProductDate } from '../utils/product-date'
import ProductMediaSection from '../media/components/ProductMediaSection.vue'
import { useBranchStore } from '@/stores/branch.store'

const route = useRoute()
const router = useRouter()
const branchStore = useBranchStore()
const client = useQueryClient()
const id = computed(() => String(route.params.id))
const pendingStatus = ref(false)
const isBranchRoute = computed(() => String(route.name).startsWith('branch-admin'))
const readRequest = computed(() => isBranchRoute.value ? { branchScoped: true } as const : undefined)
const authScope = computed(() => isBranchRoute.value ? branchStore.selectedBranchId ?? 'no-branch' : 'global')
const listRouteName = computed(() => isBranchRoute.value ? 'branch-admin-products' : 'super-admin-products')
const isValidProductId = computed(() => z.ulid().safeParse(id.value).success)
const branchContextReady = computed(() => !isBranchRoute.value || Boolean(branchStore.selectedBranchId))
const canLoadProduct = computed(() => isValidProductId.value && branchContextReady.value)

const detailQuery = useQuery({ queryKey: computed(() => [...productKeys.detail(id.value), authScope.value]), queryFn: ({ signal }) => productsGet(id.value, readRequest.value, signal), enabled: canLoadProduct })
const optionsQuery = useQuery({ queryKey: computed(() => [...productKeys.options(id.value), authScope.value]), queryFn: ({ signal }) => productOptionsList(id.value, readRequest.value, signal), enabled: canLoadProduct })
const variantsQuery = useQuery({ queryKey: computed(() => [...productKeys.variants(id.value), authScope.value]), queryFn: ({ signal }) => productVariantsList(id.value, readRequest.value, signal), enabled: canLoadProduct })
const product = computed(() => detailQuery.data.value?.data)
const options = computed(() => optionsQuery.data.value?.data ?? [])
const variants = computed(() => variantsQuery.data.value?.data ?? [])
const loadErrorMessage = computed(() => productReadErrorMessage(detailQuery.error.value, 'Không thể tải chi tiết sản phẩm.'))

const statusLabels = { DRAFT: 'Nháp', ACTIVE: 'Đang bán', INACTIVE: 'Tạm ngưng', DISCONTINUED: 'Ngừng kinh doanh' } as const
const statusVariants = { DRAFT: 'secondary', ACTIVE: 'default', INACTIVE: 'outline', DISCONTINUED: 'destructive' } as const
const configurationLabels = { SIMPLE: 'Sản phẩm đơn', OPTIONED: 'Sản phẩm có lựa chọn', UNCONFIGURED: 'Chưa cấu hình' } as const

function displayValue(value: string | number | boolean | string[], type: string) {
  if (type === 'DATE' && typeof value === 'string') return formatProductDate(value)
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  return String(value)
}

async function changeStatus(status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED') {
  if (!product.value || pendingStatus.value || product.value.status === status) return
  pendingStatus.value = true
  try {
    await productsUpdateStatus(id.value, { status })
    await Promise.all([
      client.invalidateQueries({ queryKey: productKeys.detail(id.value) }),
      client.invalidateQueries({ queryKey: productKeys.lists() }),
    ])
    toast.success('Cập nhật trạng thái sản phẩm thành công.')
  } catch (error) {
    toast.error(productErrorMessage(error, status === 'ACTIVE' ? 'Chưa thể kích hoạt. Hãy hoàn thiện biến thể mặc định, danh mục và hình ảnh.' : 'Không thể cập nhật trạng thái.'))
  } finally { pendingStatus.value = false }
}
</script>

<template>
  <div class="space-y-6">
    <AdminBreadcrumb group-label="Quản lý" :group-to="{ name: 'admin-home' }" section-label="Sản phẩm" :section-to="{ name: listRouteName }" :current-label="product?.name ?? 'Chi tiết'" :loading="detailQuery.isPending.value" />
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><div class="flex flex-wrap items-center gap-2"><h1 class="text-2xl font-semibold tracking-tight">{{ product?.name ?? 'Chi tiết sản phẩm' }}</h1><Badge v-if="product" :variant="statusVariants[product.status]">{{ statusLabels[product.status] }}</Badge></div><p v-if="product" class="mt-1 text-sm text-muted-foreground">{{ product.slug }}</p></div>
      <div class="flex gap-2"><Button variant="outline" @click="router.push({ name: listRouteName })"><ArrowLeft class="mr-2 h-4 w-4" />Danh sách</Button><PermissionGate v-if="!isBranchRoute" :all-of="[ADMIN_PERMISSIONS.PRODUCTS_UPDATE]"><Button @click="router.push({ name: 'super-admin-product-edit', params: { id } })"><Edit3 class="mr-2 h-4 w-4" />Chỉnh sửa</Button></PermissionGate></div>
    </div>

    <p v-if="detailQuery.isPending.value" class="text-sm text-muted-foreground">Đang tải sản phẩm...</p>
    <p v-else-if="detailQuery.isError.value || !product" class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{{ loadErrorMessage }}</p>
    <template v-else>
      <Card>
        <CardHeader class="flex-row flex-wrap items-center justify-between gap-3"><CardTitle>Trạng thái kinh doanh</CardTitle><PermissionGate v-if="!isBranchRoute" :all-of="[ADMIN_PERMISSIONS.PRODUCTS_PUBLISH]"><div class="flex flex-wrap gap-2"><Button size="sm" variant="outline" :disabled="pendingStatus" @click="changeStatus('DRAFT')">Nháp</Button><Button size="sm" variant="outline" :disabled="pendingStatus" @click="changeStatus('INACTIVE')">Tạm ngưng</Button><Button size="sm" variant="outline" :disabled="pendingStatus" @click="changeStatus('DISCONTINUED')">Ngừng bán</Button><Button size="sm" :disabled="pendingStatus" @click="changeStatus('ACTIVE')"><RefreshCcw class="mr-2 h-4 w-4" />Kích hoạt</Button></div></PermissionGate></CardHeader>
        <CardContent><p class="text-sm text-muted-foreground">Kích hoạt yêu cầu ít nhất một biến thể đang bán, đúng cấu hình lựa chọn, có biến thể mặc định, giá hợp lệ, danh mục và đúng một ảnh đại diện cho mỗi bộ sưu tập ảnh đang dùng.</p></CardContent>
      </Card>

      <div class="grid gap-6 xl:grid-cols-3">
        <Card class="xl:col-span-2"><CardHeader><CardTitle>Tổng quan</CardTitle></CardHeader><CardContent class="grid gap-4 sm:grid-cols-2"><div><p class="text-xs text-muted-foreground">Nhà cung cấp</p><p class="font-medium">{{ product.supplier?.name ?? '—' }}</p></div><div><p class="text-xs text-muted-foreground">Nhà xuất bản</p><p class="font-medium">{{ product.publisher?.name ?? '—' }}</p></div><div><p class="text-xs text-muted-foreground">Ngày phát hành</p><p class="font-medium">{{ formatProductDate(product.releaseDate) }}</p></div><div><p class="text-xs text-muted-foreground">Cấu hình</p><p class="font-medium">{{ configurationLabels[product.configuration] }}</p></div><div><p class="text-xs text-muted-foreground">Danh mục</p><p class="font-medium">{{ product.categories.map((item) => item.name).join(', ') || '—' }}</p></div><div><p class="text-xs text-muted-foreground">Tác giả</p><p class="font-medium">{{ product.authors.map((item) => item.name).join(', ') || '—' }}</p></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Giá & biến thể</CardTitle></CardHeader><CardContent class="space-y-3"><div><p class="text-xs text-muted-foreground">Khoảng giá</p><p class="text-lg font-semibold">{{ product.minPrice ? formatVnd(product.minPrice) : 'Chưa có giá' }}<span v-if="product.maxPrice && product.maxPrice !== product.minPrice"> – {{ formatVnd(product.maxPrice) }}</span></p></div><div class="grid grid-cols-2 gap-3"><div><p class="text-xs text-muted-foreground">Biến thể</p><p class="font-medium">{{ product.activeVariantCount }}/{{ product.variantCount }} đang bán</p></div><div><p class="text-xs text-muted-foreground">Lựa chọn</p><p class="font-medium">{{ product.optionCount }}</p></div></div><div><p class="text-xs text-muted-foreground">Mặc định</p><p class="font-medium">{{ product.defaultVariant?.name ?? 'Chưa chọn' }}</p><p v-if="product.defaultVariant" class="text-xs text-muted-foreground">{{ product.defaultVariant.sku }} · {{ formatVnd(product.defaultVariant.salePrice ?? product.defaultVariant.originalPrice) }}</p></div></CardContent></Card>
      </div>

      <Card v-if="product.shortDescription || product.description"><CardHeader><CardTitle>Mô tả</CardTitle></CardHeader><CardContent class="space-y-5"><p v-if="product.shortDescription" class="text-sm">{{ product.shortDescription }}</p><div v-if="product.description" class="prose prose-sm max-w-none dark:prose-invert" v-html="product.description" /></CardContent></Card>

      <ProductMediaSection
        :product-id="id"
        :branch-scoped="isBranchRoute"
        :authorization-scope="authScope"
        readonly
      />

      <Card><CardHeader><CardTitle>Thuộc tính mô tả</CardTitle></CardHeader><CardContent><dl v-if="product.attributeValues.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div v-for="item in product.attributeValues" :key="item.id" class="rounded-lg border p-3"><dt class="text-xs text-muted-foreground">{{ item.name }}</dt><dd class="font-medium">{{ displayValue(item.value, item.type) }}</dd></div></dl><p v-else class="text-sm text-muted-foreground">Chưa có thuộc tính mô tả.</p></CardContent></Card>

      <Card><CardHeader><CardTitle>Lựa chọn tạo biến thể</CardTitle></CardHeader><CardContent><div v-if="options.length" class="grid gap-3 md:grid-cols-2"><div v-for="option in options" :key="option.id" class="rounded-lg border p-3"><div class="flex flex-wrap items-center justify-between gap-2"><div class="font-medium">{{ option.name }} <span class="text-xs text-muted-foreground">({{ option.code }})</span></div><Badge variant="outline">{{ option.presentationType === 'COLOR' ? 'Màu sắc' : option.presentationType === 'IMAGE' ? 'Hình ảnh' : 'Văn bản' }}</Badge></div><div class="mt-2 flex flex-wrap gap-2"><Badge v-for="value in option.values" :key="value.id" variant="secondary" class="gap-1.5"><span v-if="option.presentationType === 'COLOR' && value.colorCode" class="h-3.5 w-3.5 rounded-full border" :style="{ backgroundColor: value.colorCode }" aria-hidden="true" /><img v-else-if="option.presentationType === 'IMAGE' && value.imageUrl" :src="value.imageUrl" :alt="`Ảnh ${value.label}`" class="h-5 w-5 rounded object-cover">{{ value.label }}</Badge></div></div></div><p v-else class="text-sm text-muted-foreground">Sản phẩm không có lựa chọn.</p></CardContent></Card>

      <Card><CardHeader><CardTitle>Danh sách biến thể</CardTitle></CardHeader><CardContent><ScrollArea v-if="variants.length" scrollbar-orientation="horizontal" class="hidden w-full md:block"><table class="w-full min-w-[760px] text-sm"><thead><tr class="border-b text-left text-muted-foreground"><th class="p-2">Tên</th><th class="p-2">SKU</th><th class="p-2">Tổ hợp</th><th class="p-2">Giá</th><th class="p-2">Trạng thái</th></tr></thead><tbody><tr v-for="variant in variants" :key="variant.id" class="border-b last:border-0"><td class="p-2 font-medium">{{ variant.name }} <Badge v-if="variant.isDefault" class="ml-1">Mặc định</Badge></td><td class="p-2 font-mono text-xs">{{ variant.sku }}</td><td class="p-2">{{ variant.optionValues.map((item) => item.label).join(' · ') || '—' }}</td><td class="p-2">{{ formatVnd(variant.salePrice ?? variant.originalPrice) }}</td><td class="p-2"><Badge :variant="variant.isActive ? 'default' : 'secondary'">{{ variant.isActive ? 'Đang bán' : 'Tạm tắt' }}</Badge></td></tr></tbody></table></ScrollArea><div v-if="variants.length" class="space-y-3 md:hidden"><article v-for="variant in variants" :key="variant.id" class="space-y-3 rounded-lg border p-3"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><h4 class="truncate font-medium">{{ variant.name }}</h4><p class="truncate font-mono text-xs text-muted-foreground">{{ variant.sku }}</p></div><Badge v-if="variant.isDefault">Mặc định</Badge></div><p class="text-sm text-muted-foreground">{{ variant.optionValues.map((item) => item.label).join(' · ') || 'Không có lựa chọn' }}</p><div class="flex items-center justify-between gap-2"><strong>{{ formatVnd(variant.salePrice ?? variant.originalPrice) }}</strong><Badge :variant="variant.isActive ? 'default' : 'secondary'">{{ variant.isActive ? 'Đang bán' : 'Tạm tắt' }}</Badge></div></article></div><p v-if="variants.length === 0" class="py-4 text-center text-sm text-muted-foreground">Chưa có biến thể.</p></CardContent></Card>
    </template>
  </div>
</template>
