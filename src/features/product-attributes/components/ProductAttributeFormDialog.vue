<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import type {
  CreateProductAttributeDto,
  ProductAttributeResponseDto,
  ProductAttributeResponseDtoType,
  UpdateProductAttributeDto,
} from '@/api/generated/models'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  masterDataErrorCode,
  masterDataErrorMessage,
} from '@/features/product-master-data/utils/master-data-errors'
import { PRODUCT_ATTRIBUTE_TYPE_OPTIONS } from '@/features/product-master-data/utils/master-data-labels'
import { focusFirstInvalidField } from '@/features/product-master-data/utils/focus-first-invalid-field'
import {
  createProductAttribute,
  updateProductAttribute,
} from '../api/product-attribute-api'
import { productAttributeKeys } from '../api/product-attribute-query-keys'
const props = defineProps<{
  open: boolean
  mode: 'create' | 'update'
  attribute: ProductAttributeResponseDto | null
}>()
const emit = defineEmits<{
    'update:open': [boolean]
    saved: [ProductAttributeResponseDto]
  }>(),
  client = useQueryClient(),
  pending = ref(false),
  form = reactive<{
    name: string
    code: string
    type: ProductAttributeResponseDtoType | ''
  }>({ name: '', code: '', type: '' }),
  errors = reactive<{
    name?: string
    code?: string
    type?: string
  }>({}),
  used = computed(
    () => props.mode === 'update' && (props.attribute?.usageCount ?? 0) > 0,
  ),
  formId = computed(() => `product-attribute-${props.mode}-form`)
