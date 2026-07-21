<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { ImagePlus, Plus, Save, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ProductOptionResponseDto, ProductOptionValueResponseDto } from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import MasterDataDeleteDialog from '@/features/product-master-data/components/MasterDataDeleteDialog.vue'
import { productOptionsCreate, productOptionsDelete, productOptionsList, productOptionsUpdate, productOptionValuesCreate, productOptionValuesDelete, productOptionValuesUpdate } from '../api/product-api'
import { productKeys } from '../api/product-query-keys'
import { productErrorMessage, productFieldErrors } from '../utils/product-errors'
import { normalizeProductColor, productColorError } from '../utils/product-option-validation'
import OptionValueImageDialog from '../media/components/OptionValueImageDialog.vue'

const props = defineProps<{ productId: string }>()
const client = useQueryClient()
const pending = ref(false)
const newOption = reactive({ name: '', code: '', sortOrder: 0 })
type OptionDraft = { name: string; code: string; sortOrder: number }
type ValueDraft = { label: string; value: string; colorCode: string; sortOrder: number }
type DeleteTarget =
  | { kind: 'option'; option: ProductOptionResponseDto }
  | { kind: 'value'; option: ProductOptionResponseDto; value: ProductOptionValueResponseDto }

const optionDrafts = reactive<Record<string, OptionDraft>>({})
const newValues = reactive<Record<string, ValueDraft>>({})
const valueDrafts = reactive<Record<string, ValueDraft>>({})
const valueErrors = reactive<Record<string, Partial<Record<keyof ValueDraft, string>>>>({})
const deleteOpen = ref(false)
const deleteTarget = ref<DeleteTarget | null>(null)
const imageTarget = ref<{ option: ProductOptionResponseDto; value: ProductOptionValueResponseDto } | null>(null)

const query = useQuery({
  queryKey: computed(() => productKeys.options(props.productId)),
  queryFn: ({ signal }) => productOptionsList(props.productId, undefined, signal),
})
const options = computed(() => query.data.value?.data ?? [])

watch(options, (items) => items.forEach((option) => {
  optionDrafts[option.id] = { name: option.name, code: option.code, sortOrder: option.sortOrder }
  newValues[option.id] ??= { label: '', value: '', colorCode: '', sortOrder: option.values.length }
  option.values.forEach((value) => {
    valueDrafts[value.id] = { label: value.label, value: value.value, colorCode: value.colorCode ?? '', sortOrder: value.sortOrder }
  })
}), { immediate: true })

const normalizeCode = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, '_').replace(/[^A-Z0-9_]/g, '')
const valueUsageCount = (value: ProductOptionValueResponseDto): number => {
  const usageCount = Reflect.get(value, 'usageCount')
  return typeof usageCount === 'number' ? usageCount : 0
}
const deleteBlockedReason = computed(() => {
  const target = deleteTarget.value
  if (!target) return undefined
  if (target.kind === 'option' && target.option.variantUsageCount > 0) {
    return `Lựa chọn đang được ${target.option.variantUsageCount} liên kết biến thể sử dụng.`
  }
  if (target.kind === 'value' && valueUsageCount(target.value) > 0) {
    return `Giá trị đang được ${valueUsageCount(target.value)} biến thể sử dụng.`
  }
  return undefined
})

async function refresh() {
  await Promise.all([
    client.invalidateQueries({ queryKey: productKeys.options(props.productId) }),
    client.invalidateQueries({ queryKey: productKeys.detail(props.productId) }),
    client.invalidateQueries({ queryKey: productKeys.variants(props.productId) }),
  ])
}

function validateValueDraft(key: string, draft: ValueDraft): boolean {
  const nextErrors: Partial<Record<keyof ValueDraft, string>> = {}
  if (!draft.label.trim()) nextErrors.label = 'Vui lòng nhập tên hiển thị.'
  if (!draft.value.trim()) nextErrors.value = 'Vui lòng nhập giá trị kỹ thuật.'
  const colorError = productColorError(draft.colorCode)
  if (colorError) nextErrors.colorCode = colorError
  valueErrors[key] = nextErrors
  return Object.keys(nextErrors).length === 0
}

function clearValueError(key: string, field: keyof ValueDraft): void {
  delete valueErrors[key]?.[field]
}

