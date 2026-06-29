<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Gauge,
  Package,
  Tags,
} from "@lucide/vue";
import { computed } from "vue";
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
import type { SidebarNavItem } from "./types";

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
});

const authStore = useAuthStore();

const superAdminItems: SidebarNavItem[] = [
  { title: "Tổng quan", url: "/super-admin/dashboard", icon: Gauge },
  {
    title: "Tổ chức",
    icon: Building2,
    children: [
      { title: "Người dùng", url: "/super-admin/users" },
      { title: "Chi nhánh", url: "/super-admin/branches" },
    ],
  },
  {
    title: "Danh mục & sản phẩm",
    icon: Package,
    children: [
      { title: "Danh mục", url: "/super-admin/categories" },
      { title: "Sản phẩm", url: "/super-admin/products" },
      { title: "Tồn kho toàn hệ thống", url: "/super-admin/inventory" },
    ],
  },
  {
    title: "Bán hàng",
    icon: ClipboardList,
    children: [
      { title: "Đơn hàng toàn hệ thống", url: "/super-admin/orders" },
      { title: "Mã giảm giá", url: "/super-admin/coupons" },
      { title: "Đánh giá & bình luận", url: "/super-admin/reviews" },
    ],
  },
  {
    title: "Phân tích & cấu hình",
    icon: BarChart3,
    children: [
      { title: "Báo cáo", url: "/super-admin/reports" },
      { title: "Cấu hình hệ thống", url: "/super-admin/settings" },
    ],
  },
];

const branchAdminItems: SidebarNavItem[] = [
  { title: "Tổng quan chi nhánh", url: "/branch-admin/dashboard", icon: Gauge },
  {
    title: "Vận hành chi nhánh",
    icon: Boxes,
    children: [
      { title: "Đơn hàng chi nhánh", url: "/branch-admin/orders" },
      { title: "Tồn kho chi nhánh", url: "/branch-admin/inventory" },
      { title: "Sản phẩm sắp hết hàng", url: "/branch-admin/low-stock" },
    ],
  },
  {
    title: "Kinh doanh",
    icon: Tags,
    children: [
      { title: "Giá bán theo chi nhánh", url: "/branch-admin/prices" },
      { title: "Đánh giá sản phẩm", url: "/branch-admin/reviews" },
    ],
  },
  { title: "Báo cáo chi nhánh", url: "/branch-admin/reports", icon: BarChart3 },
];

const navigationItems = computed(() => {
  return authStore.role === "BRANCH_ADMIN" ? branchAdminItems : superAdminItems;
});

const roleLabel = computed(() => {
  return authStore.role === "BRANCH_ADMIN" ? "Branch Admin" : "Super Admin";
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
