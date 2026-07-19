<script setup lang="ts">
import axios from "axios";
import { computed, ref, watch } from "vue";
import { refDebounced } from "@vueuse/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCcw,
  Search,
  UserRoundCheck,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  BranchAdminsListParams,
  ErrorResponseDto,
} from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
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
import { assignBranchAdmin, listBranchAdmins } from "../api/branch-admin-api";
import { branchAdminKeys } from "../api/branch-admin-query-keys";
import BranchAdminAssignmentActions from "./BranchAdminAssignmentActions.vue";

const props = defineProps<{
  open: boolean;
  branch: { id: string; code: string; name: string; isActive: boolean };
}>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();
const queryClient = useQueryClient();
const candidateSearch = ref("");
const debouncedSearch = refDebounced(candidateSearch, 400);
const candidatePage = ref(1);
const selectedId = ref<string | null>(null);
const currentParams = computed<BranchAdminsListParams>(() => ({
  page: 1,
  limit: 100,
  assignedBranchId: props.branch.id,
}));
const candidateParams = computed<BranchAdminsListParams>(() => ({
  page: candidatePage.value,
  limit: 10,
  excludeAssignedBranchId: props.branch.id,
  isActive: true,
  ...(debouncedSearch.value.trim()
    ? { search: debouncedSearch.value.trim() }
    : {}),
}));
const currentQuery = useQuery({
  queryKey: computed(() =>
    branchAdminKeys.assignedToBranch(props.branch.id, currentParams.value),
  ),
  queryFn: ({ signal }) => listBranchAdmins(currentParams.value, signal),
  enabled: computed(() => props.open),
});
const candidateQuery = useQuery({
  queryKey: computed(() =>
    branchAdminKeys.candidatesForBranch(props.branch.id, candidateParams.value),
  ),
  queryFn: ({ signal }) => listBranchAdmins(candidateParams.value, signal),
  enabled: computed(() => props.open && props.branch.isActive),
});
const managers = computed(() => currentQuery.data.value?.data ?? []);
const candidates = computed(() => candidateQuery.data.value?.data ?? []);
const candidateMeta = computed(() => candidateQuery.data.value?.meta);
const assignMutation = useMutation({
  mutationFn: ({ id }: { id: string }) =>
    assignBranchAdmin(id, props.branch.id),
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    candidateSearch.value = "";
    candidatePage.value = 1;
    selectedId.value = null;
  },
);

function updateSearch(value: string | number): void {
  candidateSearch.value = String(value);
  candidatePage.value = 1;
  selectedId.value = null;
}

async function refreshSections(id?: string): Promise<void> {
  const tasks = [
    queryClient.invalidateQueries({
      queryKey: [...branchAdminKeys.all, "assigned-to-branch", props.branch.id],
    }),
    queryClient.invalidateQueries({
      queryKey: [
        ...branchAdminKeys.all,
        "candidates-for-branch",
        props.branch.id,
      ],
    }),
    queryClient.invalidateQueries({ queryKey: branchAdminKeys.lists() }),
  ];
  if (id)
    tasks.push(
      queryClient.invalidateQueries({ queryKey: branchAdminKeys.detail(id) }),
    );
  await Promise.all(tasks);
}

