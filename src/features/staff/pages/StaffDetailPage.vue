<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  ArrowLeft,
  Building2,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPermissionState } from "@/features/permissions/utils/permission-labels";
import {
  activateStaffAccount,
  getStaff,
  getStaffGlobalAssignments,
} from "../api/staff-api";
import { staffKeys } from "../api/staff-query-keys";
import StaffAssignmentActions from "../components/StaffAssignmentActions.vue";
import StaffAssignmentDialogs from "../components/StaffAssignmentDialogs.vue";
import StaffRoleManager from "../components/StaffRoleManager.vue";
import StaffPermissionManager from "../components/StaffPermissionManager.vue";
import { formatStaffDate } from "../components/staff-columns";
import { staffErrorMessage } from "../utils/staff-error-messages";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const queryClient = useQueryClient();
const { can } = useAdminPermissions();
const roleManagerOpen = ref(false);
const permissionManagerOpen = ref(false);
const activatingAccount = ref(false);
const staffId = computed(() => String(route.params.id ?? ""));
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const isBranchAdminRoute = computed(() =>
  String(route.name).startsWith("branch-admin"),
);
const listRouteName = computed(() =>
  isBranchAdminRoute.value ? "branch-admin-staff" : "super-admin-staff",
);
const detailQuery = useQuery({
  queryKey: computed(() => staffKeys.detail(branchId.value, staffId.value)),
  queryFn: ({ signal }) => getStaff(staffId.value, signal),
  enabled: computed(() => Boolean(branchId.value && staffId.value)),
});
const globalQuery = useQuery({
  queryKey: computed(() => staffKeys.globalAssignments(staffId.value)),
  queryFn: ({ signal }) => getStaffGlobalAssignments(staffId.value, signal),
  enabled: computed(
    () => authStore.user?.isSuperAdmin === true && Boolean(staffId.value),
  ),
});
const staff = computed(() => detailQuery.data.value?.data);
const inheritedPermissionSources = computed(() => {
  const sources = new Map<
    string,
    {
      permission: {
        id: string;
        code: string;
        name: string;
      };
      roles: string[];
    }
  >();
  staff.value?.assignment.roles.forEach((role) => {
    role.rolePermissions.forEach(({ permission }) => {
      const current = sources.get(permission.id) ?? {
        permission,
        roles: [],
      };
      current.roles.push(role.name);
      sources.set(permission.id, current);
    });
  });
  return sources;
});
const directAllowCount = computed(
  () =>
    staff.value?.assignment.permissions.filter(
      (permission) => permission.effect === "ALLOW",
    ).length ?? 0,
);
const directDenyCount = computed(
  () =>
    staff.value?.assignment.permissions.filter(
      (permission) => permission.effect === "DENY",
    ).length ?? 0,
);
const effectivePermissions = computed(() => {
  const rows = new Map<
    string,
    {
      id: string;
      name: string;
      code: string;
      roleSources: string[];
      directEffect?: "ALLOW" | "DENY";
      effective: "ALLOW" | "DENY";
    }
  >();
  inheritedPermissionSources.value.forEach(({ permission, roles }) => {
    rows.set(permission.id, {
      id: permission.id,
      name: permission.name,
      code: permission.code,
      roleSources: roles,
      effective: "ALLOW",
    });
  });
  staff.value?.assignment.permissions.forEach((override) => {
    const inherited = rows.get(override.permission.id);
    rows.set(override.permission.id, {
      id: override.permission.id,
      name: override.permission.name,
      code: override.permission.code,
      roleSources: inherited?.roleSources ?? [],
      directEffect: override.effect,
      effective: override.effect,
    });
  });
  return [...rows.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "vi"),
  );
});
const assignments = computed(
  () => globalQuery.data.value?.data.assignments ?? [],
);
const activationEligible = computed(() => {
  const active = assignments.value.filter(
    (item) => item.isActive && item.branch.isActive,
  );
  return (
    active.length > 0 && active.filter((item) => item.isPrimary).length === 1
  );
});
async function refreshStaff(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: staffKeys.details(branchId.value),
    }),
    queryClient.invalidateQueries({
      queryKey: staffKeys.lists(branchId.value),
    }),
    queryClient.invalidateQueries({
      queryKey: staffKeys.globalAssignments(staffId.value),
    }),
  ]);
}
async function activateAccount(): Promise<void> {
  if (activatingAccount.value || !activationEligible.value) return;
  activatingAccount.value = true;
  try {
    await activateStaffAccount(staffId.value);
    toast.success("Đã kích hoạt tài khoản. Nhân viên cần đăng nhập lại.");
    await refreshStaff();
  } catch (error) {
    toast.error(staffErrorMessage(error));
    await refreshStaff();
  } finally {
    activatingAccount.value = false;
  }
}
</script>

