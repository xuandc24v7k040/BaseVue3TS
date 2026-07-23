<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import { ref, watch } from "vue";
import type { PublicCategoryResponseDto } from "@/api/generated/models";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const props = defineProps<{
  categories: PublicCategoryResponseDto[];
  activeSlug?: string;
}>();
const emit = defineEmits<{ select: [slug: string] }>();
const expandedRootIds = ref(new Set<string>());

watch(
  () => [props.activeSlug, props.categories] as const,
  () => {
    const activeRoot = props.categories.find(
      (root) =>
        root.slug === props.activeSlug ||
        root.children.some((child) => child.slug === props.activeSlug),
    );
    if (!activeRoot) return;
    expandedRootIds.value = new Set([...expandedRootIds.value, activeRoot.id]);
  },
  { immediate: true, deep: true },
);

function setExpanded(rootId: string, open: boolean): void {
  const next = new Set(expandedRootIds.value);
  if (open) next.add(rootId);
  else next.delete(rootId);
  expandedRootIds.value = next;
}
</script>

<template>
  <div class="space-y-1" data-testid="product-category-filter-tree">
    <Collapsible
      v-for="root in categories"
      :key="root.id"
      :open="expandedRootIds.has(root.id)"
      @update:open="(open) => setExpanded(root.id, open)"
    >
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="min-w-0 flex-1 rounded px-2 py-2 text-left text-sm font-semibold hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          :class="activeSlug === root.slug ? 'text-[var(--bookora-green)]' : ''"
          @click="emit('select', root.slug)"
        >
          {{ root.name }}
        </button>
        <CollapsibleTrigger v-if="root.children.length" as-child>
          <button
            type="button"
            class="grid size-9 shrink-0 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            :aria-label="`${expandedRootIds.has(root.id) ? 'Thu gọn' : 'Mở rộng'} ${root.name}`"
          >
            <ChevronDown
              class="size-4 transition-transform"
              :class="expandedRootIds.has(root.id) ? 'rotate-180' : ''"
            />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent
        v-if="root.children.length"
        class="ml-3 border-l border-[var(--bookora-border)] pl-2"
      >
        <button
          v-for="child in root.children"
          :key="child.id"
          type="button"
          class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
          :class="
            activeSlug === child.slug
              ? 'bg-[var(--bookora-soft)] font-semibold text-[var(--bookora-green)]'
              : ''
          "
          @click="emit('select', child.slug)"
        >
          {{ child.name }}
        </button>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
