import type { Component } from "vue";

export interface SidebarNavChild {
  id: string;
  title: string;
  routeName: string;
}

export interface SidebarNavItem {
  id: string;
  title: string;
  routeName?: string;
  icon: Component;
  children?: SidebarNavChild[];
}
