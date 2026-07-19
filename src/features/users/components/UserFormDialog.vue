<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { authKeys } from '@/api/keys/auth.key'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore } from '@/stores/auth.store'
import { createUser, updateUser } from '../api/user-api'
import { userKeys } from '../api/user-query-keys'
import { emptyUserForm, toCreateUserPayload, toUpdateUserPayload, userToForm } from '../adapters/user-form.adapter'
import { userFormSchema } from '../schemas/user-form.schema'
import type { User, UserFormMode, UserFormState } from '../types'
import { applyUserServerFieldErrors, userBusinessErrorMessage } from '../utils/user-errors'
import { userProviderLabel, userTypeLabel } from '../utils/user-labels'

const props = withDefaults(defineProps<{ open: boolean; mode: UserFormMode; user?: User | null }>(), { user: null })
const emit = defineEmits<{ 'update:open': [open: boolean]; saved: [user: User] }>()
const queryClient = useQueryClient()
const authStore = useAuthStore()
const form = reactive<UserFormState>(emptyUserForm())
const errors = reactive<Partial<Record<keyof UserFormState, string>>>({})
const rootError = ref('')
const isSubmitting = ref(false)
const formId = computed(() => `user-${props.mode}-form`)

function reset(): void {
  Object.assign(form, props.mode === 'update' && props.user ? userToForm(props.user) : emptyUserForm())
  Object.keys(errors).forEach((key) => delete errors[key as keyof UserFormState])
  rootError.value = ''
  isSubmitting.value = false
}

watch(() => [props.open, props.mode, props.user?.id], reset, { immediate: true })

async function validateField(field: keyof UserFormState): Promise<void> {
  if (!errors[field]) return
  await nextTick()
  const result = userFormSchema.safeParse(form)
  const issue = result.success ? undefined : result.error.issues.find((item) => item.path[0] === field)
  if (issue) errors[field] = issue.message
  else delete errors[field]
}

function applyValidationErrors(issues: readonly { path: PropertyKey[]; message: string }[]): void {
  Object.keys(errors).forEach((key) => delete errors[key as keyof UserFormState])
  issues.forEach((issue) => {
    const field = issue.path[0]
    if (typeof field === 'string' && field in form && !errors[field as keyof UserFormState]) {
      errors[field as keyof UserFormState] = issue.message
    }
  })
  nextTick(() => document.querySelector<HTMLElement>('[data-user-field-error="true"]')?.focus())
}

