<script setup lang="ts">
import axios from 'axios'
import { computed, ref, watch, type Ref } from 'vue'
import { AlertTriangle, LoaderCircle, MapPin } from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useForm, type GenericValidateFunction } from 'vee-validate'
import { toast } from 'vue-sonner'
import { authKeys } from '@/api/keys/auth.key'
import type { ErrorResponseDto } from '@/api/generated/models'
import { Badge } from '@/components/ui/badge'
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
import { branchKeys } from '../api/branch-query-keys'
import { createBranch, updateBranch } from '../api/branch-api'
import { findUniqueAdministrativeUnit } from '../adapters/administrative-unit.adapter'
import {
  branchToForm,
  emptyBranchForm,
  formToLocation,
  toCreatePayload,
  toUpdatePayload,
  validateBranchForm,
} from '../adapters/branch-form.adapter'
import {
  useVietnamProvinces,
  useVietnamWards,
} from '../composables/use-vietnam-administrative-units'
import { BRANCH_CODE_FORMAT_MESSAGE } from '../schemas/branch-form.schema'
import type { Branch, BranchFormMode, BranchFormState, BranchLocation } from '../types'
import BranchAdministrativeUnitCombobox from './BranchAdministrativeUnitCombobox.vue'
import BranchLocationPickerDialog from './BranchLocationPickerDialog.vue'

