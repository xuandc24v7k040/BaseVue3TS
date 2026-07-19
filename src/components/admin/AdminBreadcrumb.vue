<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

defineProps<{
  groupLabel: string;
  groupTo: RouteLocationRaw;
  sectionLabel: string;
  sectionTo?: RouteLocationRaw;
  currentLabel?: string;
  loading?: boolean;
}>();
</script>

<template>
  <Breadcrumb class="min-w-0 overflow-hidden" aria-label="Breadcrumb">
    <BreadcrumbList class="min-w-0 flex-nowrap overflow-hidden text-xs sm:text-sm">
      <BreadcrumbItem class="min-w-0 shrink">
        <BreadcrumbLink as-child>
          <RouterLink
            :to="groupTo"
            class="block max-w-40 truncate sm:max-w-56"
            :title="groupLabel"
          >
            {{ groupLabel }}
          </RouterLink>
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator class="shrink-0" />
      <template v-if="sectionTo">
        <BreadcrumbItem class="min-w-0 shrink">
          <BreadcrumbLink as-child>
            <RouterLink
              :to="sectionTo"
              class="block max-w-36 truncate sm:max-w-52"
              :title="sectionLabel"
            >
              {{ sectionLabel }}
            </RouterLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator class="shrink-0" />
        <BreadcrumbItem class="min-w-0 flex-1 overflow-hidden">
          <Skeleton v-if="loading" class="h-4 w-28 max-w-full" />
          <BreadcrumbPage
            v-else
            class="block max-w-full truncate"
            :title="currentLabel"
          >
            {{ currentLabel || "Chi tiết" }}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </template>
      <BreadcrumbItem v-else class="min-w-0 flex-1 overflow-hidden">
        <BreadcrumbPage class="block max-w-full truncate" :title="sectionLabel">
          {{ sectionLabel }}
        </BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
</template>
