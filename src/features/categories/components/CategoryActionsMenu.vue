<script setup lang="ts">
import { Eye, FolderPlus, MoreHorizontal, Pencil, Trash2 } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CategoryTreeNode } from "../types";
defineProps<{
  category: CategoryTreeNode;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>();
const emit = defineEmits<{
  view: [];
  addChild: [];
  edit: [];
  delete: [];
}>();
</script>
<template>
  <DropdownMenu
    ><DropdownMenuTrigger as-child
      ><Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Mở thao tác danh mục"
        ><MoreHorizontal class="h-4 w-4" /></Button></DropdownMenuTrigger
    ><DropdownMenuContent align="end"
      ><DropdownMenuItem @select="emit('view')"
        ><Eye class="mr-2 h-4 w-4" />Xem chi tiết</DropdownMenuItem
      ><DropdownMenuItem v-if="canUpdate" @select="emit('edit')"
        ><Pencil class="mr-2 h-4 w-4" />Chỉnh sửa</DropdownMenuItem
      ><DropdownMenuItem
        v-if="canCreate && category.level === 1"
        @select="emit('addChild')"
        ><FolderPlus class="mr-2 h-4 w-4" />Thêm danh mục con</DropdownMenuItem
      ><template v-if="canDelete"
        ><DropdownMenuSeparator /><DropdownMenuItem
          class="text-destructive focus:text-destructive"
          :disabled="category.childrenCount > 0 || category.productCount > 0"
          @select="emit('delete')"
          ><Trash2 class="mr-2 h-4 w-4" />Xóa danh mục</DropdownMenuItem
        ></template
      ></DropdownMenuContent
    ></DropdownMenu
  >
</template>
