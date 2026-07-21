<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Pencil } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { ADMIN_PERMISSIONS } from '@/authorization/admin-permissions'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import PermissionGate from '@/components/authorization/PermissionGate.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatAdminDate,
  productAttributeTypeLabel,
} from '@/features/product-master-data/utils/master-data-labels'
import { getProductAttribute } from '../api/product-attribute-api'
import { productAttributeKeys } from '../api/product-attribute-query-keys'
import ProductAttributeFormDialog from '../components/ProductAttributeFormDialog.vue'
const route = useRoute(),
  router = useRouter(),
  id = computed(() => String(route.params.id)),
  edit = ref(false),
  query = useQuery({
    queryKey: computed(() => productAttributeKeys.detail(id.value)),
    queryFn: ({ signal }) => getProductAttribute(id.value, undefined, signal),
  }),
  item = computed(() => query.data.value?.data)
</script>
<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý sản phẩm"
      :group-to="{ name: 'super-admin-categories' }"
      section-label="Thuộc tính sản phẩm"
      :section-to="{ name: 'super-admin-product-attributes' }"
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
      <p class="font-semibold">Không thể tải thuộc tính sản phẩm.</p>
      <Button class="mt-4" @click="query.refetch()">Thử lại</Button>
    </div>
    <template v-else-if="item"
      ><div class="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <h1 class="break-words text-2xl font-semibold sm:text-3xl">
            {{ item.name }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Attribute mô tả sản phẩm, không tạo Variant hoặc SKU.
          </p>
        </div>
        <PermissionGate :all-of="[ADMIN_PERMISSIONS.PRODUCT_ATTRIBUTES_UPDATE]"
          ><Button @click="edit = true"
            ><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</Button
          ></PermissionGate
        >
      </div>
      <Card
        ><CardHeader><CardTitle>Thông tin thuộc tính</CardTitle></CardHeader
        ><CardContent class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          ><div>
            <p class="text-sm text-muted-foreground">Mã thuộc tính</p>
            <code class="font-medium">{{ item.code }}</code>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Kiểu dữ liệu</p>
            <p>{{ productAttributeTypeLabel(item.type) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Sản phẩm sử dụng</p>
            <p>{{ item.usageCount }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Ngày tạo / cập nhật</p>
            <p>{{ formatAdminDate(item.createdAt) }}</p>
            <p class="text-sm text-muted-foreground">
              {{ formatAdminDate(item.updatedAt) }}
            </p>
          </div></CardContent
        ></Card
      ><Button
        variant="outline"
        @click="router.push({ name: 'super-admin-product-attributes' })"
        >Quay lại danh sách</Button
      ></template
    >
  </section>
  <ProductAttributeFormDialog
    v-if="item"
    v-model:open="edit"
    mode="update"
    :attribute="item"
  />
</template>