const props = defineProps<{
  open: boolean
  mode: BranchFormMode
  branch?: Branch | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

type BranchFormField = keyof BranchFormState

const queryClient = useQueryClient()
const committedLocation = ref<BranchLocation | null>(null)
const candidateLocation = ref<BranchLocation | null>(null)
const pickerOpen = ref(false)
const isSubmitting = ref(false)
const selectedProvinceCode = ref<number | null>(null)
const selectedWardCode = ref<number | null>(null)
const pendingWardName = ref('')

function fieldValidator(field: BranchFormField): GenericValidateFunction {
  return (value, context) => {
    const form = {
      ...(context.form as unknown as BranchFormState),
      [field]: value,
    }
    const result = validateBranchForm(form)
    if (result.success) return true
    return result.error.issues.find((issue) => issue.path[0] === field)?.message ?? true
  }
}

const {
  defineField,
  errors,
  resetForm,
  setErrors,
  setFieldError,
  setFieldValue,
  validate,
  validateField,
  values,
} = useForm<BranchFormState>({
  initialValues: emptyBranchForm(),
  validateOnMount: false,
  validationSchema: {
    code: fieldValidator('code'),
    name: fieldValidator('name'),
    phone: fieldValidator('phone'),
    province: fieldValidator('province'),
    ward: fieldValidator('ward'),
    address: fieldValidator('address'),
    latitude: fieldValidator('latitude'),
    longitude: fieldValidator('longitude'),
    isActive: fieldValidator('isActive'),
  },
})

const fieldOptions = { validateOnModelUpdate: true }
const [code] = defineField('code', fieldOptions)
const [name] = defineField('name', fieldOptions)
const [phone] = defineField('phone', fieldOptions)
const [province] = defineField('province', fieldOptions)
const [ward] = defineField('ward', fieldOptions)
const [address] = defineField('address', fieldOptions)

function revalidateExistingError(field: BranchFormField, source: Ref<unknown>): void {
  watch(source, () => {
    if (errors.value[field]) void validateField(field)
  })
}

revalidateExistingError('code', code)
revalidateExistingError('name', name)
revalidateExistingError('phone', phone)
revalidateExistingError('province', province)
revalidateExistingError('ward', ward)
revalidateExistingError('address', address)

function updateTextField(field: 'code' | 'name' | 'phone' | 'address', value: string | number): void {
  setFieldError(field, undefined)
  setFieldValue(field, String(value), true)
}

function updateStatus(value: unknown): void {
  setFieldValue('isActive', value !== 'false', true)
}

const provincesQuery = useVietnamProvinces()
const wardsQuery = useVietnamWards(selectedProvinceCode)
const provinces = computed(() => provincesQuery.data.value ?? [])
const wards = computed(() => wardsQuery.data.value ?? [])
const hasUnmatchedProvince = computed(() => Boolean(province.value && !selectedProvinceCode.value && !provincesQuery.isPending.value))
const hasUnmatchedWard = computed(() => Boolean(ward.value && selectedProvinceCode.value && !selectedWardCode.value && !wardsQuery.isPending.value))

watch(
  () => props.open,
  () => resetState(),
)

watch(provinces, () => matchProvinceFromName())
watch(wards, () => matchWardFromName())

function resetState(): void {
  const form = props.mode === 'update' && props.branch
    ? branchToForm(props.branch)
    : emptyBranchForm()
  resetForm({ values: form, errors: {}, touched: {}, submitCount: 0 })
  committedLocation.value = formToLocation(form)
  candidateLocation.value = null
  pickerOpen.value = false
  isSubmitting.value = false
  selectedProvinceCode.value = null
  selectedWardCode.value = null
  pendingWardName.value = form.ward
  matchProvinceFromName()
}

function matchProvinceFromName(): void {
  if (!province.value || selectedProvinceCode.value !== null) return
  const match = findUniqueAdministrativeUnit(provinces.value, province.value)
  if (!match) return
  selectedProvinceCode.value = match.code
  pendingWardName.value = ward.value
  matchWardFromName()
}

function matchWardFromName(): void {
  const nameToMatch = pendingWardName.value || ward.value
  if (!nameToMatch || selectedProvinceCode.value === null) return
  const match = findUniqueAdministrativeUnit(wards.value, nameToMatch)
  if (!match) return
  selectedWardCode.value = match.code
  pendingWardName.value = ''
}

function onProvinceChange(codeValue: number): void {
  const selected = provinces.value.find((item) => item.code === codeValue)
  if (!selected) return
  selectedProvinceCode.value = selected.code
  selectedWardCode.value = null
  pendingWardName.value = ''
  setFieldValue('province', selected.name, true)
  setFieldValue('ward', '', false)
  setFieldError('ward', undefined)
}

function onWardChange(codeValue: number): void {
  const selected = wards.value.find((item) => item.code === codeValue)
  if (!selected) return
  selectedWardCode.value = selected.code
  setFieldValue('ward', selected.name, true)
}

async function applyLocationToForm(location: BranchLocation): Promise<void> {
  setFieldValue('latitude', location.latitude, false)
  setFieldValue('longitude', location.longitude, false)
  setFieldValue('province', location.province ?? '', true)
  setFieldValue('ward', location.ward ?? '', true)
  setFieldValue('address', location.address, true)
  await Promise.all([validateField('latitude'), validateField('longitude')])

  selectedProvinceCode.value = null
  selectedWardCode.value = null
  pendingWardName.value = location.ward ?? ''
  matchProvinceFromName()
}

async function onLocationConfirmed(location: BranchLocation): Promise<void> {
  if (props.mode === 'create') {
    await applyLocationToForm(location)
    committedLocation.value = { ...location }
  } else {
    candidateLocation.value = { ...location }
  }
}

async function onLocationCleared(): Promise<void> {
  setFieldValue('latitude', null, false)
  setFieldValue('longitude', null, false)
  await Promise.all([validateField('latitude'), validateField('longitude')])
  committedLocation.value = null
  candidateLocation.value = null
}

async function applyCandidate(): Promise<void> {
  if (!candidateLocation.value) return
  await applyLocationToForm(candidateLocation.value)
  committedLocation.value = { ...candidateLocation.value }
  candidateLocation.value = null
}

function close(): void {
  emit('update:open', false)
}

function mapServerErrors(error: unknown): void {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return
  const serverErrors = error.response?.data.errors
  if (!serverErrors) return
  Object.entries(serverErrors).forEach(([field, messages]) => {
    const message = messages[0] ?? 'Dữ liệu không hợp lệ'
    const friendlyMessage = field === 'code' && /must match|regular expression|regex/i.test(message)
      ? BRANCH_CODE_FORMAT_MESSAGE
      : message
    setFieldError(field as BranchFormField, friendlyMessage)
  })
}

async function submit(): Promise<void> {
  if (isSubmitting.value) return
  const validation = await validate()
  const result = validateBranchForm(values)
  if (!validation.valid || !result.success) {
    if (!result.success) {
      const nextErrors: Partial<Record<BranchFormField, string>> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as BranchFormField | undefined
        if (field && !nextErrors[field]) nextErrors[field] = issue.message
      })
      setErrors(nextErrors)
    }
    toast.error('Vui lòng kiểm tra lại thông tin chi nhánh.')
    return
  }

  isSubmitting.value = true
  try {
    if (props.mode === 'create') {
      await createBranch(toCreatePayload(result.data))
      toast.success('Đã tạo chi nhánh.')
    } else if (props.branch) {
      await updateBranch(props.branch.id, toUpdatePayload(result.data))
      toast.success('Đã cập nhật chi nhánh.')
      await queryClient.invalidateQueries({ queryKey: branchKeys.detail(null, props.branch.id) })
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: branchKeys.options() }),
      queryClient.invalidateQueries({ queryKey: authKeys.me }),
    ])
    emit('saved')
    close()
  } catch (error) {
    mapServerErrors(error)
    const message = axios.isAxiosError<ErrorResponseDto>(error)
      ? error.response?.data.message
      : undefined
    toast.error(message || 'Không thể lưu chi nhánh. Vui lòng thử lại.')
  } finally {
    isSubmitting.value = false
  }
}

