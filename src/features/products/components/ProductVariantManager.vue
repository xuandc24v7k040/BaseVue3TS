<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { Check, Plus, RefreshCcw, Save, Star, Trash2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { CreateProductVariantDto, ProductVariantResponseDto, VariantPreviewItemResponseDto } from '@/api/generated/models'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import MasterDataDeleteDialog from '@/features/product-master-data/components/MasterDataDeleteDialog.vue'
import {
  productOptionsList,
  productVariantsBulkCreate,
  productVariantsCreate,
  productVariantsDelete,
  productVariantsGeneratePreview,
  productVariantsList,
  productVariantsSetDefault,
  productVariantsUpdate,
} from '../api/product-api'
import { productKeys } from '../api/product-query-keys'
import { productErrorMessage } from '../utils/product-errors'
import { formatVnd } from '../utils/product-money'
import VndMoneyInput from './VndMoneyInput.vue'

const props = defineProps<{ productId: string }>()
const client = useQueryClient()
const pending = ref(false)
const generatingPreview = ref(false)
const previewState = ref<'CLOSED' | 'LOADING' | 'READY' | 'ERROR'>('CLOSED')
const previewError = ref('')
const preview = ref<VariantPreviewItemResponseDto[]>([])
const selectedKeys = ref<string[]>([])
const deleteTarget = ref<ProductVariantResponseDto | null>(null)
const deleteOpen = ref(false)

type VariantDraft = {
  name: string
  sku: string
  barcode: string
  isbn: string
  publicationYear: string
  pageCount: string
  weightGram: string
  packageSize: string
  originalPrice: string
  salePrice: string
  saleStartAt: string
  saleEndAt: string
  isDefault: boolean
  isActive: boolean
}

const emptyDraft = (name = '', sku = ''): VariantDraft => ({
  name, sku, barcode: '', isbn: '', publicationYear: '', pageCount: '', weightGram: '', packageSize: '',
  originalPrice: '', salePrice: '', saleStartAt: '', saleEndAt: '', isDefault: false, isActive: true,
})
const singleDraft = reactive<VariantDraft>({ ...emptyDraft('Mặc định'), isDefault: true })
const bulkDefaults = reactive({ skuPrefix: 'BOOK', originalPrice: '', salePrice: '', isActive: true })
const bulkDrafts = reactive<Record<string, VariantDraft>>({})
const editDrafts = reactive<Record<string, VariantDraft>>({})

const optionsQuery = useQuery({
  queryKey: computed(() => productKeys.options(props.productId)),
  queryFn: ({ signal }) => productOptionsList(props.productId, undefined, signal),
})
const variantsQuery = useQuery({
  queryKey: computed(() => productKeys.variants(props.productId)),
  queryFn: ({ signal }) => productVariantsList(props.productId, undefined, signal),
})
const options = computed(() => optionsQuery.data.value?.data ?? [])
const variants = computed(() => variantsQuery.data.value?.data ?? [])
const hasOptions = computed(() => options.value.length > 0)
const creatablePreview = computed(() => preview.value.filter((item) => !item.exists))
const selectedPreview = computed(() => creatablePreview.value.filter((item) => selectedKeys.value.includes(item.combinationKey)))
const deleteBlockedReason = computed(() => deleteTarget.value?.isDefault ? 'Không thể xóa biến thể mặc định. Hãy đặt một biến thể khác làm mặc định trước.' : undefined)

watch(variants, (items) => {
  items.forEach((variant) => {
    editDrafts[variant.id] = {
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode ?? '',
      isbn: variant.isbn ?? '',
      publicationYear: variant.publicationYear === null || variant.publicationYear === undefined ? '' : String(variant.publicationYear),
      pageCount: variant.pageCount === null || variant.pageCount === undefined ? '' : String(variant.pageCount),
      weightGram: variant.weightGram === null || variant.weightGram === undefined ? '' : String(variant.weightGram),
      packageSize: variant.packageSize ?? '',
      originalPrice: variant.originalPrice,
      salePrice: variant.salePrice ?? '',
      saleStartAt: variant.saleStartAt?.slice(0, 16) ?? '',
      saleEndAt: variant.saleEndAt?.slice(0, 16) ?? '',
      isDefault: variant.isDefault,
      isActive: variant.isActive,
    }
  })
}, { immediate: true })

watch(creatablePreview, (items) => {
  const allowed = new Set(items.map((item) => item.combinationKey))
  selectedKeys.value = selectedKeys.value.filter((key) => allowed.has(key))
  items.forEach((item, index) => {
    bulkDrafts[item.combinationKey] ??= {
      ...emptyDraft(item.label, `${bulkDefaults.skuPrefix}-${String(index + 1).padStart(3, '0')}`),
      originalPrice: bulkDefaults.originalPrice, salePrice: bulkDefaults.salePrice, isActive: bulkDefaults.isActive,
    }
  })
})

function normalizeSku(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9._/-]/g, '')
}

