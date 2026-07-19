<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, ChevronsUpDown, Search } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type BranchOption = { id: string; name: string };

const props = defineProps<{
  id: string;
  modelValue: string;
  label: string;
  options: BranchOption[];
  placeholder?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const open = ref(false);
const search = ref("");
const activeIndex = ref(0);
const selected = computed(() =>
  props.options.find((option) => option.id === props.modelValue),
);
const filtered = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase("vi");
  return props.options.filter(
    (option) => !needle || option.name.toLocaleLowerCase("vi").includes(needle),
  );
});

watch(filtered, () => {
  activeIndex.value = 0;
});
watch(open, (value) => {
  if (!value) search.value = "";
});

function select(id: string): void {
  emit("update:modelValue", id);
  open.value = false;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex.value = Math.min(
      activeIndex.value + 1,
      filtered.value.length - 1,
    );
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === "Enter" && filtered.value[activeIndex.value]) {
    event.preventDefault();
    select(filtered.value[activeIndex.value].id);
  } else if (event.key === "Escape") {
    open.value = false;
  }
}
</script>

<template>
  <div class="space-y-2">
    <Label :for="id">{{ label }}</Label>
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          :id="id"
          type="button"
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          :disabled="disabled"
          class="w-full justify-between font-normal"
        >
          <span class="truncate">{{
            selected?.name || placeholder || "Chọn chi nhánh"
          }}</span>
          <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="z-[70] w-[var(--reka-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-2"
      >
        <div class="relative">
          <Search
            class="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"
          />
          <Input
            v-model="search"
            class="pl-9"
            placeholder="Tìm chi nhánh..."
            @keydown="handleKeydown"
          />
        </div>
        <ScrollArea class="mt-2 max-h-60">
          <div role="listbox" class="space-y-1 pr-2">
            <button
              v-for="(option, index) in filtered"
              :key="option.id"
              type="button"
              role="option"
              :aria-selected="option.id === modelValue"
              class="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              :class="index === activeIndex ? 'bg-muted' : ''"
              @mouseenter="activeIndex = index"
              @click="select(option.id)"
            >
              <Check
                class="size-4 shrink-0"
                :class="option.id === modelValue ? 'opacity-100' : 'opacity-0'"
              />
              <span class="truncate">{{ option.name }}</span>
            </button>
            <p
              v-if="!filtered.length"
              class="px-2 py-6 text-center text-sm text-muted-foreground"
            >
              Không tìm thấy chi nhánh.
            </p>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  </div>
</template>
