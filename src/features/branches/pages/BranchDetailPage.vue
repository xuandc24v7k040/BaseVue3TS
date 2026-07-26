<script setup lang="ts">
import axios from 'axios'
import { computed, ref } from 'vue'
import { formatDateTime } from '@/lib/date-format'
import { Copy, ExternalLink, MapPin, Pencil, Phone, Power, Store, UserRoundCog } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useRoute, useRouter } from 'vue-router'
import type { ErrorResponseDto } from '@/api/generated/models'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBranch } from '../api/branch-api'
import { branchKeys } from '../api/branch-query-keys'
import { branchToForm, formToLocation } from '../adapters/branch-form.adapter'
import BranchDeactivateDialog from '../components/BranchDeactivateDialog.vue'
import BranchDetailMap from '../components/BranchDetailMap.vue'
import BranchFormDialog from '../components/BranchFormDialog.vue'
import BranchStatusBadge from '../components/BranchStatusBadge.vue'
import BranchManagerDialog from '@/features/branch-admins/components/BranchManagerDialog.vue'
import { formatBranchAddress } from '../components/branch-columns'

const route = useRoute()
const router = useRouter()
const branchId = computed(() => String(route.params.id))
const editOpen = ref(false)
const deactivateOpen = ref(false)
const managerOpen = ref(false)
function formatBranchDate(value: string): string {
  return formatDateTime(value)
}

const branchQuery = useQuery({
  queryKey: computed(() => branchKeys.detail(null, branchId.value)),
  queryFn: ({ signal }) => getBranch(branchId.value, null, signal),
})
const branch = computed(() => branchQuery.data.value?.data ?? null)
const location = computed(() => branch.value ? formToLocation(branchToForm(branch.value)) : null)
const isNotFound = computed(() => axios.isAxiosError<ErrorResponseDto>(branchQuery.error.value)
  && branchQuery.error.value.response?.status === 404)

function googleMapsUrl(): string {
  if (!location.value) return '#'
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.value.latitude},${location.value.longitude}`)}`
}

function openGoogleMaps(): void {
  window.open(googleMapsUrl(), '_blank', 'noopener,noreferrer')
}

async function copyCoordinates(): Promise<void> {
  if (!location.value) return
  try {
    await navigator.clipboard.writeText(`${location.value.latitude}, ${location.value.longitude}`)
    toast.success('Đã sao chép tọa độ.')
  } catch {
    toast.error('Không thể sao chép tọa độ.')
  }
}

