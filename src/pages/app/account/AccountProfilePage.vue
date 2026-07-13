<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Eye, EyeOff, Link2Off, Pencil } from '@lucide/vue'
import { toast } from 'vue-sonner'
import googleLogo from '@/assets/client/auth/google-logo.svg'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuthStore } from '@/stores/auth.store'
import { initialAddresses, fullAddress, type AccountProfileMock } from './account.mock'

const authStore = useAuthStore()
const principalProfile: AccountProfileMock = {
  fullName: authStore.user?.fullName ?? '',
  email: authStore.user?.email ?? '',
  phone: '',
  gender: '-',
  birthday: '',
  joinedAt: '',
  defaultAddress: '',
}
const profile = reactive<AccountProfileMock>({ ...principalProfile })
const editOpen = ref(false); const passwordOpen = ref(false); const form = reactive<AccountProfileMock>({ ...principalProfile })
const password = reactive({ current: '', next: '', confirm: '' }); const visible = reactive({ current: false, next: false, confirm: false })
const passwordError = computed(() => {
  if (!password.current) return 'Vui lòng nhập mật khẩu hiện tại.'
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password.next)) return 'Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.'
  if (password.confirm !== password.next) return 'Mật khẩu xác nhận chưa khớp.'
  return ''
})
function resetProfile() { Object.assign(form, profile) }
function openEdit() { Object.assign(form, profile); editOpen.value = true }
function saveProfile() { if (form.fullName.trim().length < 2) return toast.error('Họ và tên cần ít nhất 2 ký tự.'); Object.assign(profile, form); editOpen.value = false; toast.success('Đã cập nhật thông tin (dữ liệu mock).') }
function changePassword() { if (passwordError.value) return; passwordOpen.value = false; Object.assign(password, { current: '', next: '', confirm: '' }); toast.success('Đổi mật khẩu thành công (dữ liệu mock).') }
function displayValue(value: string) { return value || 'Chưa có dữ liệu' }
function displayBirthday(value: string) { return value ? value.split('-').reverse().join('/') : 'Chưa có dữ liệu' }
</script>

