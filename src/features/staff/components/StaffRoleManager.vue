<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { LoaderCircle, Search, Trash2 } from "@lucide/vue";
import { toast } from "vue-sonner";
import type { StaffAssignmentRoleResponseDto } from "@/api/generated/models";
import { StaffAssignableRolesAction } from "@/api/generated/models";
import { useBranchStore } from "@/stores/branch.store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  assignStaffRole,
  listAssignableStaffRoles,
  removeStaffRole,
} from "../api/staff-api";
import { staffKeys } from "../api/staff-query-keys";
import { staffErrorMessage } from "../utils/staff-error-messages";

const props = defineProps<{
  open: boolean;
  staffId: string;
  branchName: string;
  roles: StaffAssignmentRoleResponseDto[];
}>();
const emit = defineEmits<{ "update:open": [boolean]; changed: [] }>();
const branchStore = useBranchStore();
const search = ref("");
const pendingId = ref("");
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const params = computed(() => ({
  page: 1,
  limit: 100,
  action: StaffAssignableRolesAction.ASSIGN,
  ...(search.value.trim() ? { search: search.value.trim() } : {}),
}));
const query = useQuery({
  queryKey: computed(() =>
    staffKeys.assignableRoles(branchId.value, "assign", params.value),
  ),
  queryFn: ({ signal }) => listAssignableStaffRoles(params.value, signal),
  enabled: computed(() => props.open && Boolean(branchId.value)),
  staleTime: 60_000,
});
const assigned = computed(() => new Set(props.roles.map((role) => role.id)));
const available = computed(() =>
  (query.data.value?.data ?? []).filter((role) => !assigned.value.has(role.id)),
);

async function mutate(roleId: string, remove: boolean): Promise<void> {
  if (pendingId.value) return;
  pendingId.value = roleId;
  try {
    if (remove) {
      const result = await removeStaffRole(props.staffId, roleId);
      toast.success(
        result.data.count === 0
          ? "Vai trò không còn được gán; dữ liệu đã được đồng bộ."
          : "Đã gỡ vai trò khỏi phân công.",
      );
    } else {
      await assignStaffRole(props.staffId, roleId);
      toast.success("Đã gán vai trò cho nhân viên.");
    }
    emit("changed");
  } catch (error) {
    toast.error(staffErrorMessage(error));
    emit("changed");
  } finally {
    pendingId.value = "";
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(value) => !pendingId && emit('update:open', value)"
  >
    <DialogContent
      class="grid max-h-[90dvh] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>Quản lý vai trò</DialogTitle>
        <DialogDescription>
          Vai trò chỉ áp dụng tại {{ branchName }}.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea class="min-h-0 px-5 sm:px-6">
        <div class="space-y-5 py-5">
          <section class="space-y-2">
            <h3 class="font-medium">Vai trò đang gán</h3>
            <div class="space-y-2">
              <div
                v-for="role in roles"
                :key="role.id"
                class="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p class="flex flex-wrap items-center gap-2 font-medium">
                    {{ role.name }}
                    <Badge variant="outline">{{ role.code }}</Badge>
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ role.rolePermissions.length }} quyền kế thừa
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  :disabled="Boolean(pendingId)"
                  @click="mutate(role.id, true)"
                >
                  <LoaderCircle
                    v-if="pendingId === role.id"
                    class="mr-2 size-4 animate-spin"
                  />
                  <Trash2 v-else class="mr-2 size-4" />Gỡ
                </Button>
              </div>
              <p
                v-if="!roles.length"
                class="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
              >
                Chưa có vai trò được gán.
              </p>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="font-medium">Vai trò có thể gán</h3>
            <div class="relative p-1">
              <Search
                class="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground"
              />
              <Input v-model="search" class="pl-9" placeholder="Tìm vai trò" />
            </div>
            <p
              v-if="query.isLoading.value"
              class="text-sm text-muted-foreground"
            >
              Đang tải danh mục vai trò...
            </p>
            <p v-else-if="query.isError.value" class="text-sm text-destructive">
              Không thể tải vai trò có thể gán.
            </p>
            <div
              v-for="role in available"
              :key="role.id"
              class="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p class="font-medium">{{ role.name }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ role.code }} · {{ role.rolePermissions.length }} quyền
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                :disabled="Boolean(pendingId)"
                @click="mutate(role.id, false)"
              >
                Gán
              </Button>
            </div>
            <p
              v-if="
                !query.isLoading.value &&
                !query.isError.value &&
                !available.length
              "
              class="py-5 text-center text-sm text-muted-foreground"
            >
              Không còn vai trò phù hợp để gán.
            </p>
          </section>
        </div>
      </ScrollArea>
      <DialogFooter class="border-t px-5 py-4 sm:px-6">
        <Button
          type="button"
          variant="outline"
          :disabled="Boolean(pendingId)"
          @click="emit('update:open', false)"
        >
          Đóng
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
