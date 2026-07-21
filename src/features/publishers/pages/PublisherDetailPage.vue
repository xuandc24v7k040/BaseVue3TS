<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { Pencil } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import NamedMasterDataFormDialog from '@/features/product-master-data/components/NamedMasterDataFormDialog.vue'
import { formatAdminDate } from '@/features/product-master-data/utils/master-data-labels'
import {
  createPublisher,
  getPublisher,
  updatePublisher,
} from '../api/publisher-api'
import { publisherKeys } from '../api/publisher-query-keys'
const route = useRoute(),
  router = useRouter(),
  client = useQueryClient(),
  id = computed(() => String(route.params.id)),
  edit = ref(false)
const query = useQuery({
    queryKey: computed(() => publisherKeys.detail(id.value)),
    queryFn: ({ signal }) => getPublisher(id.value, undefined, signal),
  }),
  item = computed(() => query.data.value?.data)
async function saved() {
  await client.invalidateQueries({ queryKey: publisherKeys.all })
}
</script>
<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý sản phẩm"
      :group-to="{ name: 'super-admin-categories' }"
      section-label="Nhà xuất bản"
      :section-to="{ name: 'super-admin-publishers' }"
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
      <p class="font-semibold">Không thể tải nhà xuất bản.</p>
      <Button class="mt-4" @click="query.refetch()">Thử lại</Button>
    </div>
    <template v-else-if="item"
      ><div class="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <h1 class="break-words text-2xl font-semibold sm:text-3xl">
            {{ item.name }}
          </h1>
          <p class="text-sm text-muted-foreground">
            Đang được {{ item.usageCount }} sản phẩm sử dụng
          </p>
        </div>
        <PermissionGate :all-of="[ADMIN_PERMISSIONS.PUBLISHERS_UPDATE]"
          ><Button @click="edit = true"
            ><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</Button
          ></PermissionGate
        >
      </div>
      <Card
        ><CardHeader><CardTitle>Thông tin cơ bản</CardTitle></CardHeader
        ><CardContent class="grid gap-4 sm:grid-cols-3"
          ><div>
            <p class="text-sm text-muted-foreground">Sản phẩm sử dụng</p>
            <p>{{ item.usageCount }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Ngày tạo</p>
            <p>{{ formatAdminDate(item.createdAt) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Cập nhật</p>
            <p>{{ formatAdminDate(item.updatedAt) }}</p>
          </div></CardContent
        ></Card
      ><Button
        variant="outline"
        @click="router.push({ name: 'super-admin-publishers' })"
        >Quay lại danh sách</Button
      ></template
    >
  </section>
  <NamedMasterDataFormDialog
    v-if="item"
    v-model:open="edit"
    mode="update"
    :record="item"
    entity-label="nhà xuất bản"
    description="Slug do backend tự động quản lý theo tên."
    :duplicate-codes="[
      'PUBLISHER_NAME_ALREADY_EXISTS',
      'PUBLISHER_SLUG_ALREADY_EXISTS',
    ]"
    :create-action="createPublisher"
    :update-action="updatePublisher"
    @saved="saved"
  />
</template>
