<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { Eye, GripVertical, ImagePlus, Loader2, Star, Trash2, UploadCloud } from '@lucide/vue'
import { VueDraggable, type DraggableEvent } from 'vue-draggable-plus'
import { toast } from 'vue-sonner'
import type { ProductMediaResponseDto } from '@/api/generated/models'
import ImagePreviewDialog from '@/components/shared/ImagePreviewDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { productKeys } from '../../api/product-query-keys'
import { productVariantsList } from '../../api/product-api'
import { productErrorMessage } from '../../utils/product-errors'
import MasterDataDeleteDialog from '@/features/product-master-data/components/MasterDataDeleteDialog.vue'
import { productMediaDelete, productMediaList, productMediaReorder, productMediaSetPrimary, productMediaUpdate, productMediaUpload } from '../api/product-media-api'
import { useProductMediaQueue } from '../composables/useProductMediaQueue'

const props = withDefaults(defineProps<{ productId?: string | null; readonly?: boolean }>(), { productId: null, readonly: false })
const client = useQueryClient()
const selectedVariantId = ref<string | null>(null)
const orderedMedia = ref<ProductMediaResponseDto[]>([])
const preview = ref<ProductMediaResponseDto | null>(null)
const altTarget = ref<ProductMediaResponseDto | null>(null)
const altText = ref('')
const deleteTarget = ref<ProductMediaResponseDto | null>(null)
const actionPending = ref<string | null>(null)
const input = ref<HTMLInputElement | null>(null)
const usingFallback = ref(false)
const reorderState = ref<'IDLE' | 'DRAGGING' | 'SAVING' | 'SUCCESS' | 'ROLLBACK_ERROR'>('IDLE')
const reorderSnapshot = ref<{
  variantId: string | null
  items: ProductMediaResponseDto[]
  primaryId: string | null
} | null>(null)

const variantsQuery = useQuery({
  queryKey: computed(() => productKeys.variants(props.productId ?? 'new')),
  queryFn: ({ signal }) => productVariantsList(props.productId!, undefined, signal),
  enabled: computed(() => Boolean(props.productId)),
})
const variants = computed(() => variantsQuery.data.value?.data ?? [])
const query = useQuery({
  queryKey: computed(() => productKeys.media(props.productId ?? 'new', selectedVariantId.value)),
  queryFn: ({ signal }) => productMediaList(
    props.productId!,
    selectedVariantId.value ? { variantId: selectedVariantId.value } : undefined,
    undefined,
    signal,
  ),
  enabled: computed(() => Boolean(props.productId)),
})
watch(
  [() => query.data.value?.data, selectedVariantId],
  async ([items, variantId]) => {
    usingFallback.value = false
    orderedMedia.value = items ? [...items] : []
    if (props.readonly && props.productId && variantId && orderedMedia.value.length === 0) {
      const general = await productMediaList(props.productId)
      orderedMedia.value = [...general.data]
      usingFallback.value = orderedMedia.value.length > 0
    }
  },
  { immediate: true },
)

const limit = computed(() => selectedVariantId.value ? 8 : 12)
const remaining = computed(() => Math.max(0, limit.value - orderedMedia.value.length))
const queue = useProductMediaQueue({
  maxItems: () => remaining.value,
  upload: async (file) => {
    if (!props.productId) throw new Error('PRODUCT_NOT_PERSISTED')
    await productMediaUpload(props.productId, {
      file,
      ...(selectedVariantId.value ? { variantId: selectedVariantId.value } : {}),
    })
  },
})

async function refresh(): Promise<void> {
  if (!props.productId) return
  await Promise.all([
    client.invalidateQueries({ queryKey: productKeys.media(props.productId, selectedVariantId.value) }),
    client.invalidateQueries({ queryKey: productKeys.detail(props.productId) }),
    client.invalidateQueries({ queryKey: productKeys.lists() }),
  ])
}

async function uploadAll(): Promise<void> {
  if (!props.productId) return
  const before = queue.items.filter((item) => ['READY', 'ERROR_RETRYABLE'].includes(item.state)).length
  if (!before) return
  await queue.uploadAll()
  const success = queue.items.filter((item) => item.state === 'SUCCESS').length
  const failed = queue.items.filter((item) => ['ERROR_RETRYABLE', 'ERROR_INVALID'].includes(item.state)).length
  await refresh()
  if (failed) toast.warning(`Đã tải lên ${success}/${before} ảnh. ${failed} ảnh cần kiểm tra lại.`)
  else toast.success(`Đã tải lên ${success} ảnh.`)
  queue.resetSuccess()
}