defineExpose({ submit })
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex h-[min(90dvh,900px)] max-h-[calc(100dvh-2rem)] max-w-5xl flex-col overflow-hidden p-0">
      <DialogHeader class="shrink-0 border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>{{ mode === 'create' ? 'Tạo mới chi nhánh' : 'Cập nhật chi nhánh' }}</DialogTitle>
        <DialogDescription>
          Nhập thông tin liên hệ, địa chỉ hai cấp và vị trí chính xác của chi nhánh.
        </DialogDescription>
      </DialogHeader>

      <div class="flex h-0 min-h-0 flex-1 flex-col overflow-hidden [&_[data-slot=scroll-area-thumb]]:bg-muted-foreground/45">
        <ScrollArea type="auto" class="h-full min-h-0 w-full flex-1 overflow-hidden">
          <div class="px-5 pb-6 pt-5 sm:px-6">
            <div class="grid gap-6 lg:grid-cols-2">
            <section class="space-y-4">
              <h3 class="border-b pb-2 font-semibold">Thông tin chung & Liên hệ</h3>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label for="branch-code">Mã chi nhánh</Label>
                  <Input
                    id="branch-code"
                    :model-value="code"
                    @update:model-value="updateTextField('code', $event)"
                    :readonly="mode === 'update'"
                    :aria-readonly="mode === 'update'"
                    :aria-invalid="Boolean(errors.code)"
                    :class="mode === 'update' && 'cursor-not-allowed bg-muted text-muted-foreground'"
                  />
                  <p v-if="errors.code" class="text-sm text-destructive">{{ errors.code }}</p>
                </div>
                <div class="space-y-2">
                  <Label for="branch-name">Tên chi nhánh</Label>
                  <Input
                    id="branch-name"
                    :model-value="name"
                    :aria-invalid="Boolean(errors.name)"
                    @update:model-value="updateTextField('name', $event)"
                  />
                  <p v-if="errors.name" class="text-sm text-destructive">{{ errors.name }}</p>
                </div>
                <div class="space-y-2 sm:col-span-2">
                  <Label for="branch-phone">Số điện thoại</Label>
                  <Input
                    id="branch-phone"
                    :model-value="phone"
                    inputmode="tel"
                    :aria-invalid="Boolean(errors.phone)"
                    @update:model-value="updateTextField('phone', $event)"
                  />
                  <p v-if="errors.phone" class="text-sm text-destructive">{{ errors.phone }}</p>
                </div>
                <div class="space-y-2 sm:col-span-2">
                  <Label for="branch-status">Trạng thái hoạt động</Label>
                  <Select
                    :model-value="values.isActive ? 'true' : 'false'"
                    @update:model-value="updateStatus"
                  >
                    <SelectTrigger id="branch-status" class="w-full">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Đang hoạt động</SelectItem>
                      <SelectItem value="false">Ngừng hoạt động</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section class="space-y-4">
              <h3 class="border-b pb-2 font-semibold">Vị trí địa lý</h3>
              <div class="space-y-2">
                <Label>Vị trí tọa độ chi nhánh</Label>
                <button
                  type="button"
                  class="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :aria-invalid="Boolean(errors.latitude || errors.longitude)"
                  @click="pickerOpen = true"
                >
                  <span class="flex min-w-0 items-center gap-2">
                    <MapPin class="h-4 w-4 shrink-0 text-primary" />
                    <span v-if="committedLocation" class="truncate">
                      Vĩ độ: {{ committedLocation.latitude.toFixed(6) }}, Kinh độ: {{ committedLocation.longitude.toFixed(6) }}
                    </span>
                    <span v-else class="text-muted-foreground">Chọn vị trí trên bản đồ...</span>
                  </span>
                  <Badge :variant="committedLocation ? 'active' : 'outline'">
                    {{ committedLocation ? 'Đã định vị' : 'Chưa định vị' }}
                  </Badge>
                </button>
                <p v-if="errors.latitude || errors.longitude" class="text-sm text-destructive">
                  {{ errors.latitude || errors.longitude }}
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label>Tỉnh / Thành phố</Label>
                  <BranchAdministrativeUnitCombobox
                    :model-value="selectedProvinceCode"
                    :options="provinces"
                    :fallback-label="province"
                    :loading="provincesQuery.isPending.value"
                    :error="provincesQuery.isError.value"
                    placeholder="Chọn Tỉnh/Thành phố"
                    search-placeholder="Tìm Tỉnh/Thành phố..."
                    @update:model-value="onProvinceChange"
                    @retry="provincesQuery.refetch()"
                  />
                  <p v-if="errors.province" class="text-sm text-destructive">{{ errors.province }}</p>
                </div>
                <div class="space-y-2">
                  <Label>Phường / Xã</Label>
                  <BranchAdministrativeUnitCombobox
                    :model-value="selectedWardCode"
                    :options="wards"
                    :fallback-label="ward"
                    :loading="wardsQuery.isPending.value && selectedProvinceCode !== null"
                    :error="wardsQuery.isError.value"
                    :disabled="selectedProvinceCode === null"
                    placeholder="Chọn Phường/Xã"
                    search-placeholder="Tìm Phường/Xã..."
                    @update:model-value="onWardChange"
                    @retry="wardsQuery.refetch()"
                  />
                  <p v-if="errors.ward" class="text-sm text-destructive">{{ errors.ward }}</p>
                </div>
                <div class="space-y-2 sm:col-span-2">
                  <Label for="branch-address">Địa chỉ chi tiết</Label>
                  <Input
                    id="branch-address"
                    :model-value="address"
                    :aria-invalid="Boolean(errors.address)"
                    @update:model-value="updateTextField('address', $event)"
                  />
                  <p v-if="errors.address" class="text-sm text-destructive">{{ errors.address }}</p>
                </div>
              </div>

              <div
                v-if="hasUnmatchedProvince || hasUnmatchedWard || provincesQuery.isError.value || wardsQuery.isError.value"
                class="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
                <p>Không thể đối chiếu đầy đủ địa chỉ với danh mục hành chính. Dữ liệu hiện tại vẫn được giữ; vui lòng chọn lại khi cần.</p>
              </div>

              <div v-if="candidateLocation" class="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                <p class="font-semibold">Đã phát hiện địa chỉ từ bản đồ</p>
                <p class="mt-1 text-muted-foreground">{{ candidateLocation.displayAddress || 'Chưa nhận diện được địa chỉ' }}</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" @click="applyCandidate">Áp dụng địa chỉ từ bản đồ</Button>
                  <Button type="button" size="sm" variant="ghost" @click="candidateLocation = null">Bỏ qua</Button>
                </div>
              </div>
            </section>
            </div>
          </div>
        </ScrollArea>
      </div>

      <DialogFooter class="shrink-0 border-t bg-background px-5 py-4 sm:px-6">
        <Button type="button" variant="outline" class="w-full sm:w-auto" :disabled="isSubmitting" @click="close">Hủy</Button>
        <Button type="button" class="w-full sm:w-auto" :disabled="isSubmitting" @click="submit">
          <LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
          {{ mode === 'create' ? 'Tạo chi nhánh' : 'Lưu thay đổi' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <BranchLocationPickerDialog
    v-model:open="pickerOpen"
    :initial-location="committedLocation"
    @confirm="onLocationConfirmed"
    @clear="onLocationCleared"
  />
</template>
