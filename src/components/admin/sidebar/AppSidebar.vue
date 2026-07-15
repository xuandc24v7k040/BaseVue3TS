<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import { computed } from "vue";
import { createPermissionPolicy } from "@/authorization/permission-policy";
import SidebarBrand from "@/components/admin/sidebar/SidebarBrand.vue";
import SidebarNav from "@/components/admin/sidebar/SidebarNav.vue";
import SidebarUserMenu from "@/components/admin/sidebar/SidebarUserMenu.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";
import { resolveVisibleAdminMenu } from "@/authorization/admin-menu";
import { useAdminIdentity } from "@/composables/use-admin-identity";

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});

const authStore = useAuthStore();
const branchStore = useBranchStore();
const { roleLabel } = useAdminIdentity();

const navigationItems = computed(() => {
  const policy = createPermissionPolicy(authStore.user, branchStore);
  return resolveVisibleAdminMenu(authStore.user?.type, policy);
});

const user = computed(() => {
  return {
    name: authStore.name || roleLabel.value,
    email: authStore.email || "admin@bookora.local",
    avatar: "",
  };
});
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <SidebarBrand
        :brand="{
          name: 'Bookora',
          subtitle: roleLabel,
        }"
      />
    </SidebarHeader>
    <SidebarContent>
      <SidebarNav label="Quản trị" :items="navigationItems" />
    </SidebarContent>
    <SidebarFooter>
      <SidebarUserMenu :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