<template>
  <section class="space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý nhân sự"
      :group-to="{ name: listRouteName }"
      section-label="Nhân viên chi nhánh"
      :section-to="{ name: listRouteName }"
      :current-label="staff?.fullName || staff?.email"
      :loading="detailQuery.isLoading.value"
    />
    <Button
      type="button"
      variant="ghost"
      class="-ml-3"
      @click="router.push({ name: listRouteName })"
      ><ArrowLeft class="mr-2 size-4" />Quay lại danh sách</Button
    >

    <div v-if="detailQuery.isLoading.value" class="space-y-4">
      <Skeleton class="h-24 w-full" />
      <div class="grid gap-4 lg:grid-cols-2">
        <Skeleton class="h-52" /><Skeleton class="h-52" />
      </div>
    </div>
    <div
      v-else-if="detailQuery.isError.value"
      class="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <p class="font-medium text-destructive">
        Không thể tải nhân viên trong chi nhánh đang chọn.
      </p>
      <p class="mt-1 text-sm text-muted-foreground">
        Nhân viên có thể không còn thuộc phạm vi này hoặc bạn không có quyền
        truy cập.
      </p>
      <Button
        type="button"
        variant="outline"
        class="mt-4"
        @click="detailQuery.refetch()"
        ><RefreshCcw class="mr-2 size-4" />Thử lại</Button
      >
    </div>
    <template v-else-if="staff">
      <header
        class="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-3">
            <span
              class="flex size-11 items-center justify-center rounded-xl bg-muted"
              ><UserRound class="size-5"
            /></span>
            <div class="min-w-0">
              <h1 class="truncate text-2xl font-semibold">
                {{ staff.fullName || "Chưa cập nhật họ tên" }}
              </h1>
              <p class="truncate text-sm text-muted-foreground">
                {{ staff.email }}
              </p>
            </div>
          </div>
          <p class="mt-3 text-sm text-muted-foreground">
            Phân công tại {{ staff.assignment.branch.name }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge :variant="staff.isActive ? 'default' : 'destructive'">{{
            staff.isActive ? "Tài khoản hoạt động" : "Tài khoản đã khóa"
          }}</Badge
          ><Badge
            :variant="staff.assignment.isActive ? 'secondary' : 'outline'"
            >{{
              staff.assignment.isActive
                ? "Phân công hoạt động"
                : "Phân công ngừng"
            }}</Badge
          ><Badge v-if="staff.assignment.isPrimary" variant="outline"
            >Chi nhánh chính</Badge
          >
        </div>
      </header>

      <div
        v-if="authStore.user?.isSuperAdmin && !staff.isActive"
        class="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="font-medium">Tài khoản nhân viên đang bị khóa</p>
          <p class="text-sm">
            {{
              activationEligible
                ? "Graph phân công đã hợp lệ để kích hoạt."
                : "Cần ít nhất một phân công active tại branch active và đúng một primary."
            }}
          </p>
        </div>
        <Button
          v-if="can(ADMIN_PERMISSIONS.USERS_UPDATE)"
          type="button"
          :disabled="!activationEligible || activatingAccount"
          @click="activateAccount"
        >
          <RefreshCcw
            :class="['mr-2 size-4', activatingAccount ? 'animate-spin' : '']"
          />Kích hoạt tài khoản
        </Button>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <Card
          ><CardHeader
            ><CardTitle>Thông tin cá nhân</CardTitle
            ><CardDescription
              >Dữ liệu tài khoản được phép hiển thị.</CardDescription
            ></CardHeader
          ><CardContent class="grid gap-4 text-sm sm:grid-cols-2"
            ><div>
              <p class="text-muted-foreground">Họ tên</p>
              <p class="font-medium">{{ staff.fullName || "Chưa cập nhật" }}</p>
            </div>
            <div>
              <p class="text-muted-foreground">Email</p>
              <p class="break-all font-medium">{{ staff.email }}</p>
            </div>
            <div>
              <p class="text-muted-foreground">Số điện thoại</p>
              <p class="font-medium">{{ staff.phone || "Chưa cập nhật" }}</p>
            </div>
            <div>
              <p class="text-muted-foreground">Trạng thái tài khoản</p>
              <p class="font-medium">
                {{ staff.isActive ? "Hoạt động" : "Đã khóa" }}
              </p>
            </div></CardContent
          ></Card
        >
        <Card>
          <CardHeader>
            <CardTitle>Thông tin phân công</CardTitle>
            <CardDescription
              >Trạng thái tại chi nhánh đang chọn.</CardDescription
            >
          </CardHeader>
          <CardContent class="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p class="text-muted-foreground">Chi nhánh</p>
              <p class="font-medium">{{ staff.assignment.branch.name }}</p>
            </div>
            <div>
              <p class="text-muted-foreground">Phân công</p>
              <p class="font-medium">
                {{
                  staff.assignment.isActive ? "Hoạt động" : "Ngừng hoạt động"
                }}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground">Loại chi nhánh</p>
              <p class="font-medium">
                {{
                  staff.assignment.isPrimary
                    ? "Chi nhánh chính"
                    : "Chi nhánh phụ"
                }}
              </p>
            </div>
            <div>
              <p class="text-muted-foreground">Ngày phân công</p>
              <p class="font-medium">
                {{ formatStaffDate(staff.assignment.assignedAt) }}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <ShieldCheck class="size-5" />Quyền truy cập tại
              {{ staff.assignment.branch.name }}
            </CardTitle>
            <CardDescription>
              Vai trò, quyền kế thừa và quyền cấp trực tiếp trong cùng một ngữ cảnh chi
              nhánh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs default-value="roles">
              <TabsList class="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="roles">
                  Vai trò ({{ staff.assignment.roles.length }})
                </TabsTrigger>
                <TabsTrigger value="permissions">
                  Quyền hạn ({{ effectivePermissions.length }})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="roles" class="space-y-4">
                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 class="font-medium">Vai trò được gán</h3>
                    <p class="text-sm text-muted-foreground">
                      Nguồn trực tiếp từ phân công hiện tại.
                    </p>
                  </div>
                  <Button
                    v-if="
                      can(ADMIN_PERMISSIONS.STAFF_ASSIGN_ROLE) &&
                      staff.assignment.isActive
                    "
                    type="button"
                    size="sm"
                    variant="outline"
                    @click="roleManagerOpen = true"
                  >
                    Chỉnh sửa
                  </Button>
                </div>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <article
                    v-for="role in staff.assignment.roles"
                    :key="role.id"
                    class="rounded-lg border p-4"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <h4 class="font-medium">{{ role.name }}</h4>
                      <Badge variant="outline">{{ role.code }}</Badge>
                    </div>
                    <p class="mt-2 text-sm text-muted-foreground">
                      {{ role.rolePermissions.length }} quyền kế thừa ·
                      {{ role.isActive ? "Đang hoạt động" : "Đã ngừng" }}
                    </p>
                  </article>
                </div>
                <p
                  v-if="!staff.assignment.roles.length"
                  class="rounded-md border border-dashed p-5 text-sm text-muted-foreground"
                >
                  Chưa có vai trò được gán.
                </p>
              </TabsContent>
              <TabsContent value="permissions" class="space-y-4">
                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 class="font-medium">Quyền hiệu lực</h3>
                    <p class="text-sm text-muted-foreground">
                      Kết quả sau khi áp dụng quyền kế thừa và quyền cấp trực tiếp.
                    </p>
                  </div>
                  <Button
                    v-if="
                      can(ADMIN_PERMISSIONS.STAFF_ASSIGN_PERMISSION) &&
                      staff.assignment.isActive
                    "
                    type="button"
                    size="sm"
                    variant="outline"
                    @click="permissionManagerOpen = true"
                  >
                    Chỉnh sửa
                  </Button>
                </div>
                <div class="grid gap-2 text-sm sm:grid-cols-3">
                  <div class="rounded-md bg-muted/50 p-3">
                    Kế thừa:
                    <strong>{{ inheritedPermissionSources.size }}</strong>
                  </div>
                  <div class="rounded-md bg-muted/50 p-3">
                    Cấp trực tiếp: <strong>{{ directAllowCount }}</strong>
                  </div>
                  <div class="rounded-md bg-muted/50 p-3">
                    Từ chối trực tiếp: <strong>{{ directDenyCount }}</strong>
                  </div>
                </div>
                <div class="space-y-2">
                  <article
                    v-for="permission in effectivePermissions"
                    :key="permission.id"
                    class="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div class="min-w-0">
                      <p class="font-medium">{{ permission.name }}</p>
                      <p class="break-all text-xs text-muted-foreground">
                        {{ permission.code }}
                      </p>
                      <p class="mt-1 text-xs text-muted-foreground">
                        Nguồn:
                        {{
                          permission.directEffect
                            ? "Cấp trực tiếp"
                            : permission.roleSources.length
                              ? `Vai trò ${permission.roleSources.join(", ")}`
                              : "Không có"
                        }}
                      </p>
                    </div>
                    <Badge
                      :variant="
                        permission.effective === 'ALLOW'
                          ? 'default'
                          : 'destructive'
                      "
                    >
                      {{ formatPermissionState(permission.effective) }}
                    </Badge>
                  </article>
                </div>
                <p
                  v-if="!effectivePermissions.length"
                  class="rounded-md border border-dashed p-5 text-sm text-muted-foreground"
                >
                  Không có quyền trực tiếp. Quyền hiện tại được kế thừa từ vai
                  trò.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card v-if="authStore.user?.isSuperAdmin"
        ><CardHeader
          ><CardTitle class="flex items-center gap-2"
            ><Building2 class="size-5" />Tất cả chi nhánh</CardTitle
          ><CardDescription
            >Quản lý vòng đời phân công trên tất cả chi nhánh dành cho Quản trị hệ
            thống.</CardDescription
          ><StaffAssignmentDialogs
            v-if="globalQuery.data.value"
            :staff-id="staffId"
            :current-branch-id="branchId"
            :assignments="assignments"
            @changed="refreshStaff" /></CardHeader
        ><CardContent
          ><div v-if="globalQuery.isLoading.value" class="space-y-2">
            <Skeleton class="h-16" /><Skeleton class="h-16" />
          </div>
          <div
            v-else-if="globalQuery.isError.value"
            class="text-sm text-destructive"
          >
            Không thể tải toàn bộ phân công.
            <Button type="button" variant="link" @click="globalQuery.refetch()"
              >Thử lại</Button
            >
          </div>
          <div v-else class="space-y-3">
            <article
              v-for="assignment in globalQuery.data.value?.data.assignments ??
              []"
              :key="assignment.id"
              class="rounded-lg border p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 class="font-medium">{{ assignment.branch.name }}</h3>
                  <p class="text-xs text-muted-foreground">
                    {{
                      assignment.isActive
                        ? "Phân công hoạt động"
                        : "Phân công ngừng"
                    }}<template v-if="assignment.isPrimary">
                      · Chi nhánh chính</template
                    >
                  </p>
                </div>
                <div class="flex items-center gap-1">
                  <Badge
                    :variant="
                      assignment.branch.isActive ? 'secondary' : 'outline'
                    "
                    >{{
                      assignment.branch.isActive
                        ? "Chi nhánh hoạt động"
                        : "Chi nhánh ngừng"
                    }}</Badge
                  ><StaffAssignmentActions
                    v-if="can(ADMIN_PERMISSIONS.STAFF_ASSIGN_BRANCH)"
                    :staff-id="staffId"
                    :assignment="assignment"
                    :assignments="assignments"
                    @changed="refreshStaff"
                  />
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-1">
                <Badge
                  v-for="role in assignment.roles"
                  :key="role.id"
                  variant="secondary"
                  >{{ role.role.name }}</Badge
                >
              </div>
              <div
                v-if="assignment.permissions.length"
                class="mt-3 flex flex-wrap gap-1"
              >
                <Badge
                  v-for="permission in assignment.permissions"
                  :key="permission.id"
                  :variant="
                    permission.effect === 'ALLOW' ? 'default' : 'destructive'
                  "
                  >{{ permission.permission.name }} ·
                  {{ formatPermissionState(permission.effect) }}</Badge
                >
              </div>
            </article>
          </div></CardContent
        ></Card
      >
      <StaffRoleManager
        v-if="staff"
        v-model:open="roleManagerOpen"
        :staff-id="staffId"
        :branch-name="staff.assignment.branch.name"
        :roles="staff.assignment.roles"
        @changed="refreshStaff"
      />
      <StaffPermissionManager
        v-if="staff"
        v-model:open="permissionManagerOpen"
        :staff-id="staffId"
        :branch-name="staff.assignment.branch.name"
        :roles="staff.assignment.roles"
        :overrides="staff.assignment.permissions"
        @changed="refreshStaff"
      />
    </template>
  </section>
</template>
