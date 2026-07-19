<script setup lang="ts">
import axios from "axios";
import { computed, ref } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import {
  CheckCircle2,
  LoaderCircle,
  MoreHorizontal,
  Power,
  Star,
  Trash2,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  ErrorResponseDto,
  ManagedUserBranchResponseDto,
} from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isBranchAdminAssignment } from "../types";
import type { BranchAdmin } from "../types";
import { branchAdminKeys } from "../api/branch-admin-query-keys";
import {
  activateBranchAdminAssignment,
  deactivateBranchAdminAssignment,
  removeBranchAdminAssignment,
  setBranchAdminPrimary,
} from "../api/branch-admin-api";

type LifecycleAction = "activate" | "deactivate" | "remove" | "primary";

const props = defineProps<{
  admin: BranchAdmin;
  assignment: ManagedUserBranchResponseDto;
}>();
const emit = defineEmits<{ changed: [] }>();
const queryClient = useQueryClient();
const { canAll } = useAdminPermissions();
const open = ref(false);
const action = ref<LifecycleAction>("activate");
const replacementBranchId = ref("");
const validationMessage = ref("");
const submitting = ref(false);

const canManage = computed(
  () =>
    isBranchAdminAssignment(props.assignment) &&
    canAll([
      ADMIN_PERMISSIONS.BRANCH_ADMIN_ASSIGN,
      ADMIN_PERMISSIONS.BRANCHES_ASSIGN,
    ]),
);
const replacements = computed(() =>
  props.admin.userBranches.filter(
    (item) =>
      isBranchAdminAssignment(item) &&
      item.branchId !== props.assignment.branchId &&
      item.isActive &&
      item.branch.isActive,
  ),
);
const requiresReplacement = computed(
  () =>
    props.assignment.isPrimary &&
    (action.value === "deactivate" || action.value === "remove") &&
    replacements.value.length > 0,
);
const title = computed(
  () =>
    ({
      activate: "Kích hoạt lại phân công",
      deactivate: "Ngừng hoạt động phân công",
      remove: "Gỡ khỏi chi nhánh",
      primary: "Đặt làm chi nhánh chính",
    })[action.value],
);

function begin(nextAction: LifecycleAction): void {
  action.value = nextAction;
  replacementBranchId.value = "";
  validationMessage.value = "";
  open.value = true;
}

function selectReplacement(id: string): void {
  replacementBranchId.value = id;
  validationMessage.value = "";
}

function errorMessage(error: unknown): string {
  if (!axios.isAxiosError<ErrorResponseDto>(error))
    return "Không thể cập nhật phân công. Vui lòng thử lại.";
  const code = error.response?.data.code;
  if (code === "USER_ACTIVATION_REQUIRES_ACTIVE_BRANCH") {
    return "Không thể kích hoạt tài khoản. Quản trị viên cần có ít nhất một phân công đang hoạt động tại chi nhánh đang hoạt động và có đúng một chi nhánh chính.";
  }
  if (error.response?.status === 403)
    return "Bạn không có quyền cập nhật phân công này.";
  if (error.response?.status === 404)
    return "Phân công không còn tồn tại. Danh sách sẽ được tải lại.";
  if (error.response?.status === 409)
    return "Dữ liệu phân công vừa thay đổi hoặc đang xung đột. Vui lòng tải lại.";
  if (error.response?.status === 400)
    return "Chi nhánh hoặc chi nhánh chính thay thế không còn hợp lệ.";
  return "Không thể cập nhật phân công. Vui lòng thử lại.";
}

async function refresh(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: branchAdminKeys.all });
  emit("changed");
}

