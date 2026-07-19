<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { ArrowRightLeft, Building2, LoaderCircle } from "@lucide/vue";
import { toast } from "vue-sonner";
import type { StaffBranchAssignmentResponseDto } from "@/api/generated/models";
import { StaffAssignableRolesAction } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  assignExistingStaff,
  listActiveBranches,
  transferStaff,
} from "../api/staff-api";
import { staffKeys } from "../api/staff-query-keys";
import { staffErrorMessage } from "../utils/staff-error-messages";
import StaffAccessSelector from "./StaffAccessSelector.vue";
import StaffBranchCombobox from "./StaffBranchCombobox.vue";

type Mode = "assign" | "transfer";

const props = defineProps<{
  staffId: string;
  currentBranchId: string;
  assignments: StaffBranchAssignmentResponseDto[];
}>();
const emit = defineEmits<{ changed: [] }>();
const open = ref(false);
const mode = ref<Mode>("assign");
const branchId = ref("");
const sourceBranchId = ref("");
const roleIds = ref<string[]>([]);
const permissionIds = ref<string[]>([]);
const error = ref("");
const submitting = ref(false);
const branchesQuery = useQuery({
  queryKey: staffKeys.activeBranches(),
  queryFn: ({ signal }) => listActiveBranches(signal),
  enabled: computed(() => open.value),
  staleTime: 60_000,
});
const mappedIds = computed(
  () => new Set(props.assignments.map((item) => item.branchId)),
);
const activeSources = computed(() =>
  props.assignments.filter((item) => item.isActive && item.branch.isActive),
);
const sourceAssignment = computed(() =>
  activeSources.value.find((item) => item.branchId === sourceBranchId.value),
);
const assignBranches = computed(() =>
  (branchesQuery.data.value?.data ?? []).filter(
    (branch) => !mappedIds.value.has(branch.id),
  ),
);
const transferBranches = computed(() =>
  (branchesQuery.data.value?.data ?? []).filter(
    (branch) =>
      branch.id !== sourceBranchId.value &&
      !props.assignments.some(
        (item) => item.branchId === branch.id && item.isActive,
      ),
  ),
);
const targetOptions = computed(() =>
  mode.value === "assign" ? assignBranches.value : transferBranches.value,
);
const targetBranch = computed(() =>
  (branchesQuery.data.value?.data ?? []).find(
    (item) => item.id === branchId.value,
  ),
);

watch(branchId, () => {
  roleIds.value = [];
  permissionIds.value = [];
  error.value = "";
});

function begin(next: Mode): void {
  mode.value = next;
  branchId.value = "";
  sourceBranchId.value =
    next === "transfer"
      ? (activeSources.value.find(
          (item) => item.branchId === props.currentBranchId,
        )?.branchId ??
        activeSources.value.find((item) => item.isPrimary)?.branchId ??
        activeSources.value[0]?.branchId ??
        "")
      : "";
  roleIds.value = [];
  permissionIds.value = [];
  error.value = "";
  open.value = true;
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  if (!branchId.value) {
    error.value = "Vui lòng chọn chi nhánh đích.";
    return;
  }
  if (!roleIds.value.length) {
    error.value = "Vui lòng chọn ít nhất một vai trò tại chi nhánh đích.";
    return;
  }
  submitting.value = true;
  try {
    if (mode.value === "assign") {
      await assignExistingStaff(
        props.staffId,
        { roleIds: roleIds.value, permissionIds: permissionIds.value },
        branchId.value,
      );
      toast.success("Đã gán thêm chi nhánh cho nhân viên.");
    } else {
      await transferStaff(props.staffId, {
        fromBranchId: sourceBranchId.value,
        toBranchId: branchId.value,
        destinationRoleIds: roleIds.value,
      });
      toast.success("Đã điều chuyển nhân viên atomically.");
    }
    open.value = false;
    emit("changed");
  } catch (cause) {
    toast.error(staffErrorMessage(cause));
    emit("changed");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button type="button" variant="outline" @click="begin('assign')">
      <Building2 class="mr-2 size-4" />Gán thêm chi nhánh
    </Button>
    <Button
      type="button"
      variant="outline"
      :disabled="!activeSources.length"
      @click="begin('transfer')"
    >
      <ArrowRightLeft class="mr-2 size-4" />Điều chuyển
    </Button>
  </div>
  <Dialog :open="open" @update:open="(value) => !submitting && (open = value)">
    <DialogContent
      class="grid max-h-[92dvh] w-[calc(100vw-1.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-3xl"
    >
      <DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>
          {{
            mode === "assign" ? "Gán thêm chi nhánh" : "Điều chuyển nhân viên"
          }}
        </DialogTitle>
        <DialogDescription>
          {{
            mode === "assign"
              ? "Phân công, vai trò và quyền cho phép ban đầu được lưu nguyên tử."
              : "Phân công nguồn ngừng hoạt động; vai trò tại đích được thay thế và quyền cấp trực tiếp cũ tại đích bị xóa."
          }}
        </DialogDescription>
      </DialogHeader>
      <ScrollArea class="min-h-0 px-5 sm:px-6">
        <div class="space-y-5 py-5">
          <div v-if="mode === 'transfer'" class="space-y-2">
            <Label>Chi nhánh nguồn</Label>
            <div class="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {{
                sourceAssignment?.branch.name ||
                "Không có phân công nguồn hợp lệ"
              }}
            </div>
          </div>
          <StaffBranchCombobox
            id="assignment-target"
            v-model="branchId"
            label="Chi nhánh đích"
            :options="targetOptions"
            :disabled="branchesQuery.isLoading.value || submitting"
          />
          <section v-if="branchId" class="space-y-2">
            <h3 class="font-medium">Phân quyền tại {{ targetBranch?.name }}</h3>
            <StaffAccessSelector
              v-model:role-ids="roleIds"
              v-model:permission-ids="permissionIds"
              :branch-id-override="branchId"
              :catalog-action="
                mode === 'assign'
                  ? StaffAssignableRolesAction.CREATE
                  : StaffAssignableRolesAction.ASSIGN
              "
              :show-permissions="mode === 'assign'"
              :disabled="submitting"
              :role-error="error && !roleIds.length ? error : undefined"
            />
          </section>
          <p
            v-if="mode === 'transfer' && targetBranch"
            class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {{ targetBranch.name }} nhận chính xác các vai trò đã chọn. Direct
            override cũ tại đích bị xóa; primary chuyển sang đích nếu nguồn đang
            là primary. Tài khoản và session không đổi.
          </p>
          <p v-if="error" role="alert" class="text-sm text-destructive">
            {{ error }}
          </p>
        </div>
      </ScrollArea>
      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6">
        <Button
          type="button"
          variant="outline"
          :disabled="submitting"
          @click="open = false"
        >
          Hủy
        </Button>
        <Button type="button" :disabled="submitting" @click="submit">
          <LoaderCircle v-if="submitting" class="mr-2 size-4 animate-spin" />
          Xác nhận
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
