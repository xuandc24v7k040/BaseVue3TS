<script setup lang="ts">
import { Building2, Check, Search } from "@lucide/vue";
import { RouterView } from "vue-router";
import AppSidebar from "@/components/admin/sidebar/AppSidebar.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";
import { useAdminIdentity } from "@/composables/use-admin-identity";
import { useAdminRouteReevaluation } from "@/composables/use-admin-route-reevaluation";

const authStore = useAuthStore();
const branchStore = useBranchStore();
const { roleLabel } = useAdminIdentity();
useAdminRouteReevaluation();

async function setSelectedBranch(branchId: string | null): Promise<void> {
  await branchStore.setSelectedBranch(branchId);
}
</script>

<template>
  <SidebarProvider class="min-h-screen bg-muted/30 text-foreground">
    <AppSidebar />

    <SidebarInset class="min-w-0 overflow-x-hidden">
      <header
        class="sticky top-0 z-50 h-16 w-full min-w-0 shrink-0 border-b bg-background/95 backdrop-blur"
      >
        <div
          class="flex h-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6"
        >
          <div class="flex min-w-0 shrink-0 items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" class="hidden h-6 sm:block" />

            <div class="hidden min-w-0 max-w-56 xl:block">
              <div class="flex items-center gap-2">
                <p class="truncate text-lg font-semibold">Bookora</p>
                <Badge variant="secondary">{{ roleLabel }}</Badge>
              </div>
              <p class="hidden truncate text-sm text-muted-foreground sm:block">
                {{ authStore.email || "admin@bookora.local" }}
              </p>
            </div>
          </div>

          <div class="hidden min-w-0 flex-1 justify-center lg:flex">
            <div class="relative w-full max-w-[560px]">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                class="h-10 rounded-xl border-border bg-background pl-9 pr-3 shadow-sm sm:pr-20"
                placeholder="Tìm kiếm nhanh đơn hàng, khách hàng, sản phẩm,..."
              />
              <kbd
                class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex"
              >
                Ctrl + K
              </kbd>
            </div>
          </div>

          <div class="flex min-w-0 flex-1 shrink-0 justify-end lg:flex-none">
            <DropdownMenu
              v-if="branchStore.isInitialized && (authStore.user?.type === 'SYSTEM' || branchStore.availableBranches.length > 1)"
            >
              <DropdownMenuTrigger as-child>
                <Button
                  type="button"
                  variant="outline"
                  class="h-10 min-w-0 max-w-52 justify-start gap-2 rounded-xl bg-background"
                >
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                  <span class="hidden text-xs text-muted-foreground md:inline"
                    >Phạm vi</span
                  >
                  <span class="max-w-20 truncate font-medium sm:max-w-36">
                    {{ branchStore.scopeLabel }}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-56">
                <DropdownMenuLabel>Phạm vi quản lý</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-if="authStore.user?.type === 'SYSTEM'"
                  class="gap-2"
                  @click="setSelectedBranch(null)"
                >
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                  <span>Toàn hệ thống</span>
                  <Check
                    v-if="branchStore.isSystemScope"
                    class="ml-auto h-4 w-4 text-primary"
                  />
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-for="branch in branchStore.availableBranches"
                  :key="branch.id"
                  class="gap-2"
                  @click="setSelectedBranch(branch.id)"
                >
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                  <span>{{ branch.name }}</span>
                  <Check
                    v-if="branch.id === branchStore.selectedBranchId"
                    class="ml-auto h-4 w-4 text-primary"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div
              v-else
              class="flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium shadow-sm"
            >
              <Building2 class="h-4 w-4 text-muted-foreground" />
              <span class="max-w-24 truncate sm:max-w-40">
                {{ branchStore.scopeLabel }}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div
        class="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col overflow-x-hidden px-4 py-6 sm:px-6 lg:py-8"
      >
        <RouterView />
        <footer class="mt-auto pt-8 text-sm text-muted-foreground">
          © 2025 Bookora. All rights reserved.
        </footer>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