defineExpose({ uploadQueued: uploadAll })

function chooseFiles(event: Event): void {
  const element = event.target as HTMLInputElement
  if (element.files) queue.add(element.files)
  element.value = ''
  if (queue.rejected.length) toast.warning(`Đã bỏ qua ${queue.rejected.length} tệp không hợp lệ.`)
}

async function setPrimary(item: ProductMediaResponseDto): Promise<void> {
  if (item.isPrimary || actionPending.value) return
  actionPending.value = item.id
  try {
    await productMediaSetPrimary(props.productId!, item.id)
    await refresh()
    toast.success('Đặt ảnh đại diện thành công.')
  } catch (error) { toast.error(productErrorMessage(error, 'Không thể đặt ảnh đại diện.')) }
  finally { actionPending.value = null }
}

function openAlt(item: ProductMediaResponseDto): void {
  altTarget.value = item
  altText.value = item.altText ?? ''
}

async function saveAlt(): Promise<void> {
  if (!altTarget.value || altText.value.trim().length > 200 || actionPending.value) return
  actionPending.value = altTarget.value.id
  try {
    await productMediaUpdate(props.productId!, altTarget.value.id, { altText: altText.value.trim() || null })
    altTarget.value = null
    await refresh()
    toast.success('Cập nhật mô tả ảnh thành công.')
  } catch (error) { toast.error(productErrorMessage(error, 'Không thể cập nhật mô tả ảnh.')) }
  finally { actionPending.value = null }
}

function startReorder(): void {
  reorderSnapshot.value = {
    variantId: selectedVariantId.value,
    items: [...orderedMedia.value],
    primaryId: orderedMedia.value.find((item) => item.isPrimary)?.id ?? null,
  }
  reorderState.value = 'DRAGGING'
}

async function finishReorder(_event: DraggableEvent<ProductMediaResponseDto>): Promise<void> {
  const snapshot = reorderSnapshot.value
  if (!snapshot || actionPending.value) return
  const previousIds = snapshot.items.map((item) => item.id)
  const orderedMediaIds = orderedMedia.value.map((item) => item.id)
  const unchanged = previousIds.every((id, index) => orderedMediaIds[index] === id)
  const currentPrimaryId = orderedMedia.value.find((item) => item.isPrimary)?.id ?? null

  if (unchanged) {
    reorderSnapshot.value = null
    reorderState.value = 'IDLE'
    return
  }

  if (
    selectedVariantId.value !== snapshot.variantId
    || currentPrimaryId !== snapshot.primaryId
    || previousIds.length !== orderedMediaIds.length
    || previousIds.some((id) => !orderedMediaIds.includes(id))
  ) {
    orderedMedia.value = [...snapshot.items]
    reorderSnapshot.value = null
    reorderState.value = 'ROLLBACK_ERROR'
    toast.error('Không thể chuyển ảnh sang bộ sưu tập khác.')
    return
  }

  actionPending.value = 'reorder'
  reorderState.value = 'SAVING'
  try {
    await productMediaReorder(props.productId!, {
      variantId: snapshot.variantId,
      orderedMediaIds,
    })
    reorderState.value = 'SUCCESS'
    await refresh()
    toast.success('Sắp xếp ảnh thành công.')
  } catch (error) {
    orderedMedia.value = [...snapshot.items]
    reorderState.value = 'ROLLBACK_ERROR'
    toast.error(productErrorMessage(error, 'Không thể lưu thứ tự ảnh.'))
  } finally {
    actionPending.value = null
    reorderSnapshot.value = null
  }
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value || actionPending.value) return
  actionPending.value = deleteTarget.value.id
  try {
    await productMediaDelete(props.productId!, deleteTarget.value.id)
    deleteTarget.value = null
    await refresh()
    toast.success('Xóa ảnh thành công.')
  } catch (error) { toast.error(productErrorMessage(error, 'Không thể xóa ảnh.')) }
  finally { actionPending.value = null }
}
</script>

