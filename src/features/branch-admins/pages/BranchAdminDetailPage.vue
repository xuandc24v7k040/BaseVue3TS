<script setup lang="ts">
import axios from "axios";
import { computed } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  Building2,
  LoaderCircle,
  RefreshCcw,
  UserRoundCog,
} from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import type { ErrorResponseDto } from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activateBranchAdminAccount,
  getBranchAdmin,
} from "../api/branch-admin-api";
import { branchAdminKeys } from "../api/branch-admin-query-keys";
import { formatBranchAdminDate } from "../components/branch-admin-columns";
import BranchAdminAssignmentActions from "../components/BranchAdminAssignmentActions.vue";
import { isBranchAdminAssignment } from "../types";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { can } = useAdminPermissions();
const id = computed(() => String(route.params.id ?? ""));
const query = useQuery({
  queryKey: computed(() => branchAdminKeys.detail(id.value)),
  queryFn: ({ signal }) => getBranchAdmin(id.value, signal),
  enabled: computed(() => Boolean(id.value)),
});
const admin = computed(() => query.data.value?.data);
const adminAssignments = computed(
  () => admin.value?.userBranches.filter(isBranchAdminAssignment) ?? [],
);
const otherAssignments = computed(
  () =>
    admin.value?.userBranches.filter(
      (assignment) => !isBranchAdminAssignment(assignment),
    ) ?? [],
);
const status = computed(() =>
  axios.isAxiosError<ErrorResponseDto>(query.error.value)
    ? query.error.value.response?.status
    : undefined,
);
const canActivateAccount = computed(() => can(ADMIN_PERMISSIONS.USERS_UPDATE));
const activationEligible = computed(() => {
  const eligibleAssignments =
    adminAssignments.value.filter(
      (item) => item.isActive && item.branch.isActive,
    );
  return (
    eligibleAssignments.length > 0 &&
    eligibleAssignments.filter((item) => item.isPrimary).length === 1
  );
});
const activateMutation = useMutation({
  mutationFn: () => activateBranchAdminAccount(id.value),
});