function togglePreview(item: VariantPreviewItemResponseDto, checked: boolean | 'indeterminate') {
  const index = selectedKeys.value.indexOf(item.combinationKey)
  if (checked === true && index < 0) selectedKeys.value.push(item.combinationKey)
  if (checked !== true && index >= 0) selectedKeys.value.splice(index, 1)
}

function setBulkDefault(combinationKey: string, checked: boolean | 'indeterminate') {
  Object.values(bulkDrafts).forEach((draft) => { draft.isDefault = false })
  const selected = bulkDrafts[combinationKey]
  if (selected) selected.isDefault = checked === true
}

async function refresh() {
  await Promise.all([
    client.invalidateQueries({ queryKey: productKeys.variants(props.productId) }),
    client.invalidateQueries({ queryKey: productKeys.options(props.productId) }),
    client.invalidateQueries({ queryKey: productKeys.detail(props.productId) }),
    client.invalidateQueries({ queryKey: productKeys.lists() }),
  ])
}

function toPayload(draft: VariantDraft, optionValueIds: string[]): CreateProductVariantDto {
  const timestamp = (value: string) => value ? new Date(value).toISOString() : null
  const integer = (value: string) => value === '' ? null : Number(value)
  return {
    name: draft.name.trim(),
    sku: normalizeSku(draft.sku),
    barcode: draft.barcode.trim() || null,
    isbn: draft.isbn.trim() || null,
    publicationYear: integer(draft.publicationYear),
    pageCount: integer(draft.pageCount),
    weightGram: integer(draft.weightGram),
    packageSize: draft.packageSize.trim() || null,
    originalPrice: draft.originalPrice || '0',
    salePrice: draft.salePrice || null,
    saleStartAt: timestamp(draft.saleStartAt),
    saleEndAt: timestamp(draft.saleEndAt),
    isDefault: draft.isDefault,
    isActive: draft.isActive,
    optionValueIds,
  }
}

function validateDraft(draft: VariantDraft): string | null {
  if (!draft.name.trim() || !draft.sku.trim()) return 'Vui lòng nhập tên và SKU biến thể.'
  if (!draft.originalPrice) return 'Vui lòng nhập giá bán gốc.'
  if (draft.salePrice && BigInt(draft.salePrice) > BigInt(draft.originalPrice)) return 'Giá khuyến mãi không được lớn hơn giá bán gốc.'
  if (!draft.salePrice && (draft.saleStartAt || draft.saleEndAt)) return 'Chỉ đặt lịch khi có giá khuyến mãi.'
  if (Boolean(draft.saleStartAt) !== Boolean(draft.saleEndAt)) return 'Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc khuyến mãi.'
  if (draft.saleStartAt && draft.saleEndAt && new Date(draft.saleStartAt) >= new Date(draft.saleEndAt)) return 'Thời gian kết thúc khuyến mãi phải sau thời gian bắt đầu.'
  return null
}

