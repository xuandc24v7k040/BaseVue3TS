<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import type {
  CreateSupplierDto,
  SupplierResponseDto,
  UpdateSupplierDto,
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
import { toCategorySlugPreview } from '@/features/categories/utils/category-slug'
import { focusFirstInvalidField } from '@/features/product-master-data/utils/focus-first-invalid-field'
import {
  masterDataErrorCode,
  masterDataErrorMessage,
} from '@/features/product-master-data/utils/master-data-errors'
import { createSupplier, updateSupplier } from '../api/supplier-api'
import { supplierKeys } from '../api/supplier-query-keys'
import {
  supplierFormSchema,
  type SupplierForm,
} from '../schemas/supplier-form.schema'
const props = defineProps<{
  open: boolean
  mode: 'create' | 'update'
  supplier: SupplierResponseDto | null
}>()
const emit = defineEmits<{
  'update:open': [boolean]
  saved: [SupplierResponseDto]
}>()
const client = useQueryClient(),
  pending = ref(false),
  form = reactive<SupplierForm>({
    name: '',
    phone: '',
    email: '',
    address: '',
  }),
  errors = reactive<Partial<Record<keyof SupplierForm, string>>>({}),
  formId = computed(() => `supplier-${props.mode}-form`),
  slug = computed(() => toCategorySlugPreview(form.name))
function reset() {
  Object.assign(form, {
    name: props.supplier?.name ?? '',
    phone: props.supplier?.phone ?? '',
    email: props.supplier?.email ?? '',
    address: props.supplier?.address ?? '',
  })
  Object.keys(errors).forEach((k) => delete errors[k as keyof typeof errors])
  pending.value = false
}
watch(() => [props.open, props.mode, props.supplier?.id], reset, {
  immediate: true,
})
watch(
  () => ({ ...form }),
  (n, p) => {
    if (!p) return
    ;(Object.keys(n) as (keyof SupplierForm)[]).forEach((f) => {
      if (n[f] !== p[f]) {
        delete errors[f]
      }
    })
  },
)
async function submit() {
  if (pending.value) return
  Object.keys(errors).forEach((k) => delete errors[k as keyof typeof errors])
  const parsed = supplierFormSchema.safeParse(form)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof SupplierForm
      if (!errors[field]) errors[field] = issue.message
    }
    await focusFirstInvalidField(formId.value)
    return
  }
  pending.value = true
  const data: CreateSupplierDto = {
    name: parsed.data.name,
    ...(parsed.data.phone ? { phone: parsed.data.phone } : { phone: null }),
    ...(parsed.data.email
      ? { email: parsed.data.email.toLowerCase() }
      : { email: null }),
    ...(parsed.data.address
      ? { address: parsed.data.address }
      : { address: null }),
  }
  try {
    const response =
      props.mode === 'create'
        ? await createSupplier(data)
        : await updateSupplier(props.supplier!.id, data as UpdateSupplierDto)
    await client.invalidateQueries({ queryKey: supplierKeys.all })
    toast.success(
      props.mode === 'create'
        ? 'Tạo nhà cung cấp thành công.'
        : 'Cập nhật nhà cung cấp thành công.',
    )
    emit('saved', response.data)
    emit('update:open', false)
  } catch (error) {
    const code = masterDataErrorCode(error)
    if (
      code === 'SUPPLIER_NAME_ALREADY_EXISTS' ||
      code === 'SUPPLIER_SLUG_ALREADY_EXISTS'
    ) {
      errors.name = masterDataErrorMessage(
        error,
        'Tên nhà cung cấp đã tồn tại.',
      )
      await focusFirstInvalidField(formId.value)
    } else
      toast.error(masterDataErrorMessage(error, 'Không thể lưu nhà cung cấp.'))
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"
    ><DialogContent
      class="grid max-h-[92dvh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0"
      ><DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6"
        ><DialogTitle>{{
          mode === 'create' ? 'Thêm nhà cung cấp' : 'Chỉnh sửa nhà cung cấp'
        }}</DialogTitle
        ><DialogDescription
          >Quản lý thông tin liên hệ của nhà cung cấp toàn hệ
          thống.</DialogDescription
        ></DialogHeader
      >
      <div class="min-h-0 overflow-hidden">
        <ScrollArea class="h-full"
          ><form
            :id="formId"
            class="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6"
            novalidate
            @submit.prevent="submit"
          >
            <div class="space-y-2">
              <Label for="supplier-name">Tên nhà cung cấp</Label
              ><Input
                id="supplier-name"
                v-model="form.name"
                maxlength="120"
                :aria-invalid="Boolean(errors.name)"
                :aria-describedby="errors.name ? 'supplier-name-error' : undefined"
              />
              <p
                v-if="errors.name"
                id="supplier-name-error"
                class="text-sm text-destructive"
              >
                {{ errors.name }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="supplier-slug">Slug</Label
              ><Input
                id="supplier-slug"
                :model-value="slug"
                readonly
                disabled
              />
              <p class="text-xs text-muted-foreground">
                Backend tự tạo và cập nhật slug từ tên.
              </p>
            </div>
            <div class="space-y-2">
              <Label for="supplier-phone">Số điện thoại</Label
              ><Input
                id="supplier-phone"
                v-model="form.phone"
                maxlength="20"
                :aria-invalid="Boolean(errors.phone)"
                :aria-describedby="errors.phone ? 'supplier-phone-error' : undefined"
              />
              <p
                v-if="errors.phone"
                id="supplier-phone-error"
                class="text-sm text-destructive"
              >
                {{ errors.phone }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="supplier-email">Email</Label
              ><Input
                id="supplier-email"
                v-model="form.email"
                type="email"
                maxlength="254"
                :aria-invalid="Boolean(errors.email)"
                :aria-describedby="errors.email ? 'supplier-email-error' : undefined"
              />
              <p
                v-if="errors.email"
                id="supplier-email-error"
                class="text-sm text-destructive"
              >
                {{ errors.email }}
              </p>
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="supplier-address">Địa chỉ</Label
              ><textarea
                id="supplier-address"
                v-model="form.address"
                rows="4"
                maxlength="500"
                class="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                :aria-invalid="Boolean(errors.address)"
                :aria-describedby="errors.address ? 'supplier-address-error' : undefined"
              />
              <p
                v-if="errors.address"
                id="supplier-address-error"
                class="text-sm text-destructive"
              >
                {{ errors.address }}
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
            mode === 'create' ? 'Tạo nhà cung cấp' : 'Lưu thay đổi'
          }}</Button
        ></DialogFooter
      ></DialogContent
    ></Dialog
  >
</template>