async function activateAccount(): Promise<void> {
  if (!activationEligible.value || activateMutation.isPending.value) return;
  try {
    await activateMutation.mutateAsync();
    await queryClient.invalidateQueries({ queryKey: branchAdminKeys.all });
    toast.success(
      "Đã kích hoạt lại tài khoản. Quản trị viên cần đăng nhập lại.",
    );
  } catch (error) {
    const code = axios.isAxiosError<ErrorResponseDto>(error)
      ? error.response?.data.code
      : undefined;
    toast.error(
      code === "USER_ACTIVATION_REQUIRES_ACTIVE_BRANCH"
        ? "Không thể kích hoạt tài khoản. Quản trị viên cần có ít nhất một phân công đang hoạt động tại chi nhánh đang hoạt động và có đúng một chi nhánh chính."
        : "Không thể kích hoạt lại tài khoản. Vui lòng kiểm tra phân công và thử lại.",
    );
  }
}
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý nhân sự"
      :group-to="{ name: 'super-admin-branch-admins' }"
      section-label="Quản trị viên chi nhánh"
      :section-to="{ name: 'super-admin-branch-admins' }"
      :current-label="admin?.fullName"
      :loading="query.isPending.value"
    />
    <div v-if="query.isPending.value" class="space-y-4">
      <Skeleton class="h-10 w-72" /><Skeleton class="h-44 w-full" /><Skeleton
        class="h-56 w-full"
      />
    </div>
    <div
      v-else-if="query.isError.value"
      class="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <UserRoundCog class="mx-auto h-9 w-9 text-muted-foreground" />
      <h1 class="mt-3 text-xl font-semibold">
        {{
          status === 404
            ? "Không tìm thấy quản trị viên"
            : status === 403
              ? "Bạn không có quyền xem quản trị viên này"
              : "Không thể tải thông tin quản trị viên"
        }}
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">
        {{
          status === 404
            ? "Tài khoản có thể không tồn tại hoặc không phải Branch Admin."
            : "Vui lòng thử lại hoặc quay về danh sách."
        }}
      </p>
      <div class="mt-4 flex justify-center gap-2">
        <Button
          v-if="status !== 404 && status !== 403"
          type="button"
          variant="outline"
          @click="query.refetch()"
          ><RefreshCcw class="mr-2 h-4 w-4" />Thử lại</Button
        ><Button
          type="button"
          @click="router.push({ name: 'super-admin-branch-admins' })"
          >Về danh sách</Button
        >
      </div>
    </div>
    <template v-else-if="admin">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="break-words text-2xl font-semibold sm:text-3xl">
              {{ admin.fullName }}
            </h1>
            <span
              :class="admin.isActive ? 'text-emerald-700' : 'text-destructive'"
              >{{ admin.isActive ? "● Đang hoạt động" : "● Đã khóa" }}</span
            >
          </div>
          <p class="mt-1 break-all text-sm text-muted-foreground">
            {{ admin.email }}
          </p>
        </div>
      </div>
      <div
        v-if="!admin.isActive"
        class="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>
          {{
            activationEligible
              ? "Tài khoản đã khóa nhưng hiện đủ điều kiện kích hoạt lại. Sau khi kích hoạt, quản trị viên phải đăng nhập lại."
              : "Để kích hoạt tài khoản, cần ít nhất một phân công đang hoạt động tại chi nhánh đang hoạt động và đúng một chi nhánh chính đang hoạt động."
          }}
        </p>
        <Button
          v-if="canActivateAccount"
          type="button"
          class="shrink-0"
          :disabled="!activationEligible || activateMutation.isPending.value"
          @click="activateAccount"
        >
          <LoaderCircle
            v-if="activateMutation.isPending.value"
            class="mr-2 h-4 w-4 animate-spin"
          />
          Kích hoạt tài khoản
        </Button>
      </div>
      <Card
        ><CardHeader><CardTitle>Thông tin tài khoản</CardTitle></CardHeader
        ><CardContent class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          ><div>
            <p class="text-sm text-muted-foreground">Họ và tên</p>
            <p class="font-medium">{{ admin.fullName }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Email</p>
            <p class="break-all">{{ admin.email }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Số điện thoại</p>
            <p>{{ admin.phone || "Chưa cập nhật" }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Loại tài khoản</p>
            <p>{{ admin.type }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Ngày tạo</p>
            <p>{{ formatBranchAdminDate(admin.createdAt) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Cập nhật</p>
            <p>{{ formatBranchAdminDate(admin.updatedAt) }}</p>
          </div></CardContent
        ></Card
      >
      <Card
        ><CardHeader
          ><CardTitle class="flex items-center gap-2"
            ><Building2 class="h-5 w-5" />Phân công quản trị chi nhánh ({{
              adminAssignments.length
            }})</CardTitle
          ></CardHeader
        ><CardContent
          ><div
            v-if="!adminAssignments.length"
            class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
          >
            Chưa được bổ nhiệm quản trị chi nhánh.
          </div>
          <div v-else class="grid gap-4 lg:grid-cols-2">
            <article
              v-for="assignment in adminAssignments"
              :key="assignment.id"
              class="min-w-0 rounded-lg border p-4"
            >
              <div
                class="flex min-w-0 flex-wrap items-start justify-between gap-2"
              >
                <div class="min-w-0">
                  <p
                    class="truncate font-semibold"
                    :title="assignment.branch.name"
                  >
                    {{ assignment.branch.name }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-1">
                  <span
                    :class="
                      assignment.branch.isActive
                        ? 'text-emerald-700'
                        : 'text-destructive'
                    "
                    >{{
                      assignment.branch.isActive
                        ? "Chi nhánh hoạt động"
                        : "Chi nhánh ngừng hoạt động"
                    }}</span
                  >
                  <BranchAdminAssignmentActions
                    :admin="admin"
                    :assignment="assignment"
                    @changed="query.refetch()"
                  />
                </div>
              </div>
              <dl
                class="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm"
              >
                <dt class="text-muted-foreground">Tài khoản</dt>
                <dd>{{ admin.isActive ? "Đang hoạt động" : "Đã khóa" }}</dd>
                <dt class="text-muted-foreground">Phân công</dt>
                <dd>
                  {{
                    assignment.isActive ? "Đang hoạt động" : "Ngừng hoạt động"
                  }}
                </dd>
                <dt class="text-muted-foreground">Chi nhánh chính</dt>
                <dd>{{ assignment.isPrimary ? "Có" : "Không" }}</dd>
                <dt class="text-muted-foreground">Vai trò</dt>
                <dd class="break-words">
                  {{
                    assignment.roles.map((item) => item.role.name).join(", ") ||
                    "Chưa có"
                  }}
                </dd>
              </dl>
            </article>
          </div></CardContent
        ></Card
      >
      <Card
        ><CardHeader
          ><CardTitle class="flex items-center gap-2"
            ><Building2 class="h-5 w-5" />Các phân công khác ({{
              otherAssignments.length
            }})</CardTitle
          ></CardHeader
        ><CardContent
          ><div
            v-if="!otherAssignments.length"
            class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
          >
            Không có phân công nhân viên khác.
          </div>
          <div v-else class="grid gap-4 lg:grid-cols-2">
            <article
              v-for="assignment in otherAssignments"
              :key="assignment.id"
              class="min-w-0 rounded-lg border p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <p class="truncate font-semibold" :title="assignment.branch.name">
                  {{ assignment.branch.name }}
                </p>
                <span
                  :class="assignment.isActive ? 'text-emerald-700' : 'text-muted-foreground'"
                >
                  {{ assignment.isActive ? "Đang hoạt động" : "Ngừng hoạt động" }}
                </span>
              </div>
              <dl
                class="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm"
              >
                <dt class="text-muted-foreground">Chi nhánh chính</dt>
                <dd>{{ assignment.isPrimary ? "Có" : "Không" }}</dd>
                <dt class="text-muted-foreground">Vai trò</dt>
                <dd class="break-words">
                  {{
                    assignment.roles.map((item) => item.role.name).join(", ") ||
                    "Chưa có"
                  }}
                </dd>
                <dt class="text-muted-foreground">Quyền trực tiếp</dt>
                <dd>{{ assignment.permissions.length }}</dd>
              </dl>
              <p class="mt-3 text-xs text-muted-foreground">
                Chỉ đọc tại màn Quản trị viên chi nhánh.
              </p>
            </article>
          </div></CardContent
        ></Card
      >
    </template>
  </section>
</template>
