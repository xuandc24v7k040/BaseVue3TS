<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import type { ErrorResponseDto } from '@/api/generated/models'
import { useAdminPermissions } from '@/composables/use-admin-permissions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPermissionLabel } from '@/features/permissions/utils/permission-labels'
import { useAuthStore } from '@/stores/auth.store'
import { createRole, updateRole } from '../api/role-api'
import { roleKeys } from '../api/role-query-keys'
import { emptyRoleForm, roleToForm, toCreateRolePayload, toUpdateRolePayload } from '../adapters/role-form.adapter'
import type { RolePermissionPolicyContext } from '../adapters/role-permission.adapter'
import { useRolePermissionEditor } from '../composables/useRolePermissionEditor'
import type { RolePermissionMutationResult } from '../composables/useRolePermissionEditor'
import { ROLE_CODE_MESSAGE, roleFormSchema } from '../schemas/role-form.schema'
import type { Role, RoleFormMode, RoleFormState } from '../types'
import RolePermissionEditorDialog from './RolePermissionEditorDialog.vue'
import RolePermissionField from './RolePermissionField.vue'

const props = withDefaults(defineProps<{
  open: boolean
  mode: RoleFormMode
  role?: Role | null
  openPermissionEditor?: boolean
}>(), {
  role: null,
  openPermissionEditor: false,
})
const emit = defineEmits<{ 'update:open': [open: boolean]; saved: [] }>()
const queryClient = useQueryClient()
const authStore = useAuthStore()
const { permissions: actorPermissionCodes } = useAdminPermissions()
const form = reactive<RoleFormState>(emptyRoleForm())
const errors = reactive<Partial<Record<keyof RoleFormState, string>>>({})
const isSubmitting = ref(false)
const persistedRoleId = ref<string | null>(null)
const rolePersisted = ref(false)
const permissionEditorOpen = ref(false)
const permissionOutcome = ref<RolePermissionMutationResult | null>(null)
const permissionFatalMessage = ref<string | null>(null)
const effectiveRoleId = computed(() => persistedRoleId.value ?? props.role?.id ?? null)
const formLocked = computed(() => Boolean(props.role?.isSystem) || rolePersisted.value)

const permissionEditor = useRolePermissionEditor({
  open: computed(() => props.open),
  roleId: effectiveRoleId,
})

const policyContext = computed<RolePermissionPolicyContext>(() => ({
  isSystemRole: Boolean(props.role?.isSystem),
  isRoleActive: props.role?.isActive ?? true,
  roleGuardName: form.guardName,
  roleLevel: Number.isFinite(Number(form.level)) ? Number(form.level) : 0,
  actorIsSuperAdmin: authStore.user?.isSuperAdmin === true,
  actorMaxRoleLevel: authStore.user?.maxRoleLevel ?? 0,
  actorPermissionCodes: actorPermissionCodes.value,
}))

const serverFieldMessages: Record<keyof RoleFormState, string> = {
  code: 'Mã vai trò không hợp lệ.',
  name: 'Tên vai trò không hợp lệ.',
  description: 'Mô tả vai trò không hợp lệ.',
  type: 'Loại vai trò không hợp lệ.',
  level: 'Cấp độ vai trò không hợp lệ.',
  guardName: 'Guard không hợp lệ.',
}

function reset(): void {
  Object.assign(form, props.mode === 'update' && props.role ? roleToForm(props.role) : emptyRoleForm())
  Object.keys(errors).forEach((key) => delete errors[key as keyof RoleFormState])
  isSubmitting.value = false
  persistedRoleId.value = null
  rolePersisted.value = false
  permissionOutcome.value = null
  permissionFatalMessage.value = null
  permissionEditorOpen.value = props.open && props.openPermissionEditor
  permissionEditor.resetDraft(props.mode === 'update' ? props.role?.id ?? null : null)
}
watch(
  () => [props.open, props.mode, props.role?.id, props.openPermissionEditor],
  reset,
  { immediate: true },
)

async function validateField(field: keyof RoleFormState): Promise<void> {
  if (!errors[field]) return
  await nextTick()
  const result = roleFormSchema.safeParse(form)
  const issue = result.success ? undefined : result.error.issues.find((item) => item.path[0] === field)
  if (issue) errors[field] = issue.message
  else delete errors[field]
}

function setType(value: unknown): void {
  if (value === 'SYSTEM' || value === 'BRANCH' || value === 'CUSTOMER') form.type = value
  validateField('type')
}

function applyValidationErrors(issues: readonly { path: PropertyKey[]; message: string }[]): void {
  Object.keys(errors).forEach((key) => delete errors[key as keyof RoleFormState])
  issues.forEach((issue) => {
    const field = issue.path[0]
    if (typeof field === 'string' && field in form && !errors[field as keyof RoleFormState]) {
      errors[field as keyof RoleFormState] = issue.message
    }
  })
}