async function addOption() {
  if (!newOption.name.trim() || !newOption.code.trim()) {
    toast.error('Vui lòng nhập tên và mã lựa chọn.')
    return
  }
  if (pending.value) return
  pending.value = true
  try {
    await productOptionsCreate(props.productId, { name: newOption.name.trim(), code: normalizeCode(newOption.code), sortOrder: newOption.sortOrder })
    Object.assign(newOption, { name: '', code: '', sortOrder: options.value.length })
    await refresh()
    toast.success('Thêm lựa chọn thành công.')
  } catch (error) { toast.error(productErrorMessage(error, 'Không thể thêm lựa chọn.')) } finally { pending.value = false }
}

async function saveOption(option: ProductOptionResponseDto) {
  const draft = optionDrafts[option.id]
  if (!draft || pending.value) return
  pending.value = true
  try {
    await productOptionsUpdate(props.productId, option.id, { name: draft.name.trim(), code: normalizeCode(draft.code), sortOrder: draft.sortOrder })
    await refresh()
    toast.success('Cập nhật lựa chọn thành công.')
  } catch (error) { toast.error(productErrorMessage(error, 'Không thể cập nhật lựa chọn.')) } finally { pending.value = false }
}

async function addValue(option: ProductOptionResponseDto) {
  const draft = newValues[option.id]
  if (!draft || !validateValueDraft(`new-${option.id}`, draft) || pending.value) return
  pending.value = true
  try {
    await productOptionValuesCreate(props.productId, option.id, {
      label: draft.label.trim(),
      value: normalizeCode(draft.value),
      colorCode: normalizeProductColor(draft.colorCode),
      sortOrder: draft.sortOrder,
    })
    newValues[option.id] = { label: '', value: '', colorCode: '', sortOrder: option.values.length + 1 }
    delete valueErrors[`new-${option.id}`]
    await refresh()
    toast.success('Thêm giá trị lựa chọn thành công.')
  } catch (error) {
    valueErrors[`new-${option.id}`] = productFieldErrors(error)
    if (Object.keys(valueErrors[`new-${option.id}`] ?? {}).length === 0) toast.error(productErrorMessage(error, 'Không thể thêm giá trị lựa chọn.'))
  } finally { pending.value = false }
}

async function saveValue(option: ProductOptionResponseDto, value: ProductOptionValueResponseDto) {
  const draft = valueDrafts[value.id]
  if (!draft || !validateValueDraft(value.id, draft) || pending.value) return
  pending.value = true
  try {
    await productOptionValuesUpdate(props.productId, option.id, value.id, {
      label: draft.label.trim(),
      value: normalizeCode(draft.value),
      colorCode: normalizeProductColor(draft.colorCode),
      sortOrder: draft.sortOrder,
    })
    delete valueErrors[value.id]
    await refresh()
    toast.success('Cập nhật giá trị lựa chọn thành công.')
  } catch (error) {
    valueErrors[value.id] = productFieldErrors(error)
    if (Object.keys(valueErrors[value.id] ?? {}).length === 0) toast.error(productErrorMessage(error, 'Không thể cập nhật giá trị lựa chọn.'))
  } finally { pending.value = false }
}

function askDelete(target: DeleteTarget): void {
  deleteTarget.value = target
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target || deleteBlockedReason.value || pending.value) return
  pending.value = true
  try {
    if (target.kind === 'option') await productOptionsDelete(props.productId, target.option.id)
    else await productOptionValuesDelete(props.productId, target.option.id, target.value.id)
    await refresh()
    deleteOpen.value = false
    toast.success('Xóa cấu hình lựa chọn thành công.')
  } catch (error) { toast.error(productErrorMessage(error, 'Không thể xóa cấu hình lựa chọn.')) } finally { pending.value = false }
}
</script>