async function submit(): Promise<void> {
  if (isSubmitting.value) return
  rootError.value = ''
  const result = userFormSchema.safeParse(form)
  if (!result.success) {
    applyValidationErrors(result.error.issues)
    return
  }
  isSubmitting.value = true
  try {
    const response = props.mode === 'create'
      ? await createUser(toCreateUserPayload(result.data))
      : props.user
        ? await updateUser(props.user.id, toUpdateUserPayload(result.data))
        : null
    if (!response) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
      ...(props.user ? [queryClient.invalidateQueries({ queryKey: userKeys.detail(props.user.id) })] : []),
      ...(props.user?.id === authStore.user?.id ? [queryClient.invalidateQueries({ queryKey: authKeys.me })] : []),
    ])
    toast.success(props.mode === 'create' ? 'Đã tạo hồ sơ khách hàng.' : 'Đã cập nhật hồ sơ người dùng.')
    emit('saved', response.data)
    emit('update:open', false)
  } catch (error) {
    applyUserServerFieldErrors(error, errors)
    if (Object.keys(errors).length === 0) {
      rootError.value = userBusinessErrorMessage(error, 'Không thể lưu hồ sơ người dùng. Vui lòng thử lại.')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="grid max-h-[90dvh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0">
      <DialogHeader class="shrink-0 border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>{{ mode === 'create' ? 'Tạo người dùng mới' : 'Chỉnh sửa hồ sơ' }}</DialogTitle>
        <DialogDescription>
          {{ mode === 'create' ? 'Hệ thống sẽ tạo một hồ sơ khách hàng mới. Vai trò, phân công chi nhánh và mật khẩu không được thiết lập tại đây.' : 'Chỉ thông tin hồ sơ được cập nhật; loại tài khoản, quyền và phân công không thay đổi.' }}
        </DialogDescription>
      </DialogHeader>
      <div class="min-h-0 overflow-hidden"><ScrollArea class="h-full">
        <form :id="formId" class="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6" novalidate @submit.prevent="submit">
          <div v-if="rootError" role="alert" class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:col-span-2">{{ rootError }}</div>
          <div v-if="mode === 'update' && user" class="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:col-span-2 sm:grid-cols-3">
            <div><p class="text-muted-foreground">Loại tài khoản</p><p class="font-medium">{{ userTypeLabel(user.type) }}</p></div>
            <div><p class="text-muted-foreground">Nhà cung cấp</p><p class="font-medium">{{ userProviderLabel(user.provider) }}</p></div>
            <div><p class="text-muted-foreground">Trạng thái</p><p class="font-medium">{{ user.isActive ? 'Đang hoạt động' : 'Đã khóa' }}</p></div>
          </div>
          <div class="space-y-2"><Label for="user-full-name">Họ và tên</Label><Input id="user-full-name" v-model="form.fullName" :data-user-field-error="errors.fullName ? 'true' : undefined" :aria-invalid="Boolean(errors.fullName)" @input="validateField('fullName')" /><p v-if="errors.fullName" role="alert" class="text-sm text-destructive">{{ errors.fullName }}</p></div>
          <div class="space-y-2"><Label for="user-email">Email</Label><Input id="user-email" v-model="form.email" type="email" autocomplete="email" :data-user-field-error="errors.email ? 'true' : undefined" :aria-invalid="Boolean(errors.email)" @input="validateField('email')" /><p v-if="errors.email" role="alert" class="text-sm text-destructive">{{ errors.email }}</p></div>
          <div class="space-y-2"><Label for="user-phone">Số điện thoại</Label><Input id="user-phone" v-model="form.phone" type="tel" autocomplete="tel" :data-user-field-error="errors.phone ? 'true' : undefined" :aria-invalid="Boolean(errors.phone)" @input="validateField('phone')" /><p v-if="errors.phone" role="alert" class="text-sm text-destructive">{{ errors.phone }}</p></div>
          <div class="space-y-2"><Label for="user-gender">Giới tính</Label><Input id="user-gender" v-model="form.gender" maxlength="20" :data-user-field-error="errors.gender ? 'true' : undefined" :aria-invalid="Boolean(errors.gender)" @input="validateField('gender')" /><p class="text-xs text-muted-foreground">Tối đa 20 ký tự theo hồ sơ người dùng.</p><p v-if="errors.gender" role="alert" class="text-sm text-destructive">{{ errors.gender }}</p></div>
          <div class="space-y-2 sm:col-span-2"><Label for="user-birthday">Ngày sinh</Label><Input id="user-birthday" v-model="form.birthday" type="date" :data-user-field-error="errors.birthday ? 'true' : undefined" :aria-invalid="Boolean(errors.birthday)" @input="validateField('birthday')" /><p v-if="errors.birthday" role="alert" class="text-sm text-destructive">{{ errors.birthday }}</p></div>
        </form>
      </ScrollArea></div>
      <DialogFooter class="shrink-0 flex-col-reverse border-t bg-background px-5 py-4 sm:flex-row sm:px-6">
        <Button type="button" variant="outline" class="w-full sm:w-auto" :disabled="isSubmitting" @click="emit('update:open', false)">Hủy</Button>
        <Button :form="formId" type="submit" class="w-full sm:w-auto" :disabled="isSubmitting"><LoaderCircle v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />{{ mode === 'create' ? 'Tạo hồ sơ khách hàng' : 'Lưu thay đổi' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
