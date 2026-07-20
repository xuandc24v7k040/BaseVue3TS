<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { LoaderCircle } from "@lucide/vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageDropzone from "@/components/shared/ImageDropzone.vue";
import TreeSelect, {
  type TreeSelectNode,
} from "@/components/shared/TreeSelect.vue";
import {
  createCategory,
  listCategoryTree,
  removeCategoryImage,
  updateCategory,
  uploadCategoryImage,
} from "../api/category-api";
import { categoryKeys } from "../api/category-query-keys";
import {
  categoryToForm,
  emptyCategoryForm,
  toCategoryPayload,
} from "../adapters/category-form.adapter";
import { categoryFormSchema } from "../schemas/category-form.schema";
import type {
  Category,
  CategoryFormMode,
  CategoryFormState,
  CategoryTreeNode,
  CategoryType,
} from "../types";
import {
  categoryErrorCode,
  categoryErrorMessage,
} from "../utils/category-errors";
import { CATEGORY_TYPE_OPTIONS } from "../utils/category-labels";
import { toCategorySlugPreview } from "../utils/category-slug";

const props = withDefaults(
  defineProps<{
    open: boolean;
    mode: CategoryFormMode;
    category?: Category | CategoryTreeNode | null;
    initialParent?: Category | CategoryTreeNode | null;
  }>(),
  { category: null, initialParent: null },
);
const emit = defineEmits<{
  "update:open": [open: boolean];
  saved: [category: Category];
}>();
const queryClient = useQueryClient();
const form = reactive<CategoryFormState>(emptyCategoryForm());
const errors = reactive<
  Partial<Record<keyof CategoryFormState | "image", string>>
>({});
const file = ref<File | null>(null);
const removeExistingImage = ref(false);
const pending = ref(false);
const formId = computed(() => `category-${props.mode}-form`);

const parentQuery = useQuery({
  queryKey: computed(() => categoryKeys.rootOptions(form.type)),
  queryFn: ({ signal }) =>
    listCategoryTree(
      {
        level: 1,
        type: form.type,
        sortBy: "sortOrder",
        sortOrder: "asc",
      },
      signal,
    ),
  enabled: computed(() => props.open),
});
const parentOptions = computed<TreeSelectNode[]>(() =>
  (parentQuery.data.value?.data ?? [])
    .filter((node) => node.level === 1 && node.type === form.type)
    .map(mapNode),
);
const selectedParentName = computed(() => {
  if (!form.parentId) return null;
  return (
    parentOptions.value.find((parent) => parent.id === form.parentId)?.name ??
    (props.category?.parent?.id === form.parentId
      ? props.category.parent.name
      : null) ??
    (props.initialParent?.id === form.parentId
      ? props.initialParent.name
      : null)
  );
});
const slug = computed(() =>
  toCategorySlugPreview(form.name, selectedParentName.value),
);
function mapNode(node: CategoryTreeNode): TreeSelectNode {
  return {
    id: node.id,
    name: node.name,
    parentId: node.parentId,
    children: [],
  };
}

function reset(): void {
  const next =
    props.mode === "update" && props.category
      ? categoryToForm(props.category as Category)
      : emptyCategoryForm();
  if (props.mode === "create" && props.initialParent) {
    next.parentId = props.initialParent.id;
    next.type = props.initialParent.type;
  }
  Object.assign(form, next);
  Object.keys(errors).forEach(
    (key) => delete errors[key as keyof typeof errors],
  );
  file.value = null;
  removeExistingImage.value = false;
  pending.value = false;
}
watch(
  () => [props.open, props.mode, props.category?.id, props.initialParent?.id],
  reset,
  { immediate: true },
);

watch(
  () => ({ ...form }),
  (next, previous) => {
    if (!previous) return;
    (Object.keys(next) as (keyof CategoryFormState)[]).forEach((field) => {
      if (next[field] !== previous[field]) delete errors[field];
    });
  },
);

function handleTypeChange(value: unknown): void {
  if (typeof value !== "string" || form.type === value) return;
  const clearedParent = Boolean(form.parentId);
  if (clearedParent) form.parentId = null;
  form.type = value as CategoryType;
  if (clearedParent)
    nextTick(() => {
      errors.parentId =
        "Đã bỏ danh mục cha vì loại danh mục mới không còn phù hợp.";
    });
}

function applyIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
): void {
  issues.forEach((issue) => {
    const field = issue.path[0];
    if (typeof field === "string")
      errors[field as keyof CategoryFormState] = issue.message;
  });
  nextTick(() =>
    document
      .querySelector<HTMLElement>('[data-category-field-error="true"]')
      ?.focus(),
  );
}

