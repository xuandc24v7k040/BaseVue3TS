<script setup lang="ts">
import type { Component } from "vue";
import { ArrowDownRight, ArrowUpRight, Minus } from "@lucide/vue";
import { Card, CardContent } from "@/components/ui/card";
import { formatPercent } from "@/features/analytics/analytics-format";

defineProps<{
  label: string;
  value: string;
  icon: Component;
  change?: number | null;
  comparison?: boolean;
  accentClass: string;
  iconClass?: string;
}>();
</script>

<template>
  <Card class="relative min-w-0 overflow-hidden">
    <div
      class="absolute inset-x-0 top-0 h-1.5 shadow-[0_2px_10px_rgba(15,23,42,0.16)]"
      :class="accentClass"
    />
    <CardContent class="flex items-start justify-between gap-3 p-5">
      <div class="min-w-0">
        <p class="text-sm text-muted-foreground">{{ label }}</p>
        <p class="mt-1 truncate text-2xl font-semibold tracking-tight">
          {{ value }}
        </p>
        <p
          v-if="comparison"
          class="mt-2 flex items-center gap-1 text-xs"
          :class="
            change == null
              ? 'text-muted-foreground'
              : change >= 0
                ? 'text-emerald-600'
                : 'text-red-600'
          "
        >
          <Minus v-if="change == null" class="size-3.5" />
          <ArrowUpRight v-else-if="change >= 0" class="size-3.5" />
          <ArrowDownRight v-else class="size-3.5" />
          {{ formatPercent(change) }}
          <span v-if="change != null" class="text-muted-foreground"
            >so với kỳ trước</span
          >
        </p>
      </div>
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-full"
        :class="iconClass"
      >
        <component :is="icon" class="size-5" />
      </div>
    </CardContent>
  </Card>
</template>