function reset() {
  Object.assign(form, {
    name: props.attribute?.name ?? '',
    code: props.attribute?.code ?? '',
    type: props.attribute?.type ?? '',
  })
  Object.keys(errors).forEach((k) => delete errors[k as keyof typeof errors])
  pending.value = false
}
watch(() => [props.open, props.mode, props.attribute?.id], reset, {
  immediate: true,
})
watch(
  () => ({ ...form }),
  (n, p) => {
    if (!p) return
    ;(Object.keys(n) as ('name' | 'code' | 'type')[]).forEach((f) => {
      if (n[f] !== p[f]) {
        delete errors[f]
      }
    })
  },
)
function setType(value: unknown) {
  if (typeof value === 'string')
    form.type = value as ProductAttributeResponseDtoType
}
function normalizeCode() {
  form.code = form.code
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Đđ]/g, 'D')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}
async function submit() {
  if (pending.value) return
  Object.keys(errors).forEach((k) => delete errors[k as keyof typeof errors])
  const name = form.name.trim().replace(/\s+/g, ' ')
  normalizeCode()
  if (name.length < 2) errors.name = 'Tên thuộc tính phải có ít nhất 2 ký tự.'
  else if (name.length > 120)
    errors.name = 'Tên thuộc tính không được vượt quá 120 ký tự.'
  if (!form.code) errors.code = 'Vui lòng nhập mã thuộc tính.'
  else if (form.code.length > 64)
    errors.code = 'Mã thuộc tính không được vượt quá 64 ký tự.'
  else if (!/^[A-Z][A-Z0-9_]*$/.test(form.code))
    errors.code =
      'Mã thuộc tính phải bắt đầu bằng chữ cái và chỉ gồm chữ in hoa, số, dấu gạch dưới.'
  if (!form.type) errors.type = 'Vui lòng chọn kiểu dữ liệu.'
  if (errors.name || errors.code || errors.type) {
    await focusFirstInvalidField(formId.value)
    return
  }
  pending.value = true
  const data: CreateProductAttributeDto = {
    name,
    code: form.code,
    type: form.type as ProductAttributeResponseDtoType,
  }
  try {
    const response =
      props.mode === 'create'
        ? await createProductAttribute(data)
        : await updateProductAttribute(
            props.attribute!.id,
            data as UpdateProductAttributeDto,
          )
    await client.invalidateQueries({ queryKey: productAttributeKeys.all })
    toast.success(
      props.mode === 'create'
        ? 'Tạo thuộc tính sản phẩm thành công.'
        : 'Cập nhật thuộc tính sản phẩm thành công.',
    )
    emit('saved', response.data)
    emit('update:open', false)
  } catch (e) {
    const code = masterDataErrorCode(e),
      message = masterDataErrorMessage(e, 'Không thể lưu thuộc tính sản phẩm.')
    if (code === 'PRODUCT_ATTRIBUTE_NAME_ALREADY_EXISTS') errors.name = message
    else if (
      code === 'PRODUCT_ATTRIBUTE_CODE_ALREADY_EXISTS' ||
      code === 'PRODUCT_ATTRIBUTE_CODE_CHANGE_REQUIRES_UNUSED'
    )
      errors.code = message
    else if (code === 'PRODUCT_ATTRIBUTE_TYPE_CHANGE_REQUIRES_UNUSED')
      errors.type = message
    else toast.error(message)
    if (errors.name || errors.code || errors.type)
      await focusFirstInvalidField(formId.value)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"
    ><DialogContent
      class="grid max-h-[92dvh] max-w-xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0"
      ><DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6"
        ><DialogTitle>{{
          mode === 'create'
            ? 'Thêm thuộc tính sản phẩm'
            : 'Chỉnh sửa thuộc tính sản phẩm'
        }}</DialogTitle
        ><DialogDescription
          >Attribute mô tả sản phẩm và không tạo Variant hoặc
          SKU.</DialogDescription
        ></DialogHeader
      >
      <div class="min-h-0 overflow-hidden">
        <ScrollArea class="h-full"
          ><form
            :id="formId"
            class="grid gap-5 px-5 py-5 sm:px-6"
            @submit.prevent="submit"
          >
            <div class="space-y-2">
              <Label for="attribute-name">Tên thuộc tính</Label
              ><Input
                id="attribute-name"
                v-model="form.name"
                maxlength="120"
                :aria-invalid="Boolean(errors.name)"
                :aria-describedby="errors.name ? 'attribute-name-error' : undefined"
              />
              <p
                v-if="errors.name"
                id="attribute-name-error"
                class="text-sm text-destructive"
              >
                {{ errors.name }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="attribute-code">Mã thuộc tính</Label
              ><Input
                id="attribute-code"
                v-model="form.code"
                maxlength="64"
                :disabled="used"
                :aria-invalid="Boolean(errors.code)"
                :aria-describedby="errors.code ? 'attribute-code-error' : undefined"
                @blur="normalizeCode"
              />
              <p class="text-xs text-muted-foreground">
                {{
                  used
                    ? 'Không thể đổi mã khi thuộc tính đang được sử dụng.'
                    : 'Mã kỹ thuật ổn định, tự chuẩn hóa dạng UPPER_SNAKE_CASE.'
                }}
              </p>
              <p
                v-if="errors.code"
                id="attribute-code-error"
                class="text-sm text-destructive"
              >
                {{ errors.code }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="attribute-type">Kiểu dữ liệu</Label
              ><Select
                :model-value="form.type || undefined"
                :disabled="used"
                @update:model-value="setType"
                ><SelectTrigger
                  id="attribute-type"
                  :aria-invalid="Boolean(errors.type)"
                  :aria-describedby="errors.type ? 'attribute-type-error' : undefined"
                  ><SelectValue
                    placeholder="Chọn kiểu dữ liệu" /></SelectTrigger
                ><SelectContent
                  ><SelectItem
                    v-for="option in PRODUCT_ATTRIBUTE_TYPE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                    >{{ option.label }}</SelectItem
                  ></SelectContent
                ></Select
              >
              <p v-if="used" class="text-xs text-muted-foreground">
                Không thể đổi kiểu khi thuộc tính đang được sử dụng.
              </p>
              <p
                v-if="errors.type"
                id="attribute-type-error"
                class="text-sm text-destructive"
              >
                {{ errors.type }}
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
            mode === 'create' ? 'Tạo thuộc tính' : 'Lưu thay đổi'
          }}</Button
        ></DialogFooter
      ></DialogContent
    ></Dialog
  >
</template>