<template>
  <div class="grid min-w-0 gap-5">
    <Card class="min-w-0 p-5 shadow-none sm:p-6"><div class="flex items-center justify-between"><h1 class="text-xl font-bold">Thông tin cá nhân</h1><Button variant="ghost" class="text-[var(--bookora-green)]" @click="openEdit"><Pencil class="size-4" />Cập nhật</Button></div>
      <div class="mt-4 grid min-w-0 gap-x-10 md:grid-cols-2"><dl class="grid"><div v-for="row in [['Họ và tên', profile.fullName], ['Giới tính', displayValue(profile.gender === '-' ? '' : profile.gender)], ['Ngày sinh', displayBirthday(profile.birthday)]]" :key="row[0]" class="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b py-3.5 text-sm"><dt class="text-[var(--bookora-muted)]">{{ row[0] }}:</dt><dd class="min-w-0 text-right break-words">{{ row[1] }}</dd></div></dl><dl class="grid"><div v-for="row in [['Số điện thoại', displayValue(profile.phone)], ['Email', profile.email], ['Địa chỉ mặc định', displayValue(profile.defaultAddress)]]" :key="row[0]" class="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b py-3.5 text-sm"><dt class="text-[var(--bookora-muted)]">{{ row[0] }}:</dt><dd class="min-w-0 text-right break-words">{{ row[1] }}</dd></div></dl></div>
    </Card>
    <div class="grid min-w-0 gap-5 lg:grid-cols-2"><Card class="p-5 shadow-none"><div class="flex items-center justify-between gap-3"><h2 class="text-lg font-bold">Mật khẩu</h2><Button variant="ghost" class="text-[var(--bookora-green)]" @click="passwordOpen = true"><Pencil class="size-4" />Thay đổi mật khẩu</Button></div><p class="mt-4 text-sm text-[var(--bookora-muted)]">Cập nhật lần cuối: <strong class="float-right text-foreground">Chưa có dữ liệu</strong></p></Card>
      <Card class="p-5 shadow-none"><h2 class="text-lg font-bold">Tài khoản liên kết</h2><div class="mt-4 flex items-center gap-3"><img :src="googleLogo" alt="Google" class="size-7"><span>Google</span><Badge variant="outline">Chưa có dữ liệu</Badge><button type="button" disabled class="ml-auto inline-flex items-center gap-1 text-sm opacity-50"><Link2Off class="size-4" />Hủy liên kết</button></div></Card></div>

    <Sheet v-model:open="editOpen"><SheetContent class="bookora-client w-full min-w-0 max-w-full sm:max-w-lg"><SheetHeader><SheetTitle>Cập nhật thông tin cá nhân</SheetTitle><SheetDescription>Chỉnh sửa hồ sơ hiển thị trong Member Center.</SheetDescription></SheetHeader><form class="flex min-h-0 min-w-0 max-w-full flex-1 flex-col" @submit.prevent="saveProfile"><div class="grid min-w-0 max-w-full flex-1 gap-4 overflow-y-auto px-4 py-2">
      <label class="grid min-w-0 max-w-full gap-1 text-sm">Họ và tên<Input v-model="form.fullName" required /></label><label class="grid min-w-0 max-w-full gap-1 text-sm">Giới tính<Select v-model="form.gender"><SelectTrigger class="w-full min-w-0"><SelectValue class="min-w-0 truncate" /></SelectTrigger><SelectContent><SelectItem value="-">Không cung cấp</SelectItem><SelectItem value="Nam">Nam</SelectItem><SelectItem value="Nữ">Nữ</SelectItem></SelectContent></Select></label><label class="grid min-w-0 max-w-full gap-1 text-sm">Ngày sinh<Input v-model="form.birthday" type="date" required /></label><label class="grid min-w-0 max-w-full gap-1 text-sm">Số điện thoại<Input :model-value="form.phone" disabled /></label><label class="grid min-w-0 max-w-full gap-1 text-sm">Email<Input :model-value="form.email" disabled /></label><label class="grid min-w-0 max-w-full gap-1 text-sm">Địa chỉ mặc định<Select v-model="form.defaultAddress"><SelectTrigger class="h-10 w-full min-w-0"><SelectValue class="min-w-0 flex-1 truncate text-left" /></SelectTrigger><SelectContent class="w-[var(--reka-select-trigger-width)] max-w-[calc(100vw-2rem)]"><SelectItem v-for="address in initialAddresses" :key="address.id" :value="fullAddress(address)" class="min-w-0 [&>span:last-child]:truncate">{{ address.label }} — {{ fullAddress(address) }}</SelectItem></SelectContent></Select></label>
      </div><SheetFooter class="grid min-w-0 grid-cols-2 gap-2.5 border-t"><Button type="button" variant="outline" class="h-10 w-full min-w-0" @click="resetProfile">Thiết lập lại</Button><Button type="submit" class="h-10 w-full min-w-0 bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]">Cập nhật thông tin</Button></SheetFooter></form></SheetContent></Sheet>

    <Sheet v-model:open="passwordOpen"><SheetContent class="bookora-client w-full sm:max-w-lg"><SheetHeader><SheetTitle>Đổi mật khẩu</SheetTitle><SheetDescription>Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.</SheetDescription></SheetHeader><form class="flex min-h-0 flex-1 flex-col" @submit.prevent="changePassword"><div class="grid flex-1 content-start gap-4 overflow-y-auto px-4 py-2"><label v-for="field in [{ key: 'current', label: 'Mật khẩu hiện tại' }, { key: 'next', label: 'Mật khẩu mới' }, { key: 'confirm', label: 'Xác nhận mật khẩu mới' }]" :key="field.key" class="grid gap-1 text-sm">{{ field.label }}<span class="relative"><Input v-model="password[field.key as keyof typeof password]" :type="visible[field.key as keyof typeof visible] ? 'text' : 'password'" class="pr-10" /><button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 p-1" :aria-label="visible[field.key as keyof typeof visible] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" @click="visible[field.key as keyof typeof visible] = !visible[field.key as keyof typeof visible]"><EyeOff v-if="visible[field.key as keyof typeof visible]" class="size-4" /><Eye v-else class="size-4" /></button></span></label><p class="min-h-10 text-sm text-destructive">{{ (password.current || password.next || password.confirm) ? passwordError : '' }}</p></div><SheetFooter class="border-t"><Button type="submit" class="bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]">Đổi mật khẩu</Button></SheetFooter></form></SheetContent></Sheet>
  </div>
</template>
