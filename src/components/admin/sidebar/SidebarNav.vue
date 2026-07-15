<script setup lang="ts">
import { ChevronRight } from "@lucide/vue";
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SidebarNavItem } from "./types";

const props = defineProps<{
  label: string;
  items: SidebarNavItem[];
}>();

const route = useRoute();

const activeParentUrls = computed(() => {
  return new Set(
    props.items
      .filter((item) =>
        item.children?.some((child) => route.name === child.routeName),
      )
      .map((item) => item.id),
  );
});

function isActiveRoute(routeName: string): boolean {
  return route.name === routeName;
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>{{ label }}</SidebarGroupLabel>
    <SidebarMenu>
      <template v-for="item in items" :key="item.id">
        <SidebarMenuItem v-if="!item.children?.length && item.routeName">
          <RouterLink
            v-slot="{ href, navigate, isActive }"
            :to="{ name: item.routeName }"
            custom
          >
            <SidebarMenuButton
              as="a"
              :href="href"
              :is-active="isActive"
              :tooltip="item.title"
              @click="navigate"
            >
              <component :is="item.icon" />
              <span>{{ item.title }}</span>
            </SidebarMenuButton>
          </RouterLink>
        </SidebarMenuItem>

        <Collapsible
          v-else
          as-child
          :default-open="activeParentUrls.has(item.id)"
          class="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger as-child>
              <SidebarMenuButton
                :is-active="activeParentUrls.has(item.id)"
                :tooltip="item.title"
              >
                <component :is="item.icon" />
                <span>{{ item.title }}</span>
                <ChevronRight
                  class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem
                  v-for="child in item.children"
                  :key="child.id"
                >
                  <RouterLink
                    v-slot="{ href, navigate }"
                    :to="{ name: child.routeName }"
                    custom
                  >
                    <SidebarMenuSubButton
                      as="a"
                      :href="href"
                      :is-active="isActiveRoute(child.routeName)"
                      @click="navigate"
                    >
                      <span>{{ child.title }}</span>
                    </SidebarMenuSubButton>
                  </RouterLink>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </template>
    </SidebarMenu>
  </SidebarGroup>
</template>