function isStatusOnlyUpdate(value: CategoryFormState): boolean {
  if (props.mode !== "update" || !props.category || file.value) return false;
  return (
    value.isActive !== props.category.isActive &&
    value.name.trim() === props.category.name &&
    (value.description.trim() || null) === props.category.description &&
    value.parentId === props.category.parentId &&
    value.type === props.category.type &&
    value.sortOrder === props.category.sortOrder &&
    !removeExistingImage.value
  );
}

async function submit(): Promise<void> {
  if (pending.value) return;
  Object.keys(errors).forEach(
    (key) => delete errors[key as keyof typeof errors],
  );
  const result = categoryFormSchema.safeParse(form);
  if (!result.success) {
    applyIssues(result.error.issues);
    return;
  }
  const statusOnlyUpdate = isStatusOnlyUpdate(result.data);
  pending.value = true;
  try {
    const response =
      props.mode === "create"
        ? await createCategory(toCategoryPayload(result.data))
        : props.category
          ? await updateCategory(
              props.category.id,
              toCategoryPayload(result.data),
            )
          : null;
    if (!response) return;
    let saved = response.data;
    try {
      if (file.value) {
        saved = (await uploadCategoryImage(saved.id, file.value)).data;
        toast.success(
          props.category?.imageUrl
            ? "Đã thay ảnh danh mục."
            : "Đã tải ảnh danh mục lên.",
        );
      } else if (props.mode === "update" && removeExistingImage.value) {
        saved = (await removeCategoryImage(saved.id)).data;
        toast.success("Đã gỡ ảnh danh mục.");
      }
    } catch (imageError) {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      const message =
        props.mode === "create"
          ? "Đã tạo danh mục nhưng chưa thể tải ảnh lên."
          : categoryErrorMessage(
              imageError,
              "Đã cập nhật danh mục nhưng chưa thể cập nhật ảnh.",
            );
      toast.warning(message, {
        description: "Mở lại chỉnh sửa để thử tải ảnh lần nữa.",
      });
      emit("saved", saved);
      emit("update:open", false);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    toast.success(
      statusOnlyUpdate
        ? "Đã cập nhật trạng thái danh mục."
        : props.mode === "create"
          ? "Tạo danh mục thành công."
          : "Cập nhật danh mục thành công.",
    );
    emit("saved", saved);
    emit("update:open", false);
  } catch (error) {
    const message = categoryErrorMessage(
      error,
      "Không thể lưu danh mục. Vui lòng thử lại.",
    );
    const code = categoryErrorCode(error) ?? "";
    if (code === "CATEGORY_NAME_ALREADY_EXISTS") {
      errors.name = message;
      await nextTick();
      document.querySelector<HTMLElement>("#category-name")?.focus();
    } else if (
      [
        "CATEGORY_PARENT_NOT_FOUND",
        "CATEGORY_PARENT_MUST_BE_ROOT",
        "CATEGORY_PARENT_TYPE_MISMATCH",
        "CATEGORY_MAX_DEPTH_EXCEEDED",
      ].includes(code)
    ) {
      errors.parentId = message;
      await nextTick();
      document
        .querySelector<HTMLElement>('[data-category-parent-field="true"]')
        ?.focus();
    } else if (code === "CATEGORY_TYPE_CHANGE_REQUIRES_DETACHED_NODE") {
      errors.type = message;
    } else {
      toast.error(message);
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="grid max-h-[92dvh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0"
    >
      <DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6"
        ><DialogTitle>{{
          mode === "create" ? "Thêm danh mục" : "Chỉnh sửa danh mục"
        }}</DialogTitle
        ><DialogDescription
          >Thiết lập thông tin hiển thị và vị trí trong cây danh mục hai
          cấp.</DialogDescription
        ></DialogHeader
      >
      <div class="min-h-0 overflow-hidden">
        <ScrollArea class="h-full"
          ><form
            :id="formId"
            class="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6"
            novalidate
            @submit.prevent="submit"
          >
            <div class="space-y-2">
              <Label for="category-name">Tên danh mục</Label
              ><Input
                id="category-name"
                v-model="form.name"
                :aria-invalid="Boolean(errors.name)"
                :data-category-field-error="errors.name ? 'true' : undefined"
                maxlength="120"
              />
              <p v-if="errors.name" class="text-sm text-destructive">
                {{ errors.name }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="category-slug">Slug</Label
              ><Input
                id="category-slug"
                :model-value="slug"
                readonly
                disabled
                aria-describedby="category-slug-help"
              />
              <p id="category-slug-help" class="text-xs text-muted-foreground">
                Slug được backend tạo tự động từ tên và danh mục cha đang chọn.
              </p>
            </div>
            <div class="space-y-2">
              <Label>Danh mục cha</Label
              ><TreeSelect
                v-model="form.parentId"
                :options="parentOptions"
                :exclude-ids="category ? [category.id] : []"
                :max-depth="1"
                :disabled="
                  pending ||
                  (mode === 'update' &&
                    category?.level === 1 &&
                    category.childrenCount > 0)
                "
                data-category-parent-field="true"
              />
              <p class="text-xs text-muted-foreground">
                <template
                  v-if="
                    mode === 'update' &&
                    category?.level === 1 &&
                    category.childrenCount > 0
                  "
                >
                  Không thể chuyển danh mục gốc đang có danh mục con.
                </template>
                <template v-else-if="parentQuery.isFetching.value">
                  Đang tải danh mục gốc phù hợp...
                </template>
                <template v-else>
                  Danh mục con chỉ được đặt dưới danh mục gốc cùng loại.
                </template>
              </p>
              <p
                v-if="parentQuery.error.value"
                role="alert"
                class="text-sm text-destructive"
              >
                Không thể tải danh mục gốc. Vui lòng đóng và mở lại biểu mẫu.
              </p>
              <p v-if="errors.parentId" class="text-sm text-destructive">
                {{ errors.parentId }}
              </p>
            </div>
            <div class="space-y-2">
              <Label>Loại danh mục</Label
              ><Select
                :model-value="form.type"
                :disabled="
                  pending ||
                  (mode === 'update' &&
                    category?.level === 1 &&
                    category.childrenCount > 0)
                "
                @update:model-value="handleTypeChange"
                ><SelectTrigger
                  :aria-invalid="Boolean(errors.type)"
                  :data-category-field-error="errors.type ? 'true' : undefined"
                  ><SelectValue placeholder="Chọn loại" /></SelectTrigger
                ><SelectContent
                  ><SelectItem
                    v-for="option in CATEGORY_TYPE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                    >{{ option.label }}</SelectItem
                  ></SelectContent
                ></Select
              >
              <p v-if="errors.type" class="text-sm text-destructive">
                {{ errors.type }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="category-sort-order">Thứ tự hiển thị</Label
              ><Input
                id="category-sort-order"
                v-model.number="form.sortOrder"
                type="number"
                min="0"
                max="9999"
              />
              <p v-if="errors.sortOrder" class="text-sm text-destructive">
                {{ errors.sortOrder }}
              </p>
            </div>
            <label class="flex items-center gap-3 rounded-lg border px-4 py-3"
              ><input
                v-model="form.isActive"
                type="checkbox"
                class="h-4 w-4 accent-primary"
              /><span
                ><span class="block text-sm font-medium">Đang hoạt động</span
                ><span class="block text-xs text-muted-foreground"
                  >Cho phép danh mục xuất hiện trong catalog.</span
                ></span
              ></label
            >
            <div class="space-y-2 sm:col-span-2">
              <Label for="category-description">Mô tả</Label
              ><textarea
                id="category-description"
                v-model="form.description"
                rows="4"
                maxlength="2000"
                class="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p class="text-right text-xs text-muted-foreground">
                {{ form.description.length }}/2000
              </p>
              <p v-if="errors.description" class="text-sm text-destructive">
                {{ errors.description }}
              </p>
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label>Ảnh danh mục</Label
              ><ImageDropzone
                v-model="file"
                :current-url="removeExistingImage ? null : category?.imageUrl"
                :disabled="pending"
                @remove="removeExistingImage = true"
                @invalid="errors.image = $event"
                @valid="delete errors.image"
              />
              <Button
                v-if="removeExistingImage && category?.imageUrl && !file"
                type="button"
                size="sm"
                variant="outline"
                :disabled="pending"
                @click="removeExistingImage = false"
              >
                Khôi phục ảnh hiện tại
              </Button>
              <p
                v-if="errors.image"
                role="alert"
                class="text-sm text-destructive"
              >
                {{ errors.image }}
              </p>
            </div>
          </form></ScrollArea
        >
      </div>
      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6"
        ><Button
          type="button"
          variant="outline"
          :disabled="pending"
          @click="emit('update:open', false)"
          >Hủy</Button
        ><Button :form="formId" type="submit" :disabled="pending"
          ><LoaderCircle v-if="pending" class="mr-2 h-4 w-4 animate-spin" />{{
            mode === "create" ? "Tạo danh mục" : "Lưu thay đổi"
          }}</Button
        ></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