<template>
  <section class="min-w-0 space-y-4" aria-labelledby="options-heading">
    <div><h2 id="options-heading" class="text-lg font-semibold">Lựa chọn tạo biến thể</h2><p class="text-sm text-muted-foreground">Lựa chọn tạo SKU; khác với thuộc tính mô tả ở phần thông tin chung.</p></div>
    <div class="grid min-w-0 gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_auto]">
      <Input v-model="newOption.name" placeholder="Tên lựa chọn, ví dụ Hình thức bìa" aria-label="Tên lựa chọn mới" />
      <Input :model-value="newOption.code" placeholder="COVER" aria-label="Mã lựa chọn mới" @update:model-value="newOption.code = normalizeCode(String($event))" />
      <Input v-model.number="newOption.sortOrder" type="number" min="0" aria-label="Thứ tự lựa chọn" />
      <Button type="button" :disabled="pending" @click="addOption"><Plus class="mr-2 h-4 w-4" />Thêm lựa chọn</Button>
    </div>
    <p v-if="query.isPending.value" class="text-sm text-muted-foreground">Đang tải lựa chọn...</p>
    <p v-else-if="query.isError.value" class="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Không thể tải lựa chọn. <Button type="button" size="sm" variant="outline" @click="query.refetch()">Thử lại</Button></p>
    <p v-else-if="options.length === 0" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Sản phẩm chưa có lựa chọn.</p>
    <Card v-for="option in options" :key="option.id" class="min-w-0">
      <CardHeader class="pb-3"><CardTitle class="flex flex-wrap items-center justify-between gap-2 text-base"><span class="min-w-0 break-words">{{ option.name }} · {{ option.code }}</span><Button type="button" size="icon-sm" variant="ghost" aria-label="Xóa lựa chọn" :title="option.variantUsageCount > 0 ? 'Xem lý do không thể xóa' : 'Xóa lựa chọn'" :disabled="pending" @click="askDelete({ kind: 'option', option })"><Trash2 class="h-4 w-4" /></Button></CardTitle></CardHeader>
      <CardContent class="min-w-0 space-y-4">
        <div v-if="optionDrafts[option.id]" class="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_auto]">
          <Input v-model="optionDrafts[option.id]!.name" aria-label="Tên lựa chọn" />
          <Input :model-value="optionDrafts[option.id]!.code" :disabled="option.variantUsageCount > 0" aria-label="Mã lựa chọn" @update:model-value="optionDrafts[option.id]!.code = normalizeCode(String($event))" />
          <Input v-model.number="optionDrafts[option.id]!.sortOrder" type="number" min="0" aria-label="Thứ tự" />
          <Button type="button" size="sm" variant="outline" :disabled="pending" @click="saveOption(option)"><Save class="mr-2 h-4 w-4" />Lưu</Button>
        </div>

        <ScrollArea v-if="option.values.length" scrollbar-orientation="horizontal" class="hidden w-full md:block">
          <table class="w-full min-w-[760px] text-sm"><thead><tr class="border-b text-left text-muted-foreground"><th class="p-2">Tên hiển thị</th><th class="p-2">Giá trị kỹ thuật</th><th class="p-2">Mã màu</th><th class="p-2">Thứ tự</th><th class="p-2 text-right">Hành động</th></tr></thead><tbody>
            <tr v-for="value in option.values" :key="value.id" class="border-b last:border-0"><template v-if="valueDrafts[value.id]"><td class="p-2"><div class="flex items-center gap-2"><img v-if="value.imageUrl" :src="value.imageUrl" :alt="`Thumbnail ${value.label}`" class="h-9 w-9 rounded object-cover"><span v-else-if="value.colorCode" class="h-9 w-9 rounded border" :style="{ backgroundColor: value.colorCode }" aria-hidden="true" /><Input v-model="valueDrafts[value.id]!.label" :aria-invalid="Boolean(valueErrors[value.id]?.label)" @update:model-value="clearValueError(value.id, 'label')" /></div></td><td class="p-2"><Input :model-value="valueDrafts[value.id]!.value" :disabled="valueUsageCount(value) > 0" @update:model-value="valueDrafts[value.id]!.value = normalizeCode(String($event)); clearValueError(value.id, 'value')" /></td><td class="p-2"><Input v-model="valueDrafts[value.id]!.colorCode" placeholder="#2563EB" :aria-invalid="Boolean(valueErrors[value.id]?.colorCode)" @update:model-value="clearValueError(value.id, 'colorCode')" /></td><td class="p-2"><Input v-model.number="valueDrafts[value.id]!.sortOrder" type="number" min="0" /></td><td class="p-2"><div class="flex justify-end gap-1"><Button type="button" size="icon-sm" variant="ghost" aria-label="Quản lý thumbnail" :disabled="pending" @click="imageTarget = { option, value }"><ImagePlus class="h-4 w-4" /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Lưu giá trị" :disabled="pending" @click="saveValue(option, value)"><Save class="h-4 w-4" /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Xóa giá trị" :title="valueUsageCount(value) > 0 ? 'Xem lý do không thể xóa' : 'Xóa giá trị'" :disabled="pending" @click="askDelete({ kind: 'value', option, value })"><Trash2 class="h-4 w-4" /></Button></div></td></template></tr>
          </tbody></table>
        </ScrollArea>

        <div v-if="option.values.length" class="space-y-3 md:hidden">
          <article v-for="value in option.values" :key="value.id" class="min-w-0 space-y-3 rounded-lg border p-3">
            <template v-if="valueDrafts[value.id]">
              <div class="grid gap-3"><label class="space-y-1 text-xs text-muted-foreground">Tên hiển thị<Input v-model="valueDrafts[value.id]!.label" @update:model-value="clearValueError(value.id, 'label')" /></label><label class="space-y-1 text-xs text-muted-foreground">Giá trị kỹ thuật<Input :model-value="valueDrafts[value.id]!.value" :disabled="valueUsageCount(value) > 0" @update:model-value="valueDrafts[value.id]!.value = normalizeCode(String($event)); clearValueError(value.id, 'value')" /></label><label class="space-y-1 text-xs text-muted-foreground">Mã màu<Input v-model="valueDrafts[value.id]!.colorCode" placeholder="#2563EB" :aria-invalid="Boolean(valueErrors[value.id]?.colorCode)" @update:model-value="clearValueError(value.id, 'colorCode')" /></label><label class="space-y-1 text-xs text-muted-foreground">Thứ tự<Input v-model.number="valueDrafts[value.id]!.sortOrder" type="number" min="0" /></label></div>
              <p v-if="valueErrors[value.id]?.colorCode" class="text-xs text-destructive">{{ valueErrors[value.id]?.colorCode }}</p>
              <div class="flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="outline" :disabled="pending" @click="imageTarget = { option, value }"><ImagePlus class="mr-2 h-4 w-4" />Thumbnail</Button><Button type="button" size="sm" variant="outline" :disabled="pending" @click="saveValue(option, value)"><Save class="mr-2 h-4 w-4" />Lưu</Button><Button type="button" size="sm" variant="ghost" :disabled="pending" @click="askDelete({ kind: 'value', option, value })"><Trash2 class="mr-2 h-4 w-4" />Xóa</Button></div>
            </template>
          </article>
        </div>

        <div v-if="newValues[option.id]" class="grid min-w-0 gap-3 rounded-lg border border-dashed bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_6rem_auto]">
          <label class="space-y-1 text-xs text-muted-foreground">Tên hiển thị<Input v-model="newValues[option.id]!.label" placeholder="Bìa cứng" :aria-invalid="Boolean(valueErrors[`new-${option.id}`]?.label)" @update:model-value="clearValueError(`new-${option.id}`, 'label')" /></label>
          <label class="space-y-1 text-xs text-muted-foreground">Giá trị kỹ thuật<Input :model-value="newValues[option.id]!.value" placeholder="HARDCOVER" :aria-invalid="Boolean(valueErrors[`new-${option.id}`]?.value)" @update:model-value="newValues[option.id]!.value = normalizeCode(String($event)); clearValueError(`new-${option.id}`, 'value')" /></label>
          <label class="space-y-1 text-xs text-muted-foreground">Mã màu<Input v-model="newValues[option.id]!.colorCode" placeholder="#2563EB" :aria-invalid="Boolean(valueErrors[`new-${option.id}`]?.colorCode)" @update:model-value="clearValueError(`new-${option.id}`, 'colorCode')" /><span v-if="valueErrors[`new-${option.id}`]?.colorCode" class="block text-destructive">{{ valueErrors[`new-${option.id}`]?.colorCode }}</span></label>
          <label class="space-y-1 text-xs text-muted-foreground">Thứ tự<Input v-model.number="newValues[option.id]!.sortOrder" type="number" min="0" /></label>
          <Button type="button" class="self-end" :disabled="pending" @click="addValue(option)"><Plus class="mr-2 h-4 w-4" />Thêm giá trị</Button>
        </div>
      </CardContent>
    </Card>
  </section>
  <MasterDataDeleteDialog v-model:open="deleteOpen" :name="deleteTarget?.kind === 'option' ? deleteTarget.option.name : deleteTarget?.value.label ?? ''" :title="deleteBlockedReason ? 'Không thể xóa' : 'Xóa lựa chọn?'" description="Hành động này không thể hoàn tác." :blocked-reason="deleteBlockedReason" :pending="pending" @confirm="confirmDelete" />
  <OptionValueImageDialog v-if="imageTarget" :open="Boolean(imageTarget)" :product-id="productId" :option="imageTarget.option" :value="imageTarget.value" @update:open="imageTarget = $event ? imageTarget : null" />
</template>
