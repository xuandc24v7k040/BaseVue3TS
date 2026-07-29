<script setup lang="ts">
import { Check, LoaderCircle, MapPin, Search } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { toast } from "vue-sonner";
import type { StorefrontBranchResponseDto } from "@/api/generated/models";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStorefrontBranchesQuery } from "@/features/storefront/api/storefront-api";
import { storefrontErrorMessage } from "@/features/storefront/utils/storefront-error";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";
import { useAuthStore } from "@/stores/auth.store";
import { useCartActions } from "@/features/cart/api/cart-api";
import { cartErrorMessage } from "@/features/cart/utils/cart-error";

const branchStore = useStorefrontBranchStore();
const route = useRoute();
const isCheckoutRoute = computed(() =>
  String(route.name ?? "").startsWith("client-checkout"),
);
const authStore = useAuthStore();
const cartActions = useCartActions();
const branchesQuery = useStorefrontBranchesQuery();
const open = ref(false);
const draftBranchId = ref<string | null>(null);
const branchSearch = ref("");
const confirming = ref(false);
const checkoutConfirmOpen = ref(false);

watch(
  () => branchesQuery.data.value,
  (branches) => {
    if (branches) branchStore.initialize(branches);
  },
  { immediate: true },
);

const filteredBranches = computed(() => {
  const query = branchSearch.value.trim().toLocaleLowerCase("vi-VN");
  if (!query) return branchStore.branches;
  return branchStore.branches.filter((branch) =>
    `${branch.name} ${branch.address} ${branch.province ?? ""}`
      .toLocaleLowerCase("vi-VN")
      .includes(query),
  );
});

function openSelector(): void {
  draftBranchId.value = branchStore.selectedBranchId;
  branchSearch.value = "";
  open.value = true;
}

async function confirmSelection(): Promise<void> {
  if (!draftBranchId.value || confirming.value) return;
  const changed = draftBranchId.value !== branchStore.selectedBranchId;
  if (changed && isCheckoutRoute.value) {
    checkoutConfirmOpen.value = true;
    return;
  }
  await commitSelection();
}

async function commitSelection(): Promise<void> {
  if (!draftBranchId.value || confirming.value) return;
  confirming.value = true;
  const changed = draftBranchId.value !== branchStore.selectedBranchId;
  const draftBranch = branchStore.branches.find(
    (branch) => branch.id === draftBranchId.value,
  );
  try {
    if (changed && authStore.user?.type === "CUSTOMER") {
      await cartActions.changeBranch(draftBranchId.value);
    }
    const selected = await branchStore.select(draftBranchId.value);
    if (!selected) {
      toast.error(
        "Chi nhánh không còn hoạt động. Vui lòng chọn chi nhánh khác.",
      );
      return;
    }
    open.value = false;
    checkoutConfirmOpen.value = false;
    if (changed)
      toast.success(
        `Đã chuyển sang chi nhánh ${draftBranch?.name ?? "đã chọn"}.`,
      );
  } catch (error: unknown) {
    toast.error(
      cartErrorMessage(error, "Không thể thay đổi chi nhánh. Vui lòng thử lại."),
    );
  } finally {
    confirming.value = false;
  }
}

function cancelSelection(): void {
  draftBranchId.value = branchStore.selectedBranchId;
  branchSearch.value = "";
  open.value = false;
}

function handleOpenChange(nextOpen: boolean): void {
  open.value = nextOpen;
  if (!nextOpen) cancelSelection();
}