async function createSingle() {
  const validationError = validateDraft(singleDraft)
  if (validationError) { toast.error(validationError); return }
  if (pending.value) return
  pending.value = true
  try {
    await productVariantsCreate(props.productId, toPayload(singleDraft, []))
    Object.assign(singleDraft, { ...emptyDraft('Mặc định'), isDefault: true })
    await refresh()
    toast.success('Tạo biến thể mặc định thành công.')
  } catch (error) {
    toast.error(productErrorMessage(error, 'Không thể tạo biến thể.'))
  } finally { pending.value = false }
}

async function generatePreview() {
  if (generatingPreview.value || pending.value) return
  generatingPreview.value = true
  previewState.value = 'LOADING'
  previewError.value = ''
  try {
    const response = await productVariantsGeneratePreview(props.productId)
    preview.value = response.data.combinations
    selectedKeys.value = response.data.combinations.filter((item) => !item.exists).map((item) => item.combinationKey)
    previewState.value = 'READY'
  } catch (error) {
    previewError.value = productErrorMessage(error, 'Không thể tạo ma trận biến thể.')
    previewState.value = 'ERROR'
  } finally { generatingPreview.value = false }
}

async function cancelPreview(returnFocus = true) {
  preview.value = []
  selectedKeys.value = []
  Object.keys(bulkDrafts).forEach((key) => delete bulkDrafts[key])
  Object.assign(bulkDefaults, { skuPrefix: 'BOOK', originalPrice: '', salePrice: '', isActive: true })
  previewError.value = ''
  previewState.value = 'CLOSED'
  if (returnFocus) {
    await nextTick()
    document.getElementById('product-matrix-trigger')?.focus()
  }
}

function applyDefaults() {
  creatablePreview.value.forEach((item, index) => {
    const draft = bulkDrafts[item.combinationKey]
    if (!draft) return
    draft.sku = `${normalizeSku(bulkDefaults.skuPrefix) || 'BOOK'}-${String(index + 1).padStart(3, '0')}`
    draft.originalPrice = bulkDefaults.originalPrice
    draft.salePrice = bulkDefaults.salePrice
    draft.isActive = bulkDefaults.isActive
  })
}

async function createBulk() {
  const items = selectedPreview.value
  if (items.length === 0) return
  const validationError = items.map((item) => validateDraft(bulkDrafts[item.combinationKey]!)).find(Boolean)
  if (validationError) { toast.error(validationError); return }
  pending.value = true
  try {
    await productVariantsBulkCreate(props.productId, {
      variants: items.map((item) => toPayload(bulkDrafts[item.combinationKey]!, item.optionValueIds)),
    })
    await cancelPreview(false)
    await refresh()
    toast.success(`Đã tạo ${items.length} biến thể.`)
  } catch (error) {
    toast.error(productErrorMessage(error, 'Không thể tạo hàng loạt biến thể.'))
  } finally { pending.value = false }
}

async function saveVariant(variant: ProductVariantResponseDto) {
  const draft = editDrafts[variant.id]
  if (!draft || pending.value) return
  const validationError = validateDraft(draft)
  if (validationError) { toast.error(validationError); return }
  pending.value = true
  try {
    await productVariantsUpdate(props.productId, variant.id, {
      name: draft.name.trim(),
      sku: normalizeSku(draft.sku),
      barcode: draft.barcode.trim() || null,
      isbn: draft.isbn.trim() || null,
      publicationYear: draft.publicationYear === '' ? null : Number(draft.publicationYear),
      pageCount: draft.pageCount === '' ? null : Number(draft.pageCount),
      weightGram: draft.weightGram === '' ? null : Number(draft.weightGram),
      packageSize: draft.packageSize.trim() || null,
      originalPrice: draft.originalPrice,
      salePrice: draft.salePrice || null,
      saleStartAt: draft.saleStartAt ? new Date(draft.saleStartAt).toISOString() : null,
      saleEndAt: draft.saleEndAt ? new Date(draft.saleEndAt).toISOString() : null,
      isActive: draft.isActive,
    })
    await refresh()
    toast.success('Cập nhật biến thể thành công.')
  } catch (error) {
    toast.error(productErrorMessage(error, 'Không thể cập nhật biến thể.'))
  } finally { pending.value = false }
}

