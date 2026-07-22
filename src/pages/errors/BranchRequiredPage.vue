<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Building2,
  Check,
  ChevronsUpDown,
  LoaderCircle,
  Search,
} from "@lucide/vue";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBranchStore } from "@/stores/branch.store";

const route = useRoute();
const router = useRouter();
const branchStore = useBranchStore();
const open = ref(false);
const search = ref("");
const selecting = ref(false);
const activeIndex = ref(0);
const redirect = computed(() =>
  typeof route.query.redirect === "string" &&
  route.query.redirect.startsWith("/") &&
  !route.query.redirect.startsWith("//")
    ? route.query.redirect
    : "/branch-admin/dashboard",
);
const isStaffContext = computed(() => redirect.value.includes("/staff"));
const isInventoryContext = computed(() =>
  redirect.value.includes("/inventory"),
);
const isReceiptContext = computed(() => redirect.value.includes("/receipts"));
const contextTitle = computed(() => {
  if (isStaffContext.value) return "Nhân viên chi nhánh";
  if (isReceiptContext.value) return "Phiếu nhập kho";
  if (isInventoryContext.value) return "Tồn kho";
  return "Chọn chi nhánh làm việc";
});
const contextDescription = computed(() => {
  if (isStaffContext.value)
    return "Chọn chi nhánh để xem và quản lý nhân viên trong đúng phạm vi được cấp.";
  if (isReceiptContext.value)
    return "Chọn chi nhánh để quản lý phiếu nhập và cập nhật tồn đúng kho.";
  if (isInventoryContext.value)
    return "Chọn chi nhánh để xem số lượng tồn và ngưỡng cảnh báo của đúng kho.";
  return "Chọn chi nhánh trước khi tiếp tục vào chức năng yêu cầu phạm vi cụ thể.";
});
const filteredBranches = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase("vi");
  return branchStore.availableBranches.filter(
    (branch) => !needle || branch.name.toLocaleLowerCase("vi").includes(needle),
  );
});
const quickBranches = computed(() => branchStore.availableBranches.slice(0, 6));

watch(filteredBranches, () => {
  activeIndex.value = 0;
});
watch(open, (value) => {
  if (!value) {
    search.value = "";
    activeIndex.value = 0;
  }
});

async function selectBranch(branchId: string): Promise<void> {
  if (selecting.value) return;
  selecting.value = true;
  try {
    const changed = await branchStore.setSelectedBranch(branchId);
    if (changed) {
      open.value = false;
      await router.replace(redirect.value);
    }
  } finally {
    selecting.value = false;
  }
}

function handleSearchKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    open.value = false;
    return;
  }
  if (!filteredBranches.value.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % filteredBranches.value.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex.value =
      (activeIndex.value - 1 + filteredBranches.value.length) %
      filteredBranches.value.length;
  } else if (event.key === "Enter") {
    event.preventDefault();
    const activeBranch = filteredBranches.value[activeIndex.value];
    if (activeBranch) void selectBranch(activeBranch.id);
  }
}
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      v-if="isStaffContext"
      group-label="Quản lý nhân sự"
      :group-to="redirect"
      section-label="Nhân viên chi nhánh"
    />

    <div class="mx-auto w-full max-w-4xl">
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        {{ contextTitle }}
      </h1>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        {{ contextDescription }}
      </p>
    </div>

    <Card class="mx-auto w-full max-w-4xl overflow-visible rounded-2xl">
      <CardHeader class="border-b bg-muted/20 p-5 sm:p-7">
        <div class="flex items-start gap-4">
          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-12"
          >
            <Building2 class="size-6" />
          </span>
          <div class="min-w-0">
            <CardTitle>Chọn chi nhánh làm việc</CardTitle>
            <CardDescription class="mt-1.5 leading-6">
              Dữ liệu và quyền áp dụng theo chi nhánh được chọn.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-5 sm:p-7">
        <div
          v-if="!branchStore.isInitialized"
          class="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <LoaderCircle class="size-5 animate-spin" />
          Đang tải phạm vi chi nhánh...
        </div>

        <template v-else-if="branchStore.availableBranches.length">
          <div class="space-y-2.5">
            <Label for="branch-scope-trigger">Chi nhánh</Label>
            <Popover v-model:open="open">
              <PopoverTrigger as-child>
                <Button
                  id="branch-scope-trigger"
                  type="button"
                  variant="outline"
                  role="combobox"
                  :aria-expanded="open"
                  aria-controls="branch-scope-listbox"
                  class="h-12 w-full justify-between px-4 text-left font-normal focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span class="truncate">
                    {{
                      branchStore.selectedBranch?.name ||
                      "Tìm kiếm và chọn chi nhánh..."
                    }}
                  </span>
                  <ChevronsUpDown
                    class="ml-3 size-4 shrink-0 text-muted-foreground"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                class="z-[70] w-[min(44rem,calc(100vw-2rem))] p-0 sm:w-[var(--reka-popover-trigger-width)]"
              >
                <div class="relative border-b p-3">
                  <Search
                    class="pointer-events-none absolute left-6 top-6 size-4 text-muted-foreground"
                  />
                  <Input
                    v-model="search"
                    class="pl-9 focus-visible:ring-offset-1"
                    placeholder="Tìm theo tên chi nhánh..."
                    aria-label="Tìm chi nhánh"
                    :aria-activedescendant="
                      filteredBranches[activeIndex]
                        ? `branch-option-${filteredBranches[activeIndex]?.id}`
                        : undefined
                    "
                    @keydown="handleSearchKeydown"
                  />
                </div>
                <ScrollArea class="h-64 p-2">
                  <div id="branch-scope-listbox" role="listbox">
                    <button
                      v-for="(branch, index) in filteredBranches"
                      :id="`branch-option-${branch.id}`"
                      :key="branch.id"
                      type="button"
                      role="option"
                      :aria-selected="
                        branch.id === branchStore.selectedBranchId
                      "
                      class="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      :class="{ 'bg-muted': index === activeIndex }"
                      :disabled="selecting"
                      @mouseenter="activeIndex = index"
                      @click="selectBranch(branch.id)"
                    >
                      <Building2
                        class="size-4 shrink-0 text-muted-foreground"
                      />
                      <span class="min-w-0 flex-1 truncate font-medium">
                        {{ branch.name }}
                      </span>
                      <Check
                        v-if="branch.id === branchStore.selectedBranchId"
                        class="size-4 shrink-0 text-primary"
                      />
                    </button>
                    <p
                      v-if="!filteredBranches.length"
                      class="p-8 text-center text-sm text-muted-foreground"
                    >
                      Không tìm thấy chi nhánh phù hợp.
                    </p>
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          <div class="mt-7 space-y-3">
            <p class="text-sm font-medium">Chi nhánh có thể chọn</p>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                v-for="branch in quickBranches"
                :key="branch.id"
                type="button"
                class="group flex min-h-20 items-center gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                :disabled="selecting"
                @click="selectBranch(branch.id)"
              >
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                >
                  <Building2 class="size-4" />
                </span>
                <span class="min-w-0 flex-1 truncate text-sm font-medium">
                  {{ branch.name }}
                </span>
                <Check
                  v-if="branch.id === branchStore.selectedBranchId"
                  class="size-4 shrink-0 text-primary"
                />
              </button>
            </div>
          </div>
        </template>

        <div v-else class="rounded-xl border border-dashed p-8 text-center">
          <Building2 class="mx-auto size-9 text-muted-foreground" />
          <p class="mt-3 font-medium">
            Bạn chưa được phân công vào chi nhánh đang hoạt động.
          </p>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Phiên đăng nhập vẫn được giữ nguyên; vui lòng liên hệ quản trị hệ
            thống.
          </p>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
