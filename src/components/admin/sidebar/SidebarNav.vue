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
        item.children?.some((child) => route.path.startsWith(child.url)),
      )
      .map((item) => item.title),
  );
});

function isActiveUrl(url: string): boolean {
  return route.path === url || route.path.startsWith(`${url}/`);
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>{{ label }}</SidebarGroupLabel>
    <SidebarMenu>
      <template v-for="item in items" :key="item.title">
        <SidebarMenuItem v-if="!item.children?.length && item.url">
          <RouterLink
            v-slot="{ href, navigate, isActive }"
            :to="item.url"
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
          :default-open="activeParentUrls.has(item.title)"
          class="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger as-child>
              <SidebarMenuButton
                :is-active="activeParentUrls.has(item.title)"
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
                  :key="child.url"
                >
                  <RouterLink
                    v-slot="{ href, navigate }"
                    :to="child.url"
                    custom
                  >
                    <SidebarMenuSubButton
                      as="a"
                      :href="href"
                      :is-active="isActiveUrl(child.url)"
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
