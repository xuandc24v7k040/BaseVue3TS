<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import type { ProductOptionResponseDto, ProductOptionValueResponseDto } from '@/api/generated/models'
import ImageDropzone from '@/components/shared/ImageDropzone.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { productKeys } from '../../api/product-query-keys'
import { productErrorMessage } from '../../utils/product-errors'
import { productOptionValueImageRemove, productOptionValueImageUpload } from '../api/product-media-api'

const props = defineProps<{
  open: boolean
  productId: string
  option: ProductOptionResponseDto
  value: ProductOptionValueResponseDto
}>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
const client = useQueryClient()
const file = ref<File | null>(null)
const removeCurrent = ref(false)
const pending = ref(false)
const error = ref('')

watch(() => props.open, (open) => {
  if (!open) return
  file.value = null
  removeCurrent.value = false
  error.value = ''
})

async function save(): Promise<void> {
  if (pending.value || (!file.value && !removeCurrent.value)) return
  pending.value = true
  try {
    if (file.value) {
      await productOptionValueImageUpload(props.productId, props.option.id, props.value.id, { file: file.value })
      toast.success(props.value.imageUrl ? 'Thay thumbnail thành công.' : 'Thêm thumbnail thành công.')
    } else {
      await productOptionValueImageRemove(props.productId, props.option.id, props.value.id)
      toast.success('Gỡ thumbnail thành công.')
    }
    await Promise.all([
      client.invalidateQueries({ queryKey: productKeys.options(props.productId) }),
      client.invalidateQueries({ queryKey: productKeys.detail(props.productId) }),
    ])
    emit('update:open', false)
  } catch (caught) {
    error.value = productErrorMessage(caught, 'Không thể cập nhật thumbnail.')
  } finally { pending.value = false }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-xl">
      <DialogHeader class="shrink-0 border-b p-5"><DialogTitle>Thumbnail · {{ value.label }}</DialogTitle><DialogDescription>Thumbnail hỗ trợ nhận biết lựa chọn; không thay thế bộ sưu tập ảnh biến thể.</DialogDescription></DialogHeader>
      <ScrollArea class="min-h-0 flex-1"><div class="space-y-3 p-5"><ImageDropzone v-model="file" :current-url="removeCurrent ? null : value.imageUrl" :disabled="pending" :image-alt="`Thumbnail ${value.label}`" @remove="removeCurrent = true" @invalid="error = $event" @valid="error = ''; removeCurrent = false" /><p v-if="error" class="text-sm text-destructive">{{ error }}</p><p v-if="!value.imageUrl && value.colorCode && !file" class="text-sm text-muted-foreground">Khi chưa có ảnh, giao diện dùng màu {{ value.colorCode }} làm fallback.</p></div></ScrollArea>
      <DialogFooter class="shrink-0 border-t p-4"><Button type="button" variant="outline" :disabled="pending" @click="emit('update:open', false)">Hủy</Button><Button type="button" :disabled="pending || (!file && !removeCurrent)" @click="save">{{ pending ? 'Đang lưu...' : 'Lưu thumbnail' }}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
</template>