<template>
  <Card class="min-w-0">
    <CardHeader class="gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><CardTitle>Hình ảnh sản phẩm</CardTitle><p class="mt-1 text-sm text-muted-foreground">Ảnh chung là bắt buộc khi kích hoạt; ảnh biến thể sẽ fallback về ảnh chung khi rỗng.</p></div>
      <Select :model-value="selectedVariantId ?? 'general'" :disabled="reorderState === 'DRAGGING' || reorderState === 'SAVING'" @update:model-value="selectedVariantId = $event === 'general' ? null : String($event)"><SelectTrigger class="w-full sm:w-72" aria-label="Chọn bộ sưu tập"><SelectValue placeholder="Chọn bộ sưu tập" /></SelectTrigger><SelectContent class="z-[70]"><SelectItem value="general">Ảnh chung của sản phẩm</SelectItem><SelectItem v-for="variant in variants" :key="variant.id" :value="variant.id">{{ variant.name }} · {{ variant.sku }}</SelectItem></SelectContent></Select>
    </CardHeader>
    <CardContent class="space-y-5">
      <p v-if="productId && query.isPending.value" class="text-sm text-muted-foreground">Đang tải bộ sưu tập ảnh...</p>
      <div v-else-if="productId && query.isError.value" class="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Không thể tải bộ sưu tập. <Button type="button" size="sm" variant="outline" @click="query.refetch()">Thử lại</Button></div>
      <div v-else-if="orderedMedia.length === 0" class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{{ selectedVariantId ? 'Biến thể chưa có ảnh riêng và sẽ dùng ảnh chung.' : 'Sản phẩm chưa có ảnh chung.' }}</div>
      <p v-if="usingFallback" class="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Đang dùng ảnh chung của sản phẩm.</p>
      <VueDraggable
        v-else
        v-model="orderedMedia"
        item-key="id"
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        :disabled="readonly || Boolean(actionPending) || orderedMedia.length < 2"
        draggable=".media-card"
        handle=".media-drag-handle"
        direction="horizontal"
        :animation="180"
        :swap-threshold="0.65"
        :invert-swap="true"
        :inverted-swap-threshold="0.65"
        filter=".media-action"
        :prevent-on-filter="false"
        ghost-class="media-sortable-ghost"
        chosen-class="media-sortable-chosen"
        drag-class="media-sortable-drag"
        @start="startReorder"
        @end="finishReorder"
      >
        <article v-for="item in orderedMedia" :key="item.id" class="media-card min-w-0 overflow-hidden rounded-lg border bg-card" :data-media-id="item.id">
          <div class="relative">
            <button type="button" class="media-action relative block aspect-square w-full overflow-hidden bg-muted" @pointerdown.stop @click="preview = item"><img :src="item.url" :alt="item.altText ?? 'Ảnh sản phẩm'" class="h-full w-full object-cover"><span class="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition hover:bg-black/25 hover:opacity-100 focus-visible:bg-black/25 focus-visible:opacity-100"><Eye class="h-6 w-6" /></span></button>
            <TooltipProvider :delay-duration="200">
              <Tooltip v-if="!readonly">
                <TooltipTrigger as-child>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    class="media-action absolute right-2 top-2 z-10 bg-background/85 backdrop-blur-sm"
                    :aria-label="item.isPrimary ? 'Ảnh đại diện' : 'Đặt làm ảnh đại diện'"
                    :aria-pressed="item.isPrimary"
                    :aria-busy="actionPending === item.id"
                    :disabled="Boolean(actionPending)"
                    @pointerdown.stop
                    @click.stop="setPrimary(item)"
                  >
                    <Loader2 v-if="actionPending === item.id" class="h-4 w-4 animate-spin" />
                    <Star v-else class="h-4 w-4" :class="item.isPrimary ? 'fill-amber-400 text-amber-500' : ''" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent class="z-[80]">{{ item.isPrimary ? 'Ảnh đại diện' : 'Đặt làm ảnh đại diện' }}</TooltipContent>
              </Tooltip>
              <Tooltip v-else-if="item.isPrimary">
                <TooltipTrigger as-child><span class="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-md border bg-background/85 text-amber-500 backdrop-blur-sm" role="img" aria-label="Ảnh đại diện"><Star class="h-4 w-4 fill-amber-400" /></span></TooltipTrigger>
                <TooltipContent class="z-[80]">Ảnh đại diện</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button v-if="!readonly" type="button" size="icon-sm" variant="outline" class="media-drag-handle absolute left-2 top-2 z-10 cursor-grab bg-background/85 backdrop-blur-sm active:cursor-grabbing" :disabled="Boolean(actionPending) || orderedMedia.length < 2" aria-label="Kéo để sắp xếp ảnh" @click.stop><GripVertical class="h-4 w-4" /></Button>
          </div>
          <div class="space-y-3 p-3"><p class="truncate text-sm" :title="item.altText ?? ''">{{ item.altText || 'Chưa có mô tả ảnh' }}</p><div v-if="!readonly" class="flex flex-wrap gap-1"><Button type="button" size="sm" variant="outline" class="media-action" :disabled="Boolean(actionPending)" @pointerdown.stop @click="openAlt(item)">Mô tả</Button><Button type="button" size="icon-sm" variant="ghost" class="media-action" :disabled="Boolean(actionPending)" aria-label="Xóa ảnh" @pointerdown.stop @click="deleteTarget = item"><Trash2 class="h-4 w-4" /></Button></div></div>
        </article>
      </VueDraggable>

      <template v-if="!readonly">
        <div class="flex flex-wrap items-center gap-2"><input ref="input" type="file" multiple class="sr-only" accept="image/jpeg,image/png,image/webp" @change="chooseFiles"><Button type="button" variant="outline" :disabled="remaining === 0 || queue.pending.value" @click="input?.click()"><ImagePlus class="mr-2 h-4 w-4" />Chọn nhiều ảnh</Button><Button type="button" :disabled="queue.pending.value || !queue.items.some((item) => ['READY', 'ERROR_RETRYABLE'].includes(item.state))" @click="uploadAll"><UploadCloud class="mr-2 h-4 w-4" />Tải lên tất cả</Button><span class="text-xs text-muted-foreground">Còn {{ remaining }} / {{ limit }} vị trí</span><span class="sr-only" aria-live="polite">{{ reorderState === 'SAVING' ? 'Đang lưu thứ tự ảnh' : reorderState === 'SUCCESS' ? 'Đã lưu thứ tự ảnh' : reorderState === 'ROLLBACK_ERROR' ? 'Đã khôi phục thứ tự ảnh cũ' : '' }}</span></div>
        <ul v-if="queue.rejected.length" class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"><li v-for="message in queue.rejected" :key="message">{{ message }}</li></ul>
        <ScrollArea v-if="queue.items.length" class="max-h-72 rounded-lg border"><div class="grid gap-2 p-3 sm:grid-cols-2"><article v-for="item in queue.items" :key="item.id" class="flex min-w-0 gap-3 rounded-md border p-2"><img v-if="item.previewUrl" :src="item.previewUrl" alt="Ảnh đang chờ tải" class="h-16 w-16 shrink-0 rounded object-cover"><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ item.file.name }}</p><p class="text-xs text-muted-foreground">{{ item.state }}</p><p v-if="item.error" class="text-xs text-destructive">{{ item.error }}</p><div class="mt-1 flex gap-1"><Button v-if="item.state === 'ERROR_RETRYABLE'" type="button" size="sm" variant="outline" @click="queue.uploadItem(item).then(refresh)">Thử lại</Button><Button v-if="item.state !== 'UPLOADING'" type="button" size="sm" variant="ghost" @click="queue.remove(item.id)">Bỏ</Button></div></div></article></div></ScrollArea>
      </template>
    </CardContent>
  </Card>

  <ImagePreviewDialog :open="Boolean(preview)" :src="preview?.url ?? ''" :alt="preview?.altText ?? 'Ảnh sản phẩm'" @update:open="preview = $event ? preview : null" />
  <Dialog :open="Boolean(altTarget)" @update:open="altTarget = $event ? altTarget : null"><DialogContent><DialogHeader><DialogTitle>Mô tả ảnh</DialogTitle><DialogDescription>Mô tả ngắn giúp ảnh dễ tiếp cận hơn.</DialogDescription></DialogHeader><div class="space-y-2"><Input v-model="altText" maxlength="200" :aria-invalid="altText.trim().length > 200" /><p class="text-right text-xs text-muted-foreground">{{ altText.length }}/200</p></div><DialogFooter><Button type="button" variant="outline" @click="altTarget = null">Hủy</Button><Button type="button" :disabled="altText.trim().length > 200 || Boolean(actionPending)" @click="saveAlt">Lưu mô tả</Button></DialogFooter></DialogContent></Dialog>
  <MasterDataDeleteDialog :open="Boolean(deleteTarget)" name="ảnh đã chọn" title="Xóa ảnh?" description="Ảnh sẽ bị xóa khỏi bộ sưu tập và kho lưu trữ. Ảnh đại diện kế tiếp sẽ được chọn tự động nếu cần." :pending="Boolean(actionPending)" @update:open="deleteTarget = $event ? deleteTarget : null" @confirm="confirmDelete" />
</template>

<style scoped>
:deep(.media-sortable-chosen) {
  box-shadow: 0 0 0 3px rgb(59 130 246 / 45%);
  transform: scale(0.98);
}

:deep(.media-sortable-ghost) {
  border-style: dashed;
  opacity: 0.35;
}

:deep(.media-sortable-drag) {
  cursor: grabbing;
  opacity: 0.9;
  box-shadow: 0 16px 40px rgb(15 23 42 / 28%);
}
</style>
