<script setup lang="ts">
import { ref } from "vue";
import { LoaderCircle } from "@lucide/vue";
import { useQueryClient } from "@tanstack/vue-query";
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
import { deleteCategory } from "../api/category-api";
import { categoryKeys } from "../api/category-query-keys";
import type { Category, CategoryTreeNode } from "../types";
import { categoryErrorMessage } from "../utils/category-errors";

const props = defineProps<{
  open: boolean;
  category: CategoryTreeNode | Category | null;
}>();
const emit = defineEmits<{ "update:open": [open: boolean]; deleted: [] }>();
const queryClient = useQueryClient();
const pending = ref(false);
async function confirm(): Promise<void> {
  if (!props.category || pending.value) return;
  pending.value = true;
  try {
    await deleteCategory(props.category.id);
    await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    toast.success("Đã xóa danh mục.");
    emit("update:open", false);
    emit("deleted");
  } catch (error) {
    toast.error(categoryErrorMessage(error, "Không thể xóa danh mục."));
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"
    ><DialogContent
      ><DialogHeader
        ><DialogTitle>Xóa danh mục?</DialogTitle
        ><DialogDescription
          >Danh mục “{{ category?.name }}” sẽ bị xóa vĩnh viễn. Chỉ có thể xóa
          khi không còn danh mục con hoặc sản phẩm.</DialogDescription
        ></DialogHeader
      >
      <DialogFooter
        ><Button
          variant="outline"
          :disabled="pending"
          @click="emit('update:open', false)"
          >Hủy</Button
        ><Button variant="destructive" :disabled="pending" @click="confirm"
          ><LoaderCircle v-if="pending" class="mr-2 h-4 w-4 animate-spin" />Xóa
          danh mục</Button
        ></DialogFooter
      ></DialogContent
    ></Dialog
  >
</template>
