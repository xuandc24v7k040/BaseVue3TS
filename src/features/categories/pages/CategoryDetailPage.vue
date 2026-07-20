<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowLeft, FolderPlus, ImageIcon, Pencil, Trash2 } from "@lucide/vue";
import { useQuery } from "@tanstack/vue-query";
import { useRoute, useRouter } from "vue-router";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import ImagePreviewDialog from "@/components/shared/ImagePreviewDialog.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategory } from "../api/category-api";
import { categoryKeys } from "../api/category-query-keys";
import CategoryDeleteDialog from "../components/CategoryDeleteDialog.vue";
import CategoryFormDialog from "../components/CategoryFormDialog.vue";
import CategoryStatusBadge from "../components/CategoryStatusBadge.vue";
import { categoryErrorMessage } from "../utils/category-errors";
import {
  categoryLevelLabel,
  categoryTypeLabel,
  formatCategoryDate,
} from "../utils/category-labels";

const route = useRoute();
const router = useRouter();
const id = computed(() => String(route.params.id));
const query = useQuery({
  queryKey: computed(() => categoryKeys.detail(id.value)),
  queryFn: ({ signal }) => getCategory(id.value, signal),
});
const category = computed(() => query.data.value?.data);
const editOpen = ref(false);
const createChildOpen = ref(false);
const deleteOpen = ref(false);
const previewOpen = ref(false);
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Sản phẩm & danh mục"
      :group-to="{ name: 'super-admin-products' }"
      section-label="Danh mục"
      :section-to="{ name: 'super-admin-categories' }"
      :current-label="category?.name"
      :loading="query.isLoading.value"
    />
    <Button
      variant="ghost"
      class="-ml-3"
      @click="router.push({ name: 'super-admin-categories' })"
      ><ArrowLeft class="mr-2 h-4 w-4" />Quay lại danh sách</Button
    >
    <div v-if="query.isLoading.value" class="space-y-4">
      <Skeleton class="h-10 w-72" /><Skeleton class="h-64 w-full" />
    </div>
    <div
      v-else-if="query.error.value"
      role="alert"
      class="rounded-lg border border-destructive/30 p-5"
    >
      <p class="font-medium text-destructive">
        {{ categoryErrorMessage(query.error.value, "Không thể tải danh mục.") }}
      </p>
      <Button class="mt-4" variant="outline" @click="query.refetch()"
        >Thử lại</Button
      >
    </div>
    <template v-else-if="category">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="break-words text-2xl font-semibold sm:text-3xl">
              {{ category.name }}
            </h1>
            <CategoryStatusBadge
              :active="category.isActive"
              :effective-active="category.effectiveActive"
            />
          </div>
          <p class="mt-1 text-sm text-muted-foreground">
            {{
              category.parent?.name
                ? `Thuộc ${category.parent.name}`
                : "Danh mục gốc"
            }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <PermissionGate
            v-if="category.level === 1"
            :all-of="[ADMIN_PERMISSIONS.CATEGORIES_CREATE]"
            ><Button variant="outline" @click="createChildOpen = true"
              ><FolderPlus class="mr-2 h-4 w-4" />Thêm danh mục con</Button
            ></PermissionGate
          >
          <PermissionGate :all-of="[ADMIN_PERMISSIONS.CATEGORIES_UPDATE]"
            ><Button variant="outline" @click="editOpen = true"
              ><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</Button
            ></PermissionGate
          ><PermissionGate :all-of="[ADMIN_PERMISSIONS.CATEGORIES_DELETE]"
            ><Button
              variant="destructive"
              :disabled="
                category.childrenCount > 0 || category.productCount > 0
              "
              @click="deleteOpen = true"
              ><Trash2 class="mr-2 h-4 w-4" />Xóa</Button
            ></PermissionGate
          >
        </div>
      </div>
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <Card
          ><CardHeader><CardTitle>Thông tin danh mục</CardTitle></CardHeader
          ><CardContent class="grid gap-5 sm:grid-cols-2"
            ><div>
              <p class="text-sm text-muted-foreground">Loại</p>
              <Badge variant="outline" class="mt-1">{{
                categoryTypeLabel(category.type)
              }}</Badge>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Cấp</p>
              <p class="mt-1 font-medium">
                {{ categoryLevelLabel(category.level) }}
              </p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Thứ tự hiển thị</p>
              <p class="mt-1 font-medium">{{ category.sortOrder }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                Số danh mục con / sản phẩm
              </p>
              <p class="mt-1 font-medium">
                {{ category.childrenCount }} / {{ category.productCount }}
              </p>
            </div>
            <div class="sm:col-span-2">
              <p class="text-sm text-muted-foreground">Mô tả</p>
              <p class="mt-1 whitespace-pre-wrap">
                {{ category.description || "Chưa có mô tả." }}
              </p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Ngày tạo</p>
              <p class="mt-1">{{ formatCategoryDate(category.createdAt) }}</p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Cập nhật gần nhất</p>
              <p class="mt-1">{{ formatCategoryDate(category.updatedAt) }}</p>
            </div></CardContent
          ></Card
        >
        <Card
          ><CardHeader><CardTitle>Ảnh danh mục</CardTitle></CardHeader
          ><CardContent
            ><button
              v-if="category.imageUrl"
              type="button"
              class="w-full overflow-hidden rounded-lg border"
              @click="previewOpen = true"
            >
              <img
                :src="category.imageUrl"
                :alt="category.name"
                class="h-64 w-full object-cover"
              />
            </button>
            <div
              v-else
              class="flex h-52 flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground"
            >
              <ImageIcon class="mb-2 h-8 w-8" /><span>Chưa có ảnh</span>
            </div></CardContent
          ></Card
        >
      </div>
    </template>
  </section>
  <CategoryFormDialog
    v-if="category"
    v-model:open="editOpen"
    mode="update"
    :category="category"
    @saved="query.refetch()"
  />
  <CategoryFormDialog
    v-if="category?.level === 1"
    v-model:open="createChildOpen"
    mode="create"
    :initial-parent="category"
    @saved="query.refetch()"
  />
  <CategoryDeleteDialog
    v-if="category"
    v-model:open="deleteOpen"
    :category="category"
    @deleted="router.push({ name: 'super-admin-categories' })"
  />
  <ImagePreviewDialog
    v-if="category?.imageUrl"
    v-model:open="previewOpen"
    :src="category.imageUrl"
    :alt="category.name"
  />
</template>
