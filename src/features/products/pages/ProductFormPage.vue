<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { ArrowLeft, Save } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import type { CategoryTreeNodeResponseDto, CreateProductDto } from '@/api/generated/models'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { listAuthors } from '@/features/authors/api/author-api'
import { listCategoryTree } from '@/features/categories/api/category-api'
import { productKeys } from '../api/product-query-keys'
import { productsCreate, productsGet, productsUpdate } from '../api/product-api'
import AsyncMasterDataCombobox from '../components/AsyncMasterDataCombobox.vue'
import ProductDescriptionEditor from '../components/ProductDescriptionEditor.vue'
import ProductOptionBuilder from '../components/ProductOptionBuilder.vue'
import ProductSelectedAttributes from '../components/ProductSelectedAttributes.vue'
import ProductVariantManager from '../components/ProductVariantManager.vue'
import ProductMediaSection from '../media/components/ProductMediaSection.vue'
import { toDateInputValue } from '../utils/product-date'
import { productErrorMessage, productFieldErrors } from '../utils/product-errors'
import { selectProductCategory, setProductPrimaryCategory, unselectProductCategory } from '../utils/product-primary-category'
import {
  defaultProductAttributeValue,
  serializeProductAttributeValues,
  type ProductAttributeDefinition,
  type ProductAttributeFormValue,
} from '../utils/product-attribute-values'

const route = useRoute()
const router = useRouter()
const client = useQueryClient()
const productId = computed(() => typeof route.params.id === 'string' ? route.params.id : null)
const isEdit = computed(() => productId.value !== null)
const pending = ref(false)
const hydrated = ref(false)
const hydrating = ref(false)
const dirty = ref(false)
const errors = reactive<Record<string, string>>({})
const mediaSection = ref<{ uploadQueued: () => Promise<void> } | null>(null)

type FormState = {
  name: string
  slug: string
  shortDescription: string
  description: string | null
  supplierId: string
  publisherId: string
  releaseDate: string
  categoryIds: string[]
  primaryCategoryId: string | null
  authorIds: string[]
  attributes: Record<string, ProductAttributeFormValue>
}

const form = reactive<FormState>({
  name: '', slug: '', shortDescription: '', description: null,
  supplierId: '', publisherId: '', releaseDate: '', categoryIds: [], primaryCategoryId: null, authorIds: [], attributes: {},
})
const selectedAttributes = ref<ProductAttributeDefinition[]>([])

const detailQuery = useQuery({
  queryKey: computed(() => productKeys.detail(productId.value ?? 'new')),
  queryFn: ({ signal }) => productsGet(productId.value!, undefined, signal),
  enabled: computed(() => Boolean(productId.value)),
})
const authorsQuery = useQuery({ queryKey: ['products', 'selectors', 'authors'], queryFn: ({ signal }) => listAuthors({ limit: 100, sortBy: 'name', sortOrder: 'asc' }, undefined, signal) })
const categoriesQuery = useQuery({ queryKey: ['products', 'selectors', 'categories'], queryFn: ({ signal }) => listCategoryTree({ sortBy: 'sortOrder', sortOrder: 'asc' }, signal) })

const authors = computed(() => authorsQuery.data.value?.data ?? [])

function flattenCategories(nodes: CategoryTreeNodeResponseDto[], depth = 0): Array<CategoryTreeNodeResponseDto & { depth: number }> {
  return nodes.flatMap((node) => [{ ...node, depth }, ...flattenCategories(node.children, depth + 1)])
}
const categories = computed(() => flattenCategories(categoriesQuery.data.value?.data ?? []))

