<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { ChevronLeft, ChevronRight, RefreshCcw, Search } from "@lucide/vue";
import type { BranchesListParams } from "@/api/generated/models";
import { listBranches } from "@/features/branches/api/branch-api";
import { branchKeys } from "@/features/branches/api/branch-query-keys";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const props = defineProps<{ modelValue: string[]; disabled?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();
const search = ref("");
const debouncedSearch = refDebounced(search, 400);
const page = ref(1);
const limit = 10;
const params = computed<BranchesListParams>(() => ({
  page: page.value,
  limit,
  isActive: true,
  sortBy: "code",
  sortOrder: "asc",
  ...(debouncedSearch.value.trim()
    ? { search: debouncedSearch.value.trim() }
    : {}),
}));
const query = useQuery({
  queryKey: computed(() => branchKeys.list(null, params.value)),
  queryFn: ({ signal }) => listBranches(params.value, null, signal),
});
const branches = computed(() => query.data.value?.data ?? []);
const meta = computed(() => query.data.value?.meta);

function updateSearch(value: string | number): void {
  search.value = String(value);
  page.value = 1;
}

function toggle(id: string): void {
  const next = new Set(props.modelValue);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  emit("update:modelValue", [...next]);
}
</script>

<template>
  <div class="w-full min-w-0 max-w-full space-y-3 rounded-lg border p-3">
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="text-sm font-medium">Chi nhánh được phân công</p>
        <p class="text-xs text-muted-foreground">
          Đã chọn {{ modelValue.length }} chi nhánh. Chi nhánh đầu tiên được
          backend đặt làm chi nhánh chính.
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Tải lại danh sách chi nhánh"
        @click="query.refetch()"
        ><RefreshCcw class="h-4 w-4"
      /></Button>
    </div>
    <div class="relative">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        :model-value="search"
        class="pl-9"
        placeholder="Tìm theo mã hoặc tên chi nhánh..."
        :disabled="disabled"
        @update:model-value="updateSearch"
      />
    </div>
    <div
      v-if="query.isPending.value"
      class="py-5 text-center text-sm text-muted-foreground"
    >
      Đang tải chi nhánh...
    </div>
    <div
      v-else-if="query.isError.value"
      class="rounded-md border border-destructive/30 p-3 text-sm text-destructive"
    >
      Không thể tải danh sách chi nhánh.
      <Button
        type="button"
        variant="link"
        class="h-auto p-0"
        @click="query.refetch()"
        >Thử lại</Button
      >
    </div>
    <div
      v-else-if="!branches.length"
      class="py-5 text-center text-sm text-muted-foreground"
    >
      Không tìm thấy chi nhánh đang hoạt động.
    </div>
    <ScrollArea v-else class="h-52">
      <div class="space-y-1 pr-3">
        <label
          v-for="branch in branches"
          :key="branch.id"
          :for="`branch-admin-create-${branch.id}`"
          class="flex min-w-0 cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/60"
        >
          <Checkbox
            :id="`branch-admin-create-${branch.id}`"
            :model-value="modelValue.includes(branch.id)"
            :disabled="disabled"
            @update:model-value="toggle(branch.id)"
          />
          <span class="min-w-0"
            ><span
              class="block truncate text-sm font-medium"
              :title="branch.name"
              >{{ branch.name }}</span
            ><span
              class="block truncate font-mono text-xs text-muted-foreground"
              >{{ branch.code }}</span
            ></span
          >
        </label>
      </div>
    </ScrollArea>
    <div
      v-if="meta && meta.lastPage > 1"
      class="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground"
    >
      <span>Trang {{ meta.page }}/{{ meta.lastPage }}</span>
      <div class="flex gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          class="h-8 w-8"
          :disabled="!meta.hasPreviousPage"
          aria-label="Trang trước"
          @click="page -= 1"
          ><ChevronLeft class="h-4 w-4" /></Button
        ><Button
          type="button"
          size="icon"
          variant="outline"
          class="h-8 w-8"
          :disabled="!meta.hasNextPage"
          aria-label="Trang sau"
          @click="page += 1"
          ><ChevronRight class="h-4 w-4"
        /></Button>
      </div>
    </div>
  </div>
</template>