function afterDeactivate(): void {
  void router.push({ name: 'super-admin-branches' })
}
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Tổ chức & phân quyền"
      :group-to="{ name: 'super-admin-branches' }"
      section-label="Chi nhánh"
      :section-to="{ name: 'super-admin-branches' }"
      :current-label="branch?.name"
      :loading="branchQuery.isPending.value"
    />

    <div v-if="branchQuery.isLoading.value" class="rounded-xl border p-8 text-sm text-muted-foreground">Đang tải thông tin chi nhánh...</div>
    <div v-else-if="isNotFound" class="rounded-xl border border-dashed p-8 text-center">
      <Store class="mx-auto h-10 w-10 text-muted-foreground" />
      <h1 class="mt-3 text-xl font-semibold">Không tìm thấy chi nhánh</h1>
      <Button class="mt-4" variant="outline" @click="router.push({ name: 'super-admin-branches' })">Quay về danh sách</Button>
    </div>
    <div v-else-if="branchQuery.error.value" class="rounded-xl border border-destructive/30 p-8 text-center text-destructive">
      Không thể tải thông tin chi nhánh.
      <Button class="mt-4 block" variant="outline" @click="branchQuery.refetch()">Thử lại</Button>
    </div>

    <template v-else-if="branch">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ branch.name }}</h1>
            <BranchStatusBadge :active="branch.isActive" />
          </div>
          <p class="mt-1 font-mono text-sm text-muted-foreground">Mã: {{ branch.code }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <PermissionGate :all-of="[ADMIN_PERMISSIONS.USERS_READ, ADMIN_PERMISSIONS.BRANCHES_READ]">
            <Button variant="outline" @click="managerOpen = true"><UserRoundCog class="mr-2 h-4 w-4" />Quản lý</Button>
          </PermissionGate>
          <PermissionGate :all-of="[ADMIN_PERMISSIONS.BRANCHES_UPDATE]">
            <Button variant="outline" @click="editOpen = true"><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</Button>
          </PermissionGate>
          <PermissionGate v-if="branch.isActive" :all-of="[ADMIN_PERMISSIONS.BRANCHES_DELETE]">
            <Button variant="destructive" @click="deactivateOpen = true"><Power class="mr-2 h-4 w-4" />Ngừng hoạt động</Button>
          </PermissionGate>
        </div>
      </div>

      <div class="space-y-5">
        <Card class="min-w-0 gap-0 py-0">
          <CardContent class="grid gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:grid-cols-2 lg:gap-0">
            <section class="min-w-0 lg:pr-6">
              <h2 class="flex items-center gap-2 font-semibold"><Store class="h-5 w-5" />Thông tin chi nhánh</h2>
              <div class="mt-4 grid gap-3 text-sm">
              <div class="flex justify-between gap-4"><span class="text-muted-foreground">Mã chi nhánh</span><strong class="font-mono">{{ branch.code }}</strong></div>
              <div class="flex justify-between gap-4"><span class="text-muted-foreground">Trạng thái</span><BranchStatusBadge :active="branch.isActive" /></div>
              <div class="flex justify-between gap-4"><span class="text-muted-foreground">Ngày tạo</span><strong>{{ formatBranchDate(branch.createdAt) }}</strong></div>
              </div>
            </section>

            <section class="min-w-0 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <h2 class="flex items-center gap-2 font-semibold"><Phone class="h-5 w-5" />Liên hệ & Địa chỉ</h2>
              <dl class="mt-4 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <dt class="text-muted-foreground">Số điện thoại</dt><dd class="break-words">{{ branch.phone || 'Chưa cập nhật' }}</dd>
                <dt class="text-muted-foreground">Tỉnh/Thành phố</dt><dd>{{ branch.province || '—' }}</dd>
                <dt class="text-muted-foreground">Phường/Xã</dt><dd>{{ branch.ward || '—' }}</dd>
                <dt class="text-muted-foreground">Chi tiết</dt><dd class="break-words">{{ branch.address }}</dd>
              </dl>
              <div class="mt-3 flex min-w-0 items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <strong class="min-w-0 break-words">{{ formatBranchAddress(branch) }}</strong>
              </div>
            </section>
          </CardContent>
        </Card>

        <Card class="min-w-0 overflow-hidden">
          <CardHeader><CardTitle class="flex items-center gap-2"><MapPin class="h-5 w-5" />Bản đồ & Vị trí</CardTitle></CardHeader>
          <CardContent class="min-w-0 space-y-4">
            <BranchDetailMap v-if="location" :location="location" />
            <div v-else class="grid h-72 place-items-center rounded-xl border border-dashed text-center text-muted-foreground">
              <div><MapPin class="mx-auto h-9 w-9" /><p class="mt-2 font-medium text-foreground">Chi nhánh chưa được định vị trên bản đồ.</p></div>
            </div>
            <div v-if="location" class="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
              <div><p class="text-xs uppercase text-muted-foreground">Vĩ độ (Latitude)</p><strong>{{ location.latitude }}</strong></div>
              <div><p class="text-xs uppercase text-muted-foreground">Kinh độ (Longitude)</p><strong>{{ location.longitude }}</strong></div>
            </div>
            <div v-if="location" class="flex flex-wrap gap-2">
              <Button variant="outline" @click="openGoogleMaps"><ExternalLink class="mr-2 h-4 w-4" />Mở trên Google Maps</Button>
              <Button variant="outline" @click="copyCoordinates"><Copy class="mr-2 h-4 w-4" />Sao chép tọa độ</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
  </section>

  <BranchFormDialog v-if="branch" v-model:open="editOpen" mode="update" :branch="branch" />
  <BranchDeactivateDialog v-if="branch" v-model:open="deactivateOpen" :branch="branch" @deactivated="afterDeactivate" />
  <BranchManagerDialog v-if="branch" v-model:open="managerOpen" :branch="branch" />
</template>