watch(() => detailQuery.data.value?.data, (product) => {
  if (!product || hydrated.value) return
  hydrating.value = true
  Object.assign(form, {
    name: product.name,
    slug: product.slug,
    shortDescription: typeof product.shortDescription === 'string' ? product.shortDescription : '',
    description: product.description ?? null,
    supplierId: product.supplier?.id ?? '',
    publisherId: product.publisher?.id ?? '',
    releaseDate: toDateInputValue(product.releaseDate),
    categoryIds: product.categories.map((item) => item.id),
    primaryCategoryId: product.primaryCategoryId ?? null,
    authorIds: product.authors.map((item) => item.id),
    attributes: Object.fromEntries(product.attributeValues.map((item) => [item.attributeId, item.value])),
  })
  selectedAttributes.value = product.attributeValues.map((item) => ({
    id: item.attributeId,
    name: item.name,
    code: item.code,
    type: item.type,
  }))
  hydrating.value = false
  hydrated.value = true
  dirty.value = false
}, { immediate: true })

watch(form, () => {
  if (!hydrating.value && (!isEdit.value || hydrated.value)) dirty.value = true
}, { deep: true, flush: 'sync' })

function toggleId(list: string[], id: string, checked: boolean | 'indeterminate') {
  const index = list.indexOf(id)
  if (checked === true && index < 0) list.push(id)
  if (checked !== true && index >= 0) list.splice(index, 1)
}

function toggleCategory(categoryId: string, checked: boolean | 'indeterminate'): void {
  if (checked === true) selectProductCategory(form, categoryId)
  else unselectProductCategory(form, categoryId, categories.value.map((item) => item.id))
  if (form.primaryCategoryId) clearFieldError('primaryCategoryId')
}

function selectPrimaryCategory(categoryId: unknown): void {
  if (typeof categoryId !== 'string') return
  setProductPrimaryCategory(form, categoryId)
  if (form.primaryCategoryId) clearFieldError('primaryCategoryId')
}

function validate() {
  Object.keys(errors).forEach((key) => delete errors[key])
  if (form.name.trim().length < 2) errors.name = 'Tên sản phẩm phải có ít nhất 2 ký tự.'
  if (form.shortDescription.length > 500) errors.shortDescription = 'Mô tả ngắn tối đa 500 ký tự.'
  if (form.categoryIds.length > 0 && !form.primaryCategoryId) errors.primaryCategoryId = 'Vui lòng chọn danh mục chính.'
  else if (form.primaryCategoryId && !form.categoryIds.includes(form.primaryCategoryId)) errors.primaryCategoryId = 'Danh mục chính phải thuộc danh sách danh mục đã chọn.'
  return Object.keys(errors).length === 0
}

function clearFieldError(field: string): void {
  delete errors[field]
}

function payload(): CreateProductDto {
  return {
    name: form.name.trim(),
    shortDescription: form.shortDescription.trim() || null,
    description: form.description,
    supplierId: form.supplierId || null,
    publisherId: form.publisherId || null,
    releaseDate: form.releaseDate || null,
    categoryIds: [...form.categoryIds],
    primaryCategoryId: form.primaryCategoryId,
    authorIds: [...form.authorIds],
    attributeValues: serializeProductAttributeValues(selectedAttributes.value, form.attributes),
  }
}

async function submit() {
  if (!validate() || pending.value) return
  pending.value = true
  try {
    if (productId.value) {
      await productsUpdate(productId.value, payload())
      await Promise.all([
        client.invalidateQueries({ queryKey: productKeys.detail(productId.value) }),
        client.invalidateQueries({ queryKey: productKeys.lists() }),
      ])
      dirty.value = false
      toast.success('Cập nhật sản phẩm thành công.')
    } else {
      const response = await productsCreate(payload())
      dirty.value = false
      toast.success('Tạo sản phẩm nháp thành công. Tiếp tục cấu hình biến thể.')
      await router.replace({ name: 'super-admin-product-edit', params: { id: response.data.id } })
      await nextTick()
      await mediaSection.value?.uploadQueued()
    }
  } catch (error) {
    const fieldErrors = productFieldErrors(error)
    Object.assign(errors, fieldErrors)
    if (Object.keys(fieldErrors).length === 0) {
      toast.error(productErrorMessage(error, 'Không thể lưu sản phẩm.'))
    }
  } finally { pending.value = false }
}

function beforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
}

function updateAttributeInput(attributeId: string, value: ProductAttributeFormValue) {
  form.attributes[attributeId] = value
}

function addAttribute(attribute: ProductAttributeDefinition): void {
  if (selectedAttributes.value.some((item) => item.id === attribute.id)) return
  selectedAttributes.value.push(attribute)
  form.attributes[attribute.id] = defaultProductAttributeValue(attribute)
  toast.success('Đã thêm thuộc tính vào sản phẩm.')
}

function removeAttribute(attributeId: string): void {
  selectedAttributes.value = selectedAttributes.value.filter((item) => item.id !== attributeId)
  delete form.attributes[attributeId]
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <div class="space-y-6 pb-24">
    <AdminBreadcrumb group-label="Quản lý" :group-to="{ name: 'admin-home' }" section-label="Sản phẩm" :section-to="{ name: 'super-admin-products' }" :current-label="isEdit ? form.name || 'Chỉnh sửa' : 'Tạo mới'" :loading="isEdit && detailQuery.isPending.value" />
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><h1 class="text-2xl font-semibold tracking-tight">{{ isEdit ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm' }}</h1><p class="text-sm text-muted-foreground">Sản phẩm mới luôn được tạo ở trạng thái nháp.</p></div>
      <Button variant="outline" @click="router.push({ name: 'super-admin-products' })"><ArrowLeft class="mr-2 h-4 w-4" />Danh sách</Button>
    </div>

    <p v-if="detailQuery.isError.value" class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Không thể tải sản phẩm.</p>
    <template v-else>
      <Card>
        <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
        <CardContent class="grid gap-5 md:grid-cols-2">
          <div class="space-y-2 md:col-span-2"><Label for="product-name">Tên sản phẩm *</Label><Input id="product-name" v-model="form.name" maxlength="255" :aria-invalid="Boolean(errors.name)" @update:model-value="clearFieldError('name')" /><p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p></div>
          <div class="space-y-2"><Label for="product-slug">Slug</Label><Input id="product-slug" v-model="form.slug" disabled placeholder="Backend tự sinh sau khi lưu" /><p class="text-xs text-muted-foreground">Slug do backend sinh và bảo đảm duy nhất.</p></div>
          <div class="space-y-2"><Label for="release-date">Ngày phát hành</Label><Input id="release-date" v-model="form.releaseDate" type="date" /></div>
          <AsyncMasterDataCombobox id="supplier" v-model="form.supplierId" kind="supplier" label="Nhà cung cấp" :selected-label="detailQuery.data.value?.data.supplier?.name" nullable />
          <AsyncMasterDataCombobox id="publisher" v-model="form.publisherId" kind="publisher" label="Nhà xuất bản" :selected-label="detailQuery.data.value?.data.publisher?.name" nullable />
          <div class="space-y-2 md:col-span-2"><Label for="short-description">Mô tả ngắn</Label><Textarea id="short-description" v-model="form.shortDescription" maxlength="500" rows="3" :aria-invalid="Boolean(errors.shortDescription)" aria-describedby="short-description-feedback" @update:model-value="clearFieldError('shortDescription')" /><div id="short-description-feedback" class="flex justify-between text-xs text-muted-foreground"><span v-if="errors.shortDescription" class="text-destructive">{{ errors.shortDescription }}</span><span class="ml-auto">{{ form.shortDescription.length }}/500</span></div></div>
          <div class="space-y-2 md:col-span-2"><Label>Mô tả chi tiết</Label><ProductDescriptionEditor v-model="form.description" /></div>
        </CardContent>
      </Card>

      <div class="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Danh mục</CardTitle></CardHeader>
          <CardContent class="space-y-3">
            <p id="product-category-help" class="text-xs text-muted-foreground">Có thể chọn nhiều danh mục. Chọn một danh mục chính để dùng cho điều hướng và breadcrumb.</p>
            <ScrollArea class="h-72">
              <RadioGroup
                :model-value="form.primaryCategoryId ?? undefined"
                aria-describedby="product-category-help product-category-error"
                class="space-y-2 pr-4"
                @update:model-value="selectPrimaryCategory"
              >
                <div
                  v-for="item in categories"
                  :key="item.id"
                  class="flex flex-wrap items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm transition-colors hover:bg-muted/40"
                  :class="{ 'border-primary/30 bg-primary/5': form.primaryCategoryId === item.id }"
                  :style="{ marginLeft: `${item.depth * 16}px` }"
                >
                  <Checkbox
                    :id="`product-category-${item.id}`"
                    class="focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                    :model-value="form.categoryIds.includes(item.id)"
                    :disabled="!item.effectiveActive"
                    @update:model-value="toggleCategory(item.id, $event)"
                  />
                  <label :for="`product-category-${item.id}`" class="min-w-0 flex-1 cursor-pointer">{{ item.name }}</label>
                  <div class="ml-auto flex items-center gap-2">
                    <RadioGroupItem
                      :id="`product-primary-category-${item.id}`"
                      :value="item.id"
                      :disabled="!form.categoryIds.includes(item.id)"
                      :aria-label="`Chọn ${item.name} làm danh mục chính`"
                    />
                    <label :for="`product-primary-category-${item.id}`" class="cursor-pointer text-xs text-muted-foreground">Danh mục chính</label>
                    <Badge v-if="form.primaryCategoryId === item.id" variant="secondary" class="text-[10px]">Danh mục chính</Badge>
                  </div>
                </div>
                <p v-if="categories.length === 0" class="text-sm text-muted-foreground">Chưa có danh mục.</p>
              </RadioGroup>
            </ScrollArea>
            <p v-if="errors.primaryCategoryId" id="product-category-error" class="text-xs text-destructive">{{ errors.primaryCategoryId }}</p>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Tác giả</CardTitle></CardHeader><CardContent><ScrollArea class="h-72"><div class="grid gap-2 pr-4 sm:grid-cols-2"><label v-for="item in authors" :key="item.id" class="flex items-center gap-2 rounded-sm py-0.5 text-sm hover:bg-muted/40"><Checkbox class="focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2" :model-value="form.authorIds.includes(item.id)" @update:model-value="toggleId(form.authorIds, item.id, $event)" />{{ item.name }}</label><p v-if="authors.length === 0" class="text-sm text-muted-foreground">Chưa có tác giả.</p></div></ScrollArea></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Thuộc tính mô tả</CardTitle></CardHeader>
        <CardContent>
          <ProductSelectedAttributes
            :selected="selectedAttributes"
            :values="form.attributes"
            @select="addAttribute"
            @remove="removeAttribute"
            @update:value="updateAttributeInput"
          />
        </CardContent>
      </Card>

      <ProductMediaSection ref="mediaSection" :product-id="productId" />

      <template v-if="productId">
        <Card><CardContent class="p-5"><ProductOptionBuilder :product-id="productId" /></CardContent></Card>
        <Card><CardContent class="p-5"><ProductVariantManager :product-id="productId" /></CardContent></Card>
      </template>
      <Card v-else class="border-dashed"><CardContent class="p-5 text-sm text-muted-foreground">Lưu sản phẩm nháp trước để cấu hình lựa chọn và biến thể.</CardContent></Card>
    </template>

    <div class="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur lg:left-64">
      <div class="mx-auto flex max-w-7xl justify-end gap-2"><Button variant="outline" @click="router.push({ name: 'super-admin-products' })">Hủy</Button><Button :disabled="pending || (isEdit && detailQuery.isPending.value)" @click="submit"><Save class="mr-2 h-4 w-4" />{{ pending ? 'Đang lưu...' : 'Lưu sản phẩm' }}</Button></div>
    </div>

  </div>
</template>