async function appoint(): Promise<void> {
  if (
    !selectedId.value ||
    assignMutation.isPending.value ||
    !props.branch.isActive
  )
    return;
  const id = selectedId.value;
  try {
    await assignMutation.mutateAsync({ id });
    selectedId.value = null;
    await refreshSections(id);
    toast.success("Đã bổ nhiệm quản trị viên vào chi nhánh.");
  } catch (error) {
    if (
      axios.isAxiosError<ErrorResponseDto>(error) &&
      error.response?.status === 409
    ) {
      toast.error("Quản trị viên này đã được bổ nhiệm vào chi nhánh.");
      selectedId.value = null;
      await refreshSections(id);
      return;
    }
    toast.error(
      axios.isAxiosError<ErrorResponseDto>(error) &&
        error.response?.status === 403
        ? "Bạn không có quyền bổ nhiệm quản trị viên."
        : "Không thể bổ nhiệm quản trị viên. Vui lòng thử lại.",
    );
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent
      class="grid max-h-[90dvh] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-3xl"
    >
      <DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6"
        ><DialogTitle>Quản lý chi nhánh</DialogTitle
        ><DialogDescription
          >{{ branch.code }} — {{ branch.name }}</DialogDescription
        ></DialogHeader
      >
      <ScrollArea
        class="min-h-0 w-full min-w-0 max-w-full overflow-hidden px-5 sm:px-6"
      >
        <div class="w-full min-w-0 max-w-full space-y-7 px-1 py-5">
          <section class="min-w-0 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="font-semibold">Quản lý hiện tại</h3>
                <p class="text-sm text-muted-foreground">
                  Tất cả phân công Branch Admin, gồm cả trạng thái inactive.
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Tải lại quản lý hiện tại"
                @click="currentQuery.refetch()"
                ><RefreshCcw class="h-4 w-4"
              /></Button>
            </div>
            <div
              v-if="currentQuery.isPending.value"
              class="rounded-lg border p-5 text-sm text-muted-foreground"
            >
              Đang tải quản lý...
            </div>
            <div
              v-else-if="currentQuery.isError.value"
              class="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
            >
              Không thể tải quản lý hiện tại.
              <Button
                type="button"
                variant="link"
                class="h-auto p-0"
                @click="currentQuery.refetch()"
                >Thử lại</Button
              >
            </div>
            <div
              v-else-if="!managers.length"
              class="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground"
            >
              <UserRoundCheck class="mx-auto mb-2 h-7 w-7" />Chưa bổ nhiệm quản
              lý
            </div>
            <div v-else class="grid min-w-0 gap-3 md:grid-cols-2">
              <article
                v-for="manager in managers"
                :key="manager.id"
                class="min-w-0 rounded-lg border p-3"
              >
                <p class="truncate font-medium" :title="manager.fullName">
                  {{ manager.fullName }}
                </p>
                <p
                  class="truncate text-sm text-muted-foreground"
                  :title="manager.email"
                >
                  {{ manager.email }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ manager.phone || "Chưa có số điện thoại" }}
                </p>
                <div class="mt-2 grid min-w-0 gap-1 text-xs">
                  <span class="min-w-0 break-words">{{
                    manager.isActive
                      ? "Tài khoản: Hoạt động"
                      : "Tài khoản: Đã khóa"
                  }}</span
                  ><span
                    class="min-w-0 break-words"
                    v-for="assignment in manager.userBranches.filter(
                      (item) => item.branchId === branch.id,
                    )"
                    :key="assignment.id"
                    >{{
                      assignment.isActive
                        ? "Phân công: Hoạt động"
                        : "Phân công: Ngừng hoạt động"
                    }}
                    ·
                    {{
                      assignment.isPrimary
                        ? "Chi nhánh chính: Có"
                        : "Chi nhánh chính: Không"
                    }}</span
                  >
                </div>
                <div class="mt-2 flex justify-end">
                  <BranchAdminAssignmentActions
                    v-for="assignment in manager.userBranches.filter(
                      (item) => item.branchId === branch.id,
                    )"
                    :key="`action-${assignment.id}`"
                    :admin="manager"
                    :assignment="assignment"
                    @changed="currentQuery.refetch()"
                  />
                </div>
              </article>
            </div>
          </section>

          <PermissionGate
            :all-of="[
              ADMIN_PERMISSIONS.BRANCH_ADMIN_ASSIGN,
              ADMIN_PERMISSIONS.BRANCHES_ASSIGN,
            ]"
          >
            <section class="min-w-0 space-y-3 border-t pt-6">
              <div>
                <h3 class="font-semibold">Bổ nhiệm quản lý</h3>
                <p class="text-sm text-muted-foreground">
                  Tìm Branch Admin đang hoạt động và chưa có mapping với chi
                  nhánh này.
                </p>
              </div>
              <div
                v-if="!branch.isActive"
                class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              >
                Không thể bổ nhiệm quản lý vào chi nhánh đã ngừng hoạt động.
              </div>
              <template v-else>
                <div class="relative">
                  <Search
                    class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                  /><Input
                    :model-value="candidateSearch"
                    class="min-w-0 pl-9"
                    placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
                    @update:model-value="updateSearch"
                  />
                </div>
                <div
                  v-if="candidateQuery.isPending.value"
                  class="rounded-lg border p-5 text-sm text-muted-foreground"
                >
                  Đang tìm quản trị viên...
                </div>
                <div
                  v-else-if="candidateQuery.isError.value"
                  class="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
                >
                  Không thể tải danh sách ứng viên.
                  <Button
                    type="button"
                    variant="link"
                    class="h-auto p-0"
                    @click="candidateQuery.refetch()"
                    >Thử lại</Button
                  >
                </div>
                <div
                  v-else-if="!candidates.length"
                  class="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground"
                >
                  Không tìm thấy quản trị viên phù hợp.
                </div>
                <ScrollArea v-else class="h-64">
                  <div class="space-y-2 pr-3">
                    <button
                      v-for="candidate in candidates"
                      :key="candidate.id"
                      type="button"
                      class="flex w-full min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                      :class="
                        selectedId === candidate.id
                          ? 'border-primary bg-primary/5'
                          : ''
                      "
                      :aria-pressed="selectedId === candidate.id"
                      @click="selectedId = candidate.id"
                    >
                      <span
                        class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted font-semibold"
                        >{{
                          candidate.fullName.slice(0, 1).toUpperCase()
                        }}</span
                      ><span class="min-w-0 flex-1"
                        ><span class="block truncate font-medium">{{
                          candidate.fullName
                        }}</span
                        ><span
                          class="block truncate text-sm text-muted-foreground"
                          >{{ candidate.email }} ·
                          {{ candidate.phone || "Chưa có SĐT" }}</span
                        ></span
                      ><span class="text-xs text-muted-foreground"
                        >{{ candidate.userBranches.length }} phân công</span
                      >
                    </button>
                  </div>
                </ScrollArea>
                <div
                  v-if="candidateMeta && candidateMeta.lastPage > 1"
                  class="flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span
                    >Trang {{ candidateMeta.page }}/{{
                      candidateMeta.lastPage
                    }}</span
                  >
                  <div class="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      class="h-8 w-8"
                      :disabled="!candidateMeta.hasPreviousPage"
                      aria-label="Trang ứng viên trước"
                      @click="candidatePage -= 1"
                      ><ChevronLeft class="h-4 w-4" /></Button
                    ><Button
                      type="button"
                      size="icon"
                      variant="outline"
                      class="h-8 w-8"
                      :disabled="!candidateMeta.hasNextPage"
                      aria-label="Trang ứng viên sau"
                      @click="candidatePage += 1"
                      ><ChevronRight class="h-4 w-4"
                    /></Button>
                  </div>
                </div>
              </template>
            </section>
          </PermissionGate>
        </div>
      </ScrollArea>
      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6"
        ><Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
          >Đóng</Button
        ><PermissionGate
          :all-of="[
            ADMIN_PERMISSIONS.BRANCH_ADMIN_ASSIGN,
            ADMIN_PERMISSIONS.BRANCHES_ASSIGN,
          ]"
          ><Button
            type="button"
            :disabled="
              !selectedId || !branch.isActive || assignMutation.isPending.value
            "
            @click="appoint"
            ><LoaderCircle
              v-if="assignMutation.isPending.value"
              class="mr-2 h-4 w-4 animate-spin"
            />Bổ nhiệm</Button
          ></PermissionGate
        ></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
