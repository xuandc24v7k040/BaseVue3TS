<script setup lang="ts">
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  Search,
} from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface TreeSelectNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: TreeSelectNode[];
}

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    options: TreeSelectNode[];
    placeholder?: string;
    rootLabel?: string;
    disabled?: boolean;
    excludeIds?: string[] | Set<string>;
    maxDepth?: number;
  }>(),
  {
    placeholder: "Chọn danh mục...",
    rootLabel: "Không có (Danh mục gốc)",
    disabled: false,
    excludeIds: () => [],
  },
);

const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();
const isOpen = ref(false);
const searchQuery = ref("");
const expanded = ref<Set<string>>(new Set());
const excluded = computed(() =>
  props.excludeIds instanceof Set
    ? props.excludeIds
    : new Set(props.excludeIds),
);

const nodeMap = computed(() => {
  const map = new Map<string, TreeSelectNode>();
  const visit = (nodes: TreeSelectNode[]) =>
    nodes.forEach((node) => {
      map.set(node.id, node);
      if (node.children?.length) visit(node.children);
    });
  visit(props.options);
  return map;
});

const selectedLabel = computed(() =>
  props.modelValue === null
    ? props.rootLabel
    : (nodeMap.value.get(props.modelValue)?.name ?? props.placeholder),
);

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

watch(
  () => [props.modelValue, props.options] as const,
  () => {
    let id = props.modelValue;
    const next = new Set(expanded.value);
    const visited = new Set<string>();
    while (id && !visited.has(id)) {
      visited.add(id);
      const parentId = nodeMap.value.get(id)?.parentId;
      if (!parentId) break;
      next.add(parentId);
      id = parentId;
    }
    expanded.value = next;
  },
  { immediate: true, deep: true },
);

const matchingIds = computed(() => {
  const query = normalizeSearchText(searchQuery.value);
  const visible = new Set<string>();
  if (!query) return visible;
  const visit = (node: TreeSelectNode): boolean => {
    const childMatch = (node.children ?? []).some(visit);
    const selfMatch = normalizeSearchText(node.name).includes(query);
    if (selfMatch || childMatch) visible.add(node.id);
    return selfMatch || childMatch;
  };
  props.options.forEach(visit);
  return visible;
});

const visibleItems = computed(() => {
  const items: {
    node: TreeSelectNode;
    depth: number;
    hasChildren: boolean;
    open: boolean;
  }[] = [];
  const searching = searchQuery.value.trim().length > 0;
  const visit = (
    nodes: TreeSelectNode[],
    depth: number,
    parentVisible: boolean,
  ) =>
    nodes.forEach((node) => {
      if (excluded.value.has(node.id)) return;
      const withinDepth =
        props.maxDepth === undefined || depth < props.maxDepth;
      const matches = !searching || matchingIds.value.has(node.id);
      const visible = parentVisible && withinDepth && matches;
      const open = searching ? matches : expanded.value.has(node.id);
      if (visible)
        items.push({
          node,
          depth,
          hasChildren: Boolean(
            node.children?.some((child) => !excluded.value.has(child.id)),
          ),
          open,
        });
      if (node.children?.length)
        visit(node.children, depth + 1, visible && open);
    });
  visit(props.options, 0, true);
  return items;
});

function toggle(id: string, event: Event): void {
  event.stopPropagation();
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}

function select(value: string | null): void {
  emit("update:modelValue", value);
  isOpen.value = false;
  searchQuery.value = "";
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="isOpen"
        :disabled="disabled"
        class="w-full justify-between font-normal"
      >
        <span class="truncate">{{ selectedLabel }}</span
        ><ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-[var(--reka-popover-trigger-width)] p-0"
      align="start"
    >
      <div class="flex items-center border-b px-3 py-2">
        <Search class="mr-2 h-4 w-4 opacity-50" /><Input
          v-model="searchQuery"
          aria-label="Tìm danh mục cha"
          placeholder="Tìm danh mục..."
          class="h-9 border-none px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      <ScrollArea class="h-64"
        ><div class="p-1">
          <button
            v-if="!searchQuery"
            type="button"
            class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            @click="select(null)"
          >
            <Check
              :class="
                cn(
                  'mr-2 h-4 w-4',
                  modelValue === null ? 'opacity-100' : 'opacity-0',
                )
              "
            /><span class="truncate font-medium text-muted-foreground">{{
              rootLabel
            }}</span>
          </button>
          <p
            v-if="visibleItems.length === 0"
            class="py-6 text-center text-sm text-muted-foreground"
          >
            Không tìm thấy danh mục.
          </p>
          <button
            v-for="item in visibleItems"
            :key="item.node.id"
            type="button"
            class="flex w-full items-center rounded-sm py-1 pr-2 text-left text-sm hover:bg-accent"
            :style="{ paddingLeft: `${item.depth * 16 + 8}px` }"
            @click="select(item.node.id)"
          >
            <span
              v-if="item.hasChildren"
              class="mr-1 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
              :aria-label="item.open ? 'Thu gọn' : 'Mở rộng'"
              @click="toggle(item.node.id, $event)"
              ><ChevronDown v-if="item.open" class="h-3 w-3" /><ChevronRight
                v-else
                class="h-3 w-3" /></span
            ><span v-else class="mr-1 h-6 w-6" />
            <Check
              :class="
                cn(
                  'mr-2 h-4 w-4',
                  modelValue === item.node.id ? 'opacity-100' : 'opacity-0',
                )
              "
            /><Folder class="mr-1.5 h-3.5 w-3.5 text-primary/60" /><span
              class="truncate"
              >{{ item.node.name }}</span
            >
          </button>
        </div></ScrollArea
      >
    </PopoverContent>
  </Popover>
</template>