async function setDefault(variant: ProductVariantResponseDto) {
  if (pending.value) return
  pending.value = true
  try {
    await productVariantsSetDefault(props.productId, variant.id)
    await refresh()
    toast.success('Đã đặt biến thể mặc định.')
  } catch (error) {
    toast.error(productErrorMessage(error, 'Không thể đặt biến thể mặc định.'))
  } finally { pending.value = false }
}

async function confirmDelete() {
  if (!deleteTarget.value || deleteBlockedReason.value || pending.value) return
  pending.value = true
  try {
    await productVariantsDelete(props.productId, deleteTarget.value.id)
    deleteOpen.value = false
    await refresh()
    toast.success('Xóa biến thể thành công.')
  } catch (error) {
    toast.error(productErrorMessage(error, 'Không thể xóa biến thể.'))
  } finally { pending.value = false }
}

function askDeleteVariant(variant: ProductVariantResponseDto): void {
  deleteTarget.value = variant
  deleteOpen.value = true
}
</script>

<template>
  <section class="space-y-4" aria-labelledby="variants-heading">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="variants-heading" class="text-lg font-semibold">Biến thể bán hàng</h2>
        <p class="text-sm text-muted-foreground">SKU và giá được quản lý tại biến thể; tiền VND luôn là số nguyên.</p>
      </div>
      <Button v-if="hasOptions && previewState === 'CLOSED'" id="product-matrix-trigger" type="button" variant="outline" :disabled="pending || options.some((option) => option.values.length === 0)" @click="generatePreview">
        <RefreshCcw class="mr-2 h-4 w-4" />Tạo ma trận
      </Button>
    </div>

    <Card v-if="!hasOptions && variants.length === 0">
      <CardHeader><CardTitle class="text-base">Biến thể mặc định</CardTitle></CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input v-model="singleDraft.name" placeholder="Tên biến thể" />
          <Input :model-value="singleDraft.sku" placeholder="SKU *" @update:model-value="singleDraft.sku = normalizeSku(String($event))" />
          <Input v-model="singleDraft.isbn" placeholder="ISBN" />
          <Input v-model="singleDraft.barcode" placeholder="Barcode" />
          <Input v-model="singleDraft.publicationYear" type="number" min="0" max="9999" placeholder="Năm xuất bản" />
          <Input v-model="singleDraft.pageCount" type="number" min="0" placeholder="Số trang" />
          <Input v-model="singleDraft.weightGram" type="number" min="0" placeholder="Khối lượng (gram)" />
          <Input v-model="singleDraft.packageSize" placeholder="Kích thước đóng gói" />
          <VndMoneyInput v-model="singleDraft.originalPrice" placeholder="Giá gốc *" />
          <VndMoneyInput v-model="singleDraft.salePrice" placeholder="Giá khuyến mãi" />
          <Input v-model="singleDraft.saleStartAt" type="datetime-local" aria-label="Bắt đầu khuyến mãi" />
          <Input v-model="singleDraft.saleEndAt" type="datetime-local" aria-label="Kết thúc khuyến mãi" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3"><label class="flex items-center gap-2 text-sm"><Checkbox v-model="singleDraft.isActive" />Đang bán</label><Button :disabled="pending" @click="createSingle"><Plus class="mr-2 h-4 w-4" />Tạo biến thể mặc định</Button></div>
      </CardContent>
    </Card>

    <Card v-if="previewState === 'LOADING'">
      <CardContent class="flex items-center gap-2 p-5 text-sm text-muted-foreground"><RefreshCcw class="h-4 w-4 animate-spin" />Đang tạo ma trận biến thể...</CardContent>
    </Card>

    <Card v-else-if="previewState === 'ERROR'" class="border-destructive/40">
      <CardContent class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><p class="text-sm text-destructive">{{ previewError }}</p><div class="flex gap-2"><Button type="button" size="sm" variant="outline" @click="cancelPreview()">Đóng</Button><Button type="button" size="sm" @click="generatePreview"><RefreshCcw class="mr-2 h-4 w-4" />Thử lại</Button></div></CardContent>
    </Card>

    <Card v-else-if="previewState === 'READY'">
      <CardHeader class="flex-row flex-wrap items-center justify-between gap-3"><CardTitle class="text-base">Ma trận dự kiến ({{ preview.length }})</CardTitle><Button type="button" size="sm" variant="outline" @click="cancelPreview()"><X class="mr-2 h-4 w-4" />Hủy tạo ma trận</Button></CardHeader>
      <CardContent class="space-y-4">
        <p v-if="preview.length === 0" class="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Chưa có tổ hợp nào để tạo. Hãy kiểm tra các lựa chọn và giá trị.</p>
        <p v-else-if="creatablePreview.length === 0" class="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Tất cả tổ hợp đã có biến thể.</p>
        <div class="grid gap-3 rounded-lg bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input v-model="bulkDefaults.skuPrefix" placeholder="Tiền tố SKU" />
          <VndMoneyInput v-model="bulkDefaults.originalPrice" placeholder="Giá gốc chung" />
          <VndMoneyInput v-model="bulkDefaults.salePrice" placeholder="Giá bán chung" />
          <label class="flex items-center gap-2 text-sm"><Checkbox v-model="bulkDefaults.isActive" />Đang bán</label>
          <Button type="button" variant="outline" @click="applyDefaults"><Check class="mr-2 h-4 w-4" />Áp dụng chung</Button>
        </div>
        <ScrollArea v-if="preview.length" scrollbar-orientation="horizontal" class="hidden w-full md:block">
          <table class="w-full min-w-[1500px] text-sm">
            <thead><tr class="border-b text-left text-muted-foreground"><th class="p-2">Chọn</th><th class="p-2">Tổ hợp</th><th class="p-2">Tên</th><th class="p-2">SKU</th><th class="p-2">Giá gốc</th><th class="p-2">Giá khuyến mãi</th><th class="p-2">Bắt đầu</th><th class="p-2">Kết thúc</th><th class="p-2">ISBN</th><th class="p-2">Barcode</th><th class="p-2">Kích hoạt</th><th class="p-2">Mặc định</th></tr></thead>
            <tbody>
              <tr v-for="item in preview" :key="item.combinationKey" class="border-b last:border-0" :class="item.exists ? 'opacity-60' : ''">
                <td class="p-2"><Checkbox v-if="!item.exists" :model-value="selectedKeys.includes(item.combinationKey)" @update:model-value="togglePreview(item, $event)" /><Badge v-else variant="secondary">Đã có</Badge></td>
                <td class="p-2 font-medium">{{ item.label }}</td>
                <template v-if="!item.exists && bulkDrafts[item.combinationKey]">
                  <td class="p-2"><Input v-model="bulkDrafts[item.combinationKey]!.name" /></td>
                  <td class="p-2"><Input :model-value="bulkDrafts[item.combinationKey]!.sku" @update:model-value="bulkDrafts[item.combinationKey]!.sku = normalizeSku(String($event))" /></td>
                  <td class="p-2"><VndMoneyInput v-model="bulkDrafts[item.combinationKey]!.originalPrice" /></td>
                  <td class="p-2"><VndMoneyInput v-model="bulkDrafts[item.combinationKey]!.salePrice" /></td>
                  <td class="p-2"><Input v-model="bulkDrafts[item.combinationKey]!.saleStartAt" type="datetime-local" /></td>
                  <td class="p-2"><Input v-model="bulkDrafts[item.combinationKey]!.saleEndAt" type="datetime-local" /></td>
                  <td class="p-2"><Input v-model="bulkDrafts[item.combinationKey]!.isbn" /></td>
                  <td class="p-2"><Input v-model="bulkDrafts[item.combinationKey]!.barcode" /></td>
                  <td class="p-2"><Checkbox v-model="bulkDrafts[item.combinationKey]!.isActive" /></td>
                  <td class="p-2"><Checkbox :model-value="bulkDrafts[item.combinationKey]!.isDefault" @update:model-value="setBulkDefault(item.combinationKey, $event)" /></td>
                </template>
                <td v-else colspan="10" />
              </tr>
            </tbody>
          </table>
        </ScrollArea>
        <div v-if="preview.length" class="space-y-3 md:hidden">
          <article v-for="item in preview" :key="item.combinationKey" class="space-y-3 rounded-lg border p-3" :class="item.exists ? 'opacity-70' : ''">
            <div class="flex items-start justify-between gap-2"><div class="min-w-0"><h4 class="font-medium">{{ item.label }}</h4><p class="text-xs text-muted-foreground">{{ item.exists ? 'Biến thể đã tồn tại' : 'Tổ hợp mới' }}</p></div><Checkbox v-if="!item.exists" :model-value="selectedKeys.includes(item.combinationKey)" aria-label="Chọn tổ hợp" @update:model-value="togglePreview(item, $event)" /><Badge v-else variant="secondary">Đã có</Badge></div>
            <div v-if="!item.exists && bulkDrafts[item.combinationKey]" class="grid gap-3">
              <label class="space-y-1 text-xs text-muted-foreground">Tên<Input v-model="bulkDrafts[item.combinationKey]!.name" /></label>
              <label class="space-y-1 text-xs text-muted-foreground">SKU<Input :model-value="bulkDrafts[item.combinationKey]!.sku" @update:model-value="bulkDrafts[item.combinationKey]!.sku = normalizeSku(String($event))" /></label>
              <div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-xs text-muted-foreground">Giá gốc<VndMoneyInput v-model="bulkDrafts[item.combinationKey]!.originalPrice" /></label><label class="space-y-1 text-xs text-muted-foreground">Giá khuyến mãi<VndMoneyInput v-model="bulkDrafts[item.combinationKey]!.salePrice" /></label></div>
              <div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-xs text-muted-foreground">Bắt đầu<Input v-model="bulkDrafts[item.combinationKey]!.saleStartAt" type="datetime-local" /></label><label class="space-y-1 text-xs text-muted-foreground">Kết thúc<Input v-model="bulkDrafts[item.combinationKey]!.saleEndAt" type="datetime-local" /></label></div>
              <div class="grid gap-3 sm:grid-cols-2"><label class="space-y-1 text-xs text-muted-foreground">ISBN<Input v-model="bulkDrafts[item.combinationKey]!.isbn" /></label><label class="space-y-1 text-xs text-muted-foreground">Barcode<Input v-model="bulkDrafts[item.combinationKey]!.barcode" /></label></div>
              <div class="flex flex-wrap gap-4"><label class="flex items-center gap-2 text-sm"><Checkbox v-model="bulkDrafts[item.combinationKey]!.isActive" />Đang bán</label><label class="flex items-center gap-2 text-sm"><Checkbox :model-value="bulkDrafts[item.combinationKey]!.isDefault" @update:model-value="setBulkDefault(item.combinationKey, $event)" />Mặc định</label></div>
            </div>
          </article>
        </div>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" @click="cancelPreview()">Hủy</Button><Button type="button" :disabled="pending || selectedPreview.length === 0" @click="createBulk"><Plus class="mr-2 h-4 w-4" />Tạo {{ selectedPreview.length }} biến thể</Button></div>
      </CardContent>
    </Card>

    <p v-if="variantsQuery.isPending.value" class="text-sm text-muted-foreground">Đang tải biến thể...</p>
    <p v-else-if="variants.length === 0" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Chưa có biến thể bán hàng.</p>
    <div v-else class="space-y-3">
      <Card v-for="variant in variants" :key="variant.id">
        <CardContent v-if="editDrafts[variant.id]" class="space-y-3 p-4">
          <div class="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
            <div><div class="mb-1 flex items-center gap-2"><span class="text-xs text-muted-foreground">Tên / lựa chọn</span><Badge v-if="variant.isDefault"><Star class="mr-1 h-3 w-3" />Mặc định</Badge></div><Input v-model="editDrafts[variant.id]!.name" /><p class="mt-1 text-xs text-muted-foreground">{{ variant.optionValues.map((item) => item.label).join(' · ') || 'Không có lựa chọn' }}</p></div>
            <div><span class="text-xs text-muted-foreground">SKU</span><Input :model-value="editDrafts[variant.id]!.sku" @update:model-value="editDrafts[variant.id]!.sku = normalizeSku(String($event))" /></div>
            <div><span class="text-xs text-muted-foreground">Giá gốc</span><VndMoneyInput v-model="editDrafts[variant.id]!.originalPrice" /><p class="mt-1 text-xs text-muted-foreground">{{ formatVnd(variant.originalPrice) }}</p></div>
            <div><span class="text-xs text-muted-foreground">Giá khuyến mãi</span><VndMoneyInput v-model="editDrafts[variant.id]!.salePrice" /></div>
            <div class="flex items-center justify-end gap-1"><label class="mr-2 flex items-center gap-2 text-xs"><Checkbox v-model="editDrafts[variant.id]!.isActive" />Bán</label><Button type="button" size="icon-sm" variant="ghost" aria-label="Lưu biến thể" :disabled="pending" @click="saveVariant(variant)"><Save class="h-4 w-4" /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Đặt mặc định" :disabled="pending || variant.isDefault || !editDrafts[variant.id]!.isActive" @click="setDefault(variant)"><Star class="h-4 w-4" /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Xóa biến thể" :title="variant.isDefault ? 'Xem lý do không thể xóa' : 'Xóa biến thể'" :disabled="pending" @click="askDeleteVariant(variant)"><Trash2 class="h-4 w-4" /></Button></div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><Input v-model="editDrafts[variant.id]!.isbn" placeholder="ISBN" /><Input v-model="editDrafts[variant.id]!.barcode" placeholder="Barcode" /><Input v-model="editDrafts[variant.id]!.publicationYear" type="number" min="0" max="9999" placeholder="Năm xuất bản" /><Input v-model="editDrafts[variant.id]!.pageCount" type="number" min="0" placeholder="Số trang" /><Input v-model="editDrafts[variant.id]!.weightGram" type="number" min="0" placeholder="Gram" /><Input v-model="editDrafts[variant.id]!.packageSize" placeholder="Kích thước" /><Input v-model="editDrafts[variant.id]!.saleStartAt" type="datetime-local" aria-label="Bắt đầu khuyến mãi" /><Input v-model="editDrafts[variant.id]!.saleEndAt" type="datetime-local" aria-label="Kết thúc khuyến mãi" /></div>
        </CardContent>
      </Card>
    </div>
  </section>
  <MasterDataDeleteDialog v-model:open="deleteOpen" :name="deleteTarget?.name ?? ''" :title="deleteBlockedReason ? 'Không thể xóa' : 'Xóa biến thể?'" description="Biến thể đã phát sinh dữ liệu nghiệp vụ sẽ được backend chặn an toàn." :blocked-reason="deleteBlockedReason" :pending="pending" @confirm="confirmDelete" />
</template>
