<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import DataTableDateRangeFilter from "@/components/admin/table/DataTableDateRangeFilter.vue";
import type { DateRangeValue } from "@/components/admin/table/interface";

export type AnalyticsPreset = "7D" | "30D" | "90D" | "CUSTOM";

const props = defineProps<{
  preset: AnalyticsPreset;
  from: string;
  to: string;
  busy?: boolean;
}>();

const emit = defineEmits<{
  presetChange: [value: Exclude<AnalyticsPreset, "CUSTOM">];
  customChange: [value: { from: string; to: string }];
}>();

const customActive = computed(() => props.preset === "CUSTOM");
const customInvalid = computed(
  () =>
    customActive.value && (!props.from || !props.to || props.from > props.to),
);

const rangeValue = computed<DateRangeValue>(() => ({
  start: props.from || undefined,
  end: props.to || undefined,
}));

function updateDateRange(value: DateRangeValue | string | undefined): void {
  const range = value && typeof value === "object" ? value : {};
  emit("customChange", {
    from: range.start ?? "",
    to: range.end ?? "",
  });
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm"
  >
    <div class="flex rounded-lg border bg-muted/40 p-1">
      <Button
        v-for="item in ['7D', '30D', '90D'] as const"
        :key="item"
        size="sm"
        :variant="preset === item ? 'default' : 'ghost'"
        :disabled="busy"
        @click="emit('presetChange', item)"
      >
        {{ item.replace("D", " ngày") }}
      </Button>
    </div>

    <div class="ml-auto flex min-w-0 flex-wrap items-center gap-2">
      <DataTableDateRangeFilter
        :model-value="rangeValue"
        placeholder="Khoảng thời gian"
        mode="range"
        date-format-pattern="DD/MM/YYYY"
        enable-presets
        disable-future-dates
        :disabled="busy"
        class="w-full sm:w-72"
        @update:model-value="updateDateRange"
      />
      <span v-if="customActive" class="text-xs font-medium text-primary"
        >Tùy chọn</span
      >
      <span v-if="customInvalid" class="text-xs font-medium text-red-600">
        Chọn khoảng ngày hợp lệ.
      </span>
    </div>
  </div>
</template>