function mapServerErrors(error: unknown): void {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return
  const fieldErrors = error.response?.data.errors
  if (fieldErrors) Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (!(field in form)) return
    const roleField = field as keyof RoleFormState
    const raw = messages[0] ?? ''
    errors[roleField] = roleField === 'code' && /match|regex|regular expression/i.test(raw)
      ? ROLE_CODE_MESSAGE
      : serverFieldMessages[roleField]
  })
  if (error.response?.status === 409) errors.code = 'Mã vai trò đã tồn tại.'
}

function failedPermissionLabels(result: RolePermissionMutationResult): string[] {
  return result.items
    .filter(({ success }) => !success)
    .map(({ permission }) => formatPermissionLabel(permission))
}

async function finishSuccess(roleId: string, changedMetadata: boolean, permissionChanges: number): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
  await queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) })
  if (!changedMetadata && permissionChanges === 0) toast.info('Không có thay đổi quyền hạn.')
  else toast.success(props.mode === 'create' ? 'Đã tạo vai trò và lưu quyền hạn.' : 'Đã cập nhật vai trò và quyền hạn.')
  emit('saved')
  emit('update:open', false)
}

async function submit(): Promise<void> {
  if (isSubmitting.value || props.role?.isSystem) return
  const result = roleFormSchema.safeParse(form)
  if (!result.success) {
    applyValidationErrors(result.error.issues)
    toast.error('Vui lòng kiểm tra lại thông tin vai trò.')
    return
  }
  if (!permissionEditor.isReady.value) {
    toast.error('Dữ liệu quyền hạn chưa tải hoàn tất. Vui lòng thử lại.')
    return
  }

  isSubmitting.value = true
  permissionOutcome.value = null
  permissionFatalMessage.value = null
  let changedMetadata = false

  try {
    let roleId = effectiveRoleId.value
    if (!rolePersisted.value) {
      if (props.mode === 'create') {
        const created = await createRole(toCreateRolePayload(result.data))
        roleId = created.data.id
        persistedRoleId.value = roleId
        permissionEditor.adoptCreatedRole(roleId)
        changedMetadata = true
      } else if (props.role) {
        const payload = toUpdateRolePayload(result.data, props.role)
        if (Object.keys(payload).length) {
          await updateRole(props.role.id, payload)
          changedMetadata = true
        }
        roleId = props.role.id
      }
      rolePersisted.value = true
    }

    if (!roleId) throw new Error('Không xác định được vai trò cần cập nhật quyền.')
    const outcome = await permissionEditor.persistPermissions(roleId, policyContext.value)
    permissionOutcome.value = outcome
    if (outcome.failureCount > 0) {
      await queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) })
      toast.error(
        `${props.mode === 'create' ? 'Vai trò đã được tạo' : 'Thông tin vai trò đã được lưu'}, nhưng ${outcome.failureCount} quyền cập nhật thất bại.`,
      )
      return
    }
    await finishSuccess(roleId, changedMetadata, outcome.total)
  } catch (error) {
    if (!rolePersisted.value) mapServerErrors(error)
    const message = axios.isAxiosError<ErrorResponseDto>(error)
      ? error.response?.data.message
      : error instanceof Error
        ? error.message
        : undefined
    if (rolePersisted.value) {
      permissionFatalMessage.value = message || 'Vai trò đã được lưu nhưng chưa thể đồng bộ quyền hạn. Vui lòng thử lại.'
    }
    toast.error(message || 'Không thể lưu vai trò. Vui lòng thử lại.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="grid max-h-[90dvh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0">
      <DialogHeader class="shrink-0 border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>{{ mode === 'create' ? 'Tạo vai trò' : 'Cập nhật vai trò' }}</DialogTitle>
        <DialogDescription>{{ mode === 'create' ? 'Tạo vai trò tùy chỉnh và chọn quyền hạn ban đầu.' : 'Chỉnh sửa thông tin và quyền hạn của vai trò tùy chỉnh.' }}</DialogDescription>
      </DialogHeader>
      <div class="min-h-0 overflow-hidden"><ScrollArea class="h-full">
          <form id="role-form" class="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6" novalidate @submit.prevent="submit">
            <div
              v-if="permissionOutcome?.failureCount || permissionFatalMessage"
              class="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:col-span-2"
              role="alert"
            >
              <p class="font-medium">Vai trò đã được lưu, nhưng quyền hạn chưa đồng bộ hoàn toàn.</p>
              <p v-if="permissionOutcome" class="text-sm text-muted-foreground">
                Thành công {{ permissionOutcome.successCount }}/{{ permissionOutcome.total }}.
                Thất bại: {{ failedPermissionLabels(permissionOutcome).join(', ') || 'không xác định' }}.
              </p>
              <p v-if="permissionFatalMessage" class="text-sm text-destructive">{{ permissionFatalMessage }}</p>
              <p class="text-xs text-muted-foreground">Trạng thái hiện tại đã được tải lại từ máy chủ. Bấm “Thử lại quyền hạn” để chỉ retry phần còn thiếu.</p>
            </div>

            <div class="space-y-2"><Label for="role-code">Mã vai trò</Label><Input id="role-code" v-model="form.code" autocomplete="off" :disabled="formLocked" :aria-invalid="Boolean(errors.code)" @input="validateField('code')" /><p v-if="errors.code" role="alert" class="text-sm text-destructive">{{ errors.code }}</p></div>
            <div class="space-y-2"><Label for="role-name">Tên vai trò</Label><Input id="role-name" v-model="form.name" :disabled="formLocked" :aria-invalid="Boolean(errors.name)" @input="validateField('name')" /><p v-if="errors.name" role="alert" class="text-sm text-destructive">{{ errors.name }}</p></div>
            <div class="space-y-2"><Label for="role-type">Loại vai trò</Label><Select :model-value="form.type" :disabled="formLocked" @update:model-value="setType"><SelectTrigger id="role-type" class="w-full" :aria-invalid="Boolean(errors.type)"><SelectValue placeholder="Chọn loại vai trò" /></SelectTrigger><SelectContent><SelectItem value="SYSTEM">Hệ thống</SelectItem><SelectItem value="BRANCH">Chi nhánh</SelectItem><SelectItem value="CUSTOMER">Khách hàng</SelectItem></SelectContent></Select><p v-if="errors.type" role="alert" class="text-sm text-destructive">{{ errors.type }}</p></div>
            <div class="space-y-2"><Label for="role-level">Cấp độ</Label><Input id="role-level" v-model="form.level" type="number" min="1" max="99" step="1" :disabled="formLocked" :aria-invalid="Boolean(errors.level)" @input="validateField('level')" /><p v-if="errors.level" role="alert" class="text-sm text-destructive">{{ errors.level }}</p></div>
            <div class="space-y-2 sm:col-span-2"><Label for="role-guard">Guard</Label><Input id="role-guard" v-model="form.guardName" readonly aria-readonly="true" class="bg-muted" :aria-invalid="Boolean(errors.guardName)" /><p class="text-xs text-muted-foreground">Contract hiện chỉ hỗ trợ guard web.</p><p v-if="errors.guardName" role="alert" class="text-sm text-destructive">{{ errors.guardName }}</p></div>

            <RolePermissionField
              class="sm:col-span-2"
              :selected-count="permissionEditor.selectedIds.value.size"
              :loading="permissionEditor.isLoading.value"
              :error="permissionEditor.isError.value"
              :read-only="Boolean(role?.isSystem)"
              :disabled="rolePersisted"
              @open="permissionEditorOpen = true"
            />

            <div class="space-y-2 sm:col-span-2"><Label for="role-description">Mô tả</Label><textarea id="role-description" v-model="form.description" rows="4" :disabled="formLocked" class="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50" @input="validateField('description')" /><p v-if="errors.description" role="alert" class="text-sm text-destructive">{{ errors.description }}</p></div>

            <p v-if="permissionEditor.progressTotal.value" class="text-sm text-muted-foreground sm:col-span-2" aria-live="polite">
              Đang cập nhật quyền {{ permissionEditor.progressCurrent.value }}/{{ permissionEditor.progressTotal.value }}...
            </p>
          </form>
        </ScrollArea></div>
      <DialogFooter class="shrink-0 flex-col-reverse border-t bg-background px-5 py-4 sm:flex-row sm:px-6">
        <Button type="button" variant="outline" class="w-full sm:w-auto" :disabled="isSubmitting" @click="emit('update:open', false)">Hủy</Button>
        <Button form="role-form" type="submit" class="w-full sm:w-auto" :disabled="isSubmitting || Boolean(role?.isSystem) || !permissionEditor.isReady.value">
          <LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
          {{ rolePersisted ? 'Thử lại quyền hạn' : mode === 'create' ? 'Tạo vai trò' : 'Lưu thay đổi' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <RolePermissionEditorDialog
    v-model:open="permissionEditorOpen"
    :role-name="form.name"
    :role-code="form.code"
    :catalog="permissionEditor.catalog.value"
    :selected-ids="permissionEditor.selectedIds.value"
    :policy-context="policyContext"
    :loading="permissionEditor.isLoading.value"
    :error="permissionEditor.isError.value"
    @apply="permissionEditor.applyDraft"
    @retry="permissionEditor.retryQueries"
  />
</template>