function selectDraft(branch: StorefrontBranchResponseDto): void {
  draftBranchId.value = branch.id;
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogTrigger as-child>
      <Button
        type="button"
        variant="outline"
        class="h-11 justify-start gap-2 border-[var(--bookora-border)] bg-transparent px-3 text-[var(--bookora-ink)] shadow-none hover:bg-[var(--bookora-soft)]"
        aria-label="Chọn chi nhánh"
        data-testid="branch-selector-trigger"
        @click="openSelector"
      >
        <MapPin
          aria-hidden="true"
          class="size-4.5 text-[var(--bookora-green)]"
        />
        <span class="max-w-48 truncate text-sm">
          <strong class="font-semibold">{{
            branchStore.selectedBranch?.name ??
            (branchesQuery.isPending.value ? "Đang tải..." : "Chọn chi nhánh")
          }}</strong>
        </span>
      </Button>
    </DialogTrigger>

    <DialogContent
      class="bookora-client-theme grid max-h-[calc(100dvh-1rem)] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-[var(--bookora-border)] bg-[var(--bookora-cream)] p-0 sm:max-h-[min(85dvh,42rem)] sm:max-w-lg"
    >
      <div>
        <DialogHeader class="px-5 pb-4 pt-5 pr-12 sm:px-6 sm:pb-5 sm:pt-6">
          <DialogTitle class="text-xl text-[var(--bookora-ink)]"
            >Chọn chi nhánh</DialogTitle
          >
          <DialogDescription class="leading-6 text-[var(--bookora-muted)]">
            Chi nhánh được dùng để hiển thị tình trạng còn hàng của từng phiên
            bản.
          </DialogDescription>
        </DialogHeader>

        <div class="relative px-5 pb-4 sm:px-6">
          <Search
            aria-hidden="true"
            class="pointer-events-none absolute left-8 top-1/2 size-4 -translate-y-[calc(50%+0.5rem)] text-[var(--bookora-muted)] sm:left-9"
          />
          <Input
            v-model="branchSearch"
            aria-label="Tìm kiếm chi nhánh"
            data-testid="branch-search"
            placeholder="Tìm theo tên hoặc địa chỉ"
            class="h-11 border-[var(--bookora-border)] bg-background pl-10 shadow-none focus-visible:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/20"
          />
        </div>
      </div>

      <ScrollArea class="min-h-0 flex-1 px-5 pb-4 sm:px-6">
        <div
          v-if="branchesQuery.isPending.value"
          class="grid min-h-32 place-items-center text-sm text-[var(--bookora-muted)]"
        >
          <LoaderCircle aria-hidden="true" class="size-5 animate-spin" />
          <span>Đang tải chi nhánh...</span>
        </div>
        <div
          v-else-if="branchesQuery.isError.value"
          class="rounded-lg border border-dashed p-5 text-center text-sm"
        >
          <p>
            {{
              storefrontErrorMessage(
                branchesQuery.error.value,
                "Không thể tải danh sách chi nhánh.",
              )
            }}
          </p>
          <Button type="button" variant="link" @click="branchesQuery.refetch()"
            >Thử lại</Button
          >
        </div>
        <div
          v-else-if="filteredBranches.length"
          class="grid gap-2"
          role="radiogroup"
          aria-label="Danh sách chi nhánh"
        >
          <button
            v-for="branch in filteredBranches"
            :key="branch.id"
            type="button"
            role="radio"
            :aria-checked="draftBranchId === branch.id"
            class="flex min-h-14 items-center justify-between rounded-lg border bg-background px-4 py-3 text-left text-sm transition-colors hover:border-[var(--bookora-green)] hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            :class="
              draftBranchId === branch.id
                ? 'border-[var(--bookora-green)] bg-[var(--bookora-soft)]'
                : 'border-[var(--bookora-border)]'
            "
            @click="selectDraft(branch)"
          >
            <span>
              <strong class="block font-semibold">{{ branch.name }}</strong>
              <span class="mt-0.5 block text-xs text-[var(--bookora-muted)]">{{
                branch.address
              }}</span>
            </span>
            <Check
              v-if="draftBranchId === branch.id"
              aria-hidden="true"
              class="size-4 text-[var(--bookora-green)]"
            />
          </button>
        </div>
        <p
          v-else
          class="rounded-lg border border-dashed border-[var(--bookora-border)] bg-background px-4 py-8 text-center text-sm text-[var(--bookora-muted)]"
        >
          Không tìm thấy chi nhánh phù hợp.
        </p>
      </ScrollArea>

      <DialogFooter
        class="border-t border-[var(--bookora-border)] bg-background/80 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
      >
        <Button
          type="button"
          variant="outline"
          class="border-[var(--bookora-border)] sm:min-w-24"
          @click="cancelSelection"
          >Hủy</Button
        >
        <Button
          type="button"
          :disabled="!draftBranchId || confirming"
          class="bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)] sm:min-w-24"
          @click="confirmSelection"
        >
          Xác nhận
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <AlertDialog
    :open="checkoutConfirmOpen"
    @update:open="checkoutConfirmOpen = $event"
  >
    <AlertDialogContent class="bookora-client-theme">
      <AlertDialogTitle>Thay đổi chi nhánh?</AlertDialogTitle>
      <AlertDialogDescription>
        Giá, tồn kho và phí vận chuyển sẽ được kiểm tra lại. Một số sản phẩm có
        thể không còn khả dụng tại chi nhánh mới.
      </AlertDialogDescription>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AlertDialogCancel>Giữ chi nhánh hiện tại</AlertDialogCancel>
        <AlertDialogAction
          :disabled="confirming"
          class="bg-[var(--bookora-green)] hover:bg-[var(--bookora-green-hover)]"
          @click="commitSelection"
        >
          <LoaderCircle v-if="confirming" class="mr-2 size-4 animate-spin" />
          Đổi chi nhánh
        </AlertDialogAction>
      </div>
    </AlertDialogContent>
  </AlertDialog>
</template>
