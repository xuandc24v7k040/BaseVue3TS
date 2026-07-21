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
import { createAuthor, getAuthor, updateAuthor } from '../api/author-api'
import { authorKeys } from '../api/author-query-keys'
const route = useRoute(),
  router = useRouter(),
  client = useQueryClient(),
  id = computed(() => String(route.params.id)),
  edit = ref(false)
const query = useQuery({
    queryKey: computed(() => authorKeys.detail(id.value)),
    queryFn: ({ signal }) => getAuthor(id.value, undefined, signal),
  }),
  item = computed(() => query.data.value?.data)
async function saved() {
  await client.invalidateQueries({ queryKey: authorKeys.all })
}
</script>
<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý sản phẩm"
      :group-to="{ name: 'super-admin-categories' }"
      section-label="Tác giả"
      :section-to="{ name: 'super-admin-authors' }"
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
      <p class="font-semibold">Không thể tải tác giả.</p>
      <Button class="mt-4" @click="query.refetch()">Thử lại</Button>
    </div>
    <template v-else-if="item"
      ><div class="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <h1 class="break-words text-2xl font-semibold sm:text-3xl">
            {{ item.name }}
          </h1>
          <p class="text-sm text-muted-foreground">
            Đang được gắn với {{ item.usageCount }} sản phẩm
          </p>
        </div>
        <PermissionGate :all-of="[ADMIN_PERMISSIONS.AUTHORS_UPDATE]"
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
        @click="router.push({ name: 'super-admin-authors' })"
        >Quay lại danh sách</Button
      ></template
    >
  </section>
  <NamedMasterDataFormDialog
    v-if="item"
    v-model:open="edit"
    mode="update"
    :record="item"
    entity-label="tác giả"
    description="Slug do backend tự động quản lý theo tên."
    :duplicate-codes="[
      'AUTHOR_NAME_ALREADY_EXISTS',
      'AUTHOR_SLUG_ALREADY_EXISTS',
    ]"
    :create-action="createAuthor"
    :update-action="updateAuthor"
    @saved="saved"
  />
</template>
