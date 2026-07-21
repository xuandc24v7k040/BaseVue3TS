<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ArrowLeft, Pencil } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAdminDate } from '@/features/product-master-data/utils/master-data-labels'
import { getSupplier } from '../api/supplier-api'
import { supplierKeys } from '../api/supplier-query-keys'
import SupplierFormDialog from '../components/SupplierFormDialog.vue'
const route = useRoute(),
  router = useRouter(),
  id = computed(() => String(route.params.id)),
  editOpen = ref(false)
const query = useQuery({
  queryKey: computed(() => supplierKeys.detail(id.value)),
  queryFn: ({ signal }) => getSupplier(id.value, undefined, signal),
})
const item = computed(() => query.data.value?.data)
</script>
<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý sản phẩm"
      :group-to="{ name: 'super-admin-categories' }"
      section-label="Nhà cung cấp"
      :section-to="{ name: 'super-admin-suppliers' }"
      :current-label="item?.name ?? 'Đang tải…'"
    />
    <div
      v-if="query.isPending.value"
      class="h-48 animate-pulse rounded-xl bg-muted"
    />
    <div
      v-else-if="query.error.value"
      class="rounded-lg border p-8 text-center"
    >
      <h1 class="text-xl font-semibold">Không thể tải nhà cung cấp</h1>
      <div class="mt-4 flex justify-center gap-2">
        <Button
          variant="outline"
          @click="router.push({ name: 'super-admin-suppliers' })"
          >Quay lại</Button
        ><Button @click="query.refetch()">Thử lại</Button>
      </div>
    </div>
    <template v-else-if="item"
      ><div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <Button
            variant="ghost"
            class="mb-2 px-0"
            @click="router.push({ name: 'super-admin-suppliers' })"
            ><ArrowLeft class="mr-2 h-4 w-4" />Nhà cung cấp</Button
          >
          <h1 class="break-words text-2xl font-semibold sm:text-3xl">
            {{ item.name }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Đang được {{ item.usageCount }} sản phẩm sử dụng
          </p>
        </div>
        <PermissionGate :all-of="[ADMIN_PERMISSIONS.SUPPLIERS_UPDATE]"
          ><Button @click="editOpen = true"
            ><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</Button
          ></PermissionGate
        >
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <Card
          ><CardHeader><CardTitle>Thông tin liên hệ</CardTitle></CardHeader
          ><CardContent class="grid gap-4 sm:grid-cols-2"
            ><div>
              <p class="text-sm text-muted-foreground">Số điện thoại</p>
              <p class="break-words font-medium">
                {{ item.phone || 'Chưa cập nhật' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Email</p>
              <p class="break-all font-medium">
                {{ item.email || 'Chưa cập nhật' }}
              </p>
            </div>
            <div class="sm:col-span-2">
              <p class="text-sm text-muted-foreground">Địa chỉ</p>
              <p class="break-words font-medium">
                {{ item.address || 'Chưa cập nhật' }}
              </p>
            </div></CardContent
          ></Card
        ><Card
          ><CardHeader><CardTitle>Thông tin hệ thống</CardTitle></CardHeader
          ><CardContent class="space-y-4"
            ><div>
              <p class="text-sm text-muted-foreground">Ngày tạo</p>
              <p>{{ formatAdminDate(item.createdAt) }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Cập nhật gần nhất</p>
              <p>{{ formatAdminDate(item.updatedAt) }}</p>
            </div></CardContent
          ></Card
        >
      </div></template
    >
  </section>
  <SupplierFormDialog
    v-if="item"
    v-model:open="editOpen"
    mode="update"
    :supplier="item"
  />
</template>
