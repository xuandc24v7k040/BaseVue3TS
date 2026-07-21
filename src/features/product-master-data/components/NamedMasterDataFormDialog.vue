<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toCategorySlugPreview } from '@/features/categories/utils/category-slug'
import { masterDataErrorMessage } from '../utils/master-data-errors'
import { focusFirstInvalidField } from '../utils/focus-first-invalid-field'
interface NamedRecord {
  id: string
  name: string
  slug: string
}
interface Envelope {
  data: NamedRecord
}
interface Props {
  open: boolean
  mode: 'create' | 'update'
  record: NamedRecord | null
  entityLabel: string
  description: string
  duplicateCodes: readonly string[]
  createAction: (data: { name: string }) => Promise<Envelope>
  updateAction: (id: string, data: { name?: string }) => Promise<Envelope>
}
const props = defineProps<Props>()
const emit = defineEmits<{ 'update:open': [boolean]; saved: [NamedRecord] }>()
const form = reactive({ name: '' })
const errors = reactive<{ name?: string }>({})
const pending = ref(false)
const slug = computed(() => toCategorySlugPreview(form.name))
const formId = computed(() => `${props.entityLabel}-${props.mode}-form`)
function reset() {
  form.name = props.record?.name ?? ''
  delete errors.name
  pending.value = false
}
watch(() => [props.open, props.mode, props.record?.id], reset, {
  immediate: true,
})
watch(
  () => form.name,
  () => {
    delete errors.name
  },
)
async function submit() {
  if (pending.value) return
  const name = form.name.trim().replace(/\s+/g, ' ')
  if (name.length < 2) {
    errors.name = `Tên ${props.entityLabel} phải có ít nhất 2 ký tự.`
    await focusFirstInvalidField(formId.value)
    return
  }
  if (name.length > 120) {
    errors.name = `Tên ${props.entityLabel} không được vượt quá 120 ký tự.`
    await focusFirstInvalidField(formId.value)
    return
  }
  pending.value = true
  try {
    const response =
      props.mode === 'create'
        ? await props.createAction({ name })
        : await props.updateAction(props.record!.id, { name })
    toast.success(
      `${props.mode === 'create' ? 'Tạo' : 'Cập nhật'} ${props.entityLabel} thành công.`,
    )
    emit('saved', response.data)
    emit('update:open', false)
  } catch (error) {
    const message = masterDataErrorMessage(
      error,
      `Không thể lưu ${props.entityLabel}.`,
    )
    const code = (error as { response?: { data?: { code?: string } } })
      ?.response?.data?.code
    if (code && props.duplicateCodes.includes(code)) {
      errors.name = message
      await focusFirstInvalidField(formId.value)
    } else toast.error(message)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"
    ><DialogContent
      class="grid max-h-[92dvh] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0"
      ><DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6"
        ><DialogTitle
          >{{ mode === 'create' ? 'Thêm' : 'Chỉnh sửa' }}
          {{ entityLabel }}</DialogTitle
        ><DialogDescription>{{ description }}</DialogDescription></DialogHeader
      >
      <div class="min-h-0 overflow-hidden">
        <ScrollArea class="h-full"
          ><form
            :id="formId"
            class="grid gap-5 px-5 py-5 sm:px-6"
            novalidate
            @submit.prevent="submit"
          >
            <div class="space-y-2">
              <Label :for="`${formId}-name`">Tên {{ entityLabel }}</Label
              ><Input
                :id="`${formId}-name`"
                v-model="form.name"
                maxlength="120"
                :aria-invalid="Boolean(errors.name)"
                :aria-describedby="errors.name ? `${formId}-name-error` : undefined"
              />
              <p
                v-if="errors.name"
                :id="`${formId}-name-error`"
                class="text-sm text-destructive"
              >
                {{ errors.name }}
              </p>
            </div>
            <div class="space-y-2">
              <Label :for="`${formId}-slug`">Slug</Label
              ><Input
                :id="`${formId}-slug`"
                :model-value="slug"
                readonly
                disabled
              />
              <p class="text-xs text-muted-foreground">
                Backend tự tạo và cập nhật slug từ tên.
              </p>
            </div>
          </form></ScrollArea
        >
      </div>
      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6"
        ><Button
          variant="outline"
          :disabled="pending"
          @click="emit('update:open', false)"
          >Hủy</Button
        ><Button :form="formId" type="submit" :disabled="pending"
          ><LoaderCircle v-if="pending" class="mr-2 h-4 w-4 animate-spin" />{{
            mode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'
          }}</Button
        ></DialogFooter
      ></DialogContent
    ></Dialog
  >
</template>
