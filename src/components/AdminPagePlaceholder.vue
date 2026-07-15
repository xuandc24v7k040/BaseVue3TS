<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import {
  ArrowUpRight,
  Boxes,
  Building2,
  ClipboardList,
  PackageCheck,
  Users,
  WalletCards,
} from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";
import { useAdminIdentity } from "@/composables/use-admin-identity";

interface StatCard {
  label: string;
  value: string;
  description: string;
  trend: string;
  icon: Component;
  iconClass: string;
}

const props = defineProps<{
  title: string;
  description: string;
  scope: "super-admin" | "branch-admin";
}>();

const authStore = useAuthStore();
const branchStore = useBranchStore();
const { roleLabel } = useAdminIdentity();

const stats = computed<StatCard[]>(() => {
  if (props.scope === "branch-admin") {
    return [
      {
        label: "Đơn trong ngày",
        value: "42",
        description: branchStore.scopeLabel,
        trend: "↑ 12.5% so với hôm qua",
        icon: ClipboardList,
        iconClass: "bg-blue-50 text-blue-600",
      },
      {
        label: "Sản phẩm còn hàng",
        value: "1,284",
        description: branchStore.scopeLabel,
        trend: "↑ 8.2% so với hôm qua",
        icon: PackageCheck,
        iconClass: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Sắp hết hàng",
        value: "18",
        description: "Cần kiểm tra nhập kho",
        trend: "— Không đổi",
        icon: Boxes,
        iconClass: "bg-amber-50 text-amber-600",
      },
    ];
  }

  return [
    {
      label: "Doanh thu hôm nay",
      value: "128M",
      description: `Phạm vi: ${branchStore.scopeLabel}`,
      trend: "↑ 12.5% so với hôm qua",
      icon: WalletCards,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "Đơn hàng mới",
      value: "316",
      description: `Phạm vi: ${branchStore.scopeLabel}`,
      trend: "↑ 8.2% so với hôm qua",
      icon: ClipboardList,
      iconClass: "bg-violet-50 text-violet-600",
    },
    {
      label: "Chi nhánh hoạt động",
      value: branchStore.isSystemScope
        ? String(branchStore.availableBranches.length)
        : "1",
      description: branchStore.scopeLabel,
      trend: "— Không đổi",
      icon: Building2,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Người dùng",
      value: "8,420",
      description: "Tài khoản khách hàng demo",
      trend: "↑ 15.7% so với tháng trước",
      icon: Users,
      iconClass: "bg-amber-50 text-amber-600",
    },
  ];
});

const contextLabel = computed(() => {
  if (authStore.user?.type === "BRANCH") {
    return `Chi nhánh được gán: ${branchStore.scopeLabel}`;
  }

  return `Phạm vi quản lý: ${branchStore.scopeLabel}`;
});
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{{ title }}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="max-w-3xl space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
              {{ title }}
            </h1>
            <Badge variant="secondary">{{ roleLabel }}</Badge>
          </div>
          <p class="text-sm leading-6 text-muted-foreground sm:text-base">
            {{ description }}
          </p>
          <p class="text-sm font-medium text-foreground">{{ contextLabel }}</p>
        </div>
        <Button type="button" variant="outline" class="rounded-xl"
          >Thao tác demo</Button
        >
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-md"
      >
        <CardHeader
          class="flex flex-row items-start justify-between gap-4 pb-3"
        >
          <div class="space-y-1">
            <CardDescription>{{ stat.label }}</CardDescription>
            <CardTitle class="text-2xl">{{ stat.value }}</CardTitle>
          </div>
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-xl',
              stat.iconClass,
            ]"
          >
            <component :is="stat.icon" class="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="text-sm text-muted-foreground">{{ stat.description }}</p>
          <p
            class="flex items-center gap-1 text-sm font-medium text-emerald-600"
          >
            <ArrowUpRight v-if="stat.trend.startsWith('↑')" class="h-4 w-4" />
            {{ stat.trend }}
          </p>
        </CardContent>
      </Card>
    </div>

    <Card class="rounded-2xl border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Nội dung chính</CardTitle>
        <CardDescription>
          Khu vực này dành cho bảng dữ liệu, bộ lọc và biểu đồ ở các bước phát
          triển tiếp theo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <slot>
          <div
            class="rounded-xl border border-dashed bg-muted/40 p-6 text-sm leading-6 text-muted-foreground"
          >
            Chưa triển khai CRUD hoặc API thật. Trang hiện chỉ dựng layout, điều
            hướng, guard quyền và dữ liệu demo.
          </div>
        </slot>
      </CardContent>
    </Card>
  </section>
</template>