async function submit(): Promise<void> {
  if (submitting.value || !isBranchAdminAssignment(props.assignment)) return;
  if (requiresReplacement.value && !replacementBranchId.value) {
    validationMessage.value = "Vui lòng chọn chi nhánh chính thay thế.";
    return;
  }
  submitting.value = true;
  try {
    const payload = replacementBranchId.value
      ? { replacementBranchId: replacementBranchId.value }
      : {};
    if (action.value === "activate") {
      await activateBranchAdminAssignment(
        props.admin.id,
        props.assignment.branchId,
      );
      toast.success("Đã kích hoạt lại phân công chi nhánh.");
    } else if (action.value === "deactivate") {
      await deactivateBranchAdminAssignment(
        props.admin.id,
        props.assignment.branchId,
        payload,
      );
      toast.success("Đã ngừng hoạt động phân công chi nhánh.");
    } else if (action.value === "primary") {
      await setBranchAdminPrimary(props.admin.id, props.assignment.branchId);
      toast.success("Đã cập nhật chi nhánh chính của quản trị viên.");
    } else {
      const response = await removeBranchAdminAssignment(
        props.admin.id,
        props.assignment.branchId,
        payload,
      );
      toast.success(
        response.data.count === 1
          ? "Đã gỡ quản trị viên khỏi chi nhánh."
          : "Phân công này không còn tồn tại; danh sách đã được đồng bộ.",
      );
    }
    open.value = false;
    await refresh();
  } catch (error) {
    toast.error(errorMessage(error));
    if (axios.isAxiosError(error) && error.response?.status === 404)
      await refresh();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <DropdownMenu v-if="canManage">
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        class="h-8 w-8"
        :disabled="submitting"
        aria-label="Mở thao tác phân công"
      >
        <MoreHorizontal class="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="z-[60] w-60">
      <DropdownMenuItem
        v-if="!assignment.isActive && assignment.branch.isActive"
        class="gap-2"
        @select="begin('activate')"
        ><CheckCircle2 class="h-4 w-4" />Kích hoạt lại</DropdownMenuItem
      >
      <DropdownMenuItem
        v-if="assignment.isActive && !assignment.isPrimary"
        class="gap-2"
        @select="begin('primary')"
        ><Star class="h-4 w-4" />Đặt làm chi nhánh chính</DropdownMenuItem
      >
      <DropdownMenuItem
        v-if="assignment.isActive"
        class="gap-2"
        @select="begin('deactivate')"
        ><Power class="h-4 w-4" />Ngừng hoạt động</DropdownMenuItem
      >
      <DropdownMenuSeparator />
      <DropdownMenuItem
        class="gap-2 text-destructive focus:text-destructive"
        @select="begin('remove')"
        ><Trash2 class="h-4 w-4" />Gỡ khỏi chi nhánh</DropdownMenuItem
      >
    </DropdownMenuContent>
  </DropdownMenu>

  <Dialog
    :open="open"
    @update:open="
      (value) => {
        if (!submitting) open = value;
      }
    "
  >
    <DialogContent
      class="grid max-h-[90dvh] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-lg"
    >
      <DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription
          >{{ admin.fullName }} ·
          {{ assignment.branch.name }}</DialogDescription
        >
      </DialogHeader>
      <ScrollArea
        class="min-h-0 w-full min-w-0 max-w-full overflow-hidden px-5 sm:px-6"
      >
        <div class="w-full min-w-0 max-w-full space-y-4 px-1 py-5 text-sm">
          <p v-if="action === 'remove'">
            Thao tác này chỉ gỡ phân công tại chi nhánh, không xóa tài khoản
            quản trị viên.
          </p>
          <p v-else-if="action === 'primary'">
            Chi nhánh này sẽ trở thành chi nhánh chính của quản trị viên; đây
            không phải là “quản lý chính” duy nhất của chi nhánh.
          </p>
          <p v-else-if="action === 'activate'">
            Kích hoạt phân công không tự kích hoạt tài khoản hoặc thay đổi chi
            nhánh chính.
          </p>
          <p v-else>
            Phân công sẽ ngừng hoạt động. Tài khoản có thể bị khóa nếu không còn
            phân công hợp lệ.
          </p>

          <section v-if="requiresReplacement" class="space-y-3">
            <div>
              <p class="font-medium">Chi nhánh chính thay thế</p>
              <p class="text-muted-foreground">
                Chọn một phân công đang hoạt động tại chi nhánh đang hoạt động.
              </p>
            </div>
            <ScrollArea class="h-48 rounded-lg border">
              <div class="space-y-2 p-2 pr-4">
                <button
                  v-for="item in replacements"
                  :key="item.id"
                  type="button"
                  class="w-full rounded-md border p-3 text-left hover:bg-muted/50"
                  :class="
                    replacementBranchId === item.branchId
                      ? 'border-primary bg-primary/5'
                      : ''
                  "
                  :aria-pressed="replacementBranchId === item.branchId"
                  @click="selectReplacement(item.branchId)"
                >
                  <span class="block font-medium">{{ item.branch.name }}</span>
                  <span class="text-xs text-muted-foreground"
                    >Phân công hoạt động · Chi nhánh hoạt động</span
                  >
                </button>
              </div>
            </ScrollArea>
            <p v-if="validationMessage" role="alert" class="text-destructive">
              {{ validationMessage }}
            </p>
          </section>
          <p
            v-else-if="
              assignment.isPrimary &&
              (action === 'deactivate' || action === 'remove')
            "
            class="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900"
          >
            Không còn chi nhánh hoạt động phù hợp để thay thế. Sau thao tác này
            tài khoản sẽ không còn chi nhánh chính hoạt động và có thể bị khóa.
          </p>
        </div>
      </ScrollArea>
      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6">
        <Button
          type="button"
          variant="outline"
          :disabled="submitting"
          @click="open = false"
          >Hủy</Button
        >
        <Button
          type="button"
          :variant="
            action === 'remove' || action === 'deactivate'
              ? 'destructive'
              : 'default'
          "
          :disabled="submitting"
          @click="submit"
          ><LoaderCircle
            v-if="submitting"
            class="mr-2 h-4 w-4 animate-spin"
          />Xác nhận</Button
        >
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
