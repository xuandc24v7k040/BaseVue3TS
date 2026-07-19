<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { ChevronDown, Search } from "@lucide/vue";
import type {
  StaffAssignablePermissionsParams,
  RoleDetailResponseDto,
  StaffAssignableRolesAction,
} from "@/api/generated/models";
import { StaffAssignableRolesAction as AssignableAction } from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import { useBranchStore } from "@/stores/branch.store";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isDangerousPermission } from "@/features/permissions/utils/dangerous-permissions";
import { formatPermissionResource } from "@/features/permissions/utils/permission-labels";
import {
  listAssignableStaffRoles,
  listStaffPermissionCatalog,
} from "../api/staff-api";
import { staffKeys } from "../api/staff-query-keys";
import {
  collectInheritedPermissionIds,
  directPermissionIds as sanitizeDirectPermissionIds,
  groupPermissionsByResource,
} from "../utils/staff-access";

type AccessTab = "roles" | "permissions";

const props = withDefaults(
  defineProps<{
    roleIds: string[];
    permissionIds: string[];
    disabled?: boolean;
    branchIdOverride?: string;
    showPermissions?: boolean;
    catalogAction?: StaffAssignableRolesAction;
    roleError?: string;
    permissionError?: string;
  }>(),
  {
    showPermissions: true,
    catalogAction: AssignableAction.CREATE,
  },
);
const emit = defineEmits<{
  "update:roleIds": [value: string[]];
  "update:permissionIds": [value: string[]];
}>();

const branchStore = useBranchStore();
const { can } = useAdminPermissions();
const activeTab = ref<AccessTab>("roles");
const roleSearch = ref("");
const permissionSearch = ref("");
const roleCache = ref(new Map<string, RoleDetailResponseDto>());
const branchId = computed(
  () => props.branchIdOverride ?? branchStore.selectedBranchId ?? "",
);
const mode = computed(() =>
  props.catalogAction === AssignableAction.ASSIGN ? "assign" : "create",
);
const roleParams = computed(() => ({
  page: 1,
  limit: 100,
  action: props.catalogAction,
  ...(roleSearch.value.trim() ? { search: roleSearch.value.trim() } : {}),
}));
const permissionParams = computed<StaffAssignablePermissionsParams>(() => ({
  page: 1,
  limit: 100,
  ...(permissionSearch.value.trim()
    ? { search: permissionSearch.value.trim() }
    : {}),
}));

const rolesQuery = useQuery({
  queryKey: computed(() =>
    staffKeys.assignableRoles(branchId.value, mode.value, roleParams.value),
  ),
  queryFn: ({ signal }) =>
    listAssignableStaffRoles(roleParams.value, signal, props.branchIdOverride),
  enabled: computed(() => Boolean(branchId.value)),
  staleTime: 60_000,
});
const permissionQuery = useQuery({
  queryKey: computed(() =>
    staffKeys.permissionCatalog(branchId.value, permissionParams.value),
  ),
  queryFn: ({ signal }) =>
    listStaffPermissionCatalog(
      permissionParams.value,
      signal,
      props.branchIdOverride,
    ),
  enabled: computed(
    () =>
      props.showPermissions &&
      Boolean(branchId.value) &&
      can(ADMIN_PERMISSIONS.STAFF_ASSIGN_PERMISSION),
  ),
  staleTime: 60_000,
});

const roles = computed(() => rolesQuery.data.value?.data ?? []);
const selectedRoles = computed(() =>
  props.roleIds.flatMap((id) => {
    const role = roleCache.value.get(id);
    return role ? [role] : [];
  }),
);
const inheritedPermissionIds = computed(() =>
  collectInheritedPermissionIds(selectedRoles.value),
);
const directPermissionIds = computed(() =>
  sanitizeDirectPermissionIds(
    props.permissionIds,
    inheritedPermissionIds.value,
  ),
);
const visiblePermissions = computed(
  () => permissionQuery.data.value?.data ?? [],
);
const permissionGroups = computed(() => {
  return groupPermissionsByResource(visiblePermissions.value);
});

watch(inheritedPermissionIds, (inherited) => {
  const direct = sanitizeDirectPermissionIds(props.permissionIds, inherited);
  if (
    direct.length !== props.permissionIds.length ||
    direct.some((id, index) => id !== props.permissionIds[index])
  ) {
    emit("update:permissionIds", direct);
  }
});
watch(
  () => rolesQuery.data.value?.data,
  (nextRoles) => {
    if (!nextRoles) return;
    const nextCache = new Map(roleCache.value);
    nextRoles.forEach((role) => nextCache.set(role.id, role));
    roleCache.value = nextCache;
  },
  { immediate: true },
);
watch(
  () => [props.roleError, props.permissionError] as const,
  ([roleError, permissionError]) => {
    if (roleError) activeTab.value = "roles";
    else if (permissionError) activeTab.value = "permissions";
  },
);

function toggleRole(id: string, checked: boolean): void {
  emit(
    "update:roleIds",
    checked
      ? [...new Set([...props.roleIds, id])]
      : props.roleIds.filter((value) => value !== id),
  );
}

function togglePermission(id: string, checked: boolean): void {
  emit(
    "update:permissionIds",
    checked
      ? [...new Set([...directPermissionIds.value, id])]
      : directPermissionIds.value.filter((value) => value !== id),
  );
}
</script>

<template>
  <Tabs v-model="activeTab" class="min-w-0">
    <TabsList class="grid w-full grid-cols-2">
      <TabsTrigger value="roles">Vai trò ({{ roleIds.length }})</TabsTrigger>
      <TabsTrigger value="permissions">
        Quyền bổ sung ({{ directPermissionIds.length }})
      </TabsTrigger>
    </TabsList>

    <TabsContent value="roles" class="space-y-3">
      <div class="relative p-1">
        <Search
          class="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground"
        />
        <Input
          v-model="roleSearch"
          class="pl-9"
          placeholder="Tìm vai trò..."
          :disabled="disabled"
        />
      </div>
      <ScrollArea class="h-64 rounded-lg border pr-3">
        <div class="space-y-1 p-2">
          <p
            v-if="rolesQuery.isLoading.value"
            class="p-4 text-sm text-muted-foreground"
          >
            Đang tải vai trò...
          </p>
          <p
            v-else-if="rolesQuery.isError.value"
            class="p-4 text-sm text-destructive"
          >
            Không thể tải danh mục vai trò có thể gán.
          </p>
          <label
            v-for="role in roles"
            v-else
            :key="role.id"
            class="flex cursor-pointer items-start gap-3 rounded-md p-3 hover:bg-muted/60"
          >
            <Checkbox
              :model-value="roleIds.includes(role.id)"
              :disabled="disabled"
              @update:model-value="toggleRole(role.id, $event === true)"
            />
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium">{{ role.name }}</span>
                <Badge variant="outline" class="font-normal">{{
                  role.code
                }}</Badge>
              </span>
              <span
                v-if="role.description"
                class="mt-1 block text-xs text-muted-foreground"
              >
                {{ role.description }}
              </span>
              <span class="mt-1 block text-xs text-muted-foreground">
                {{ role.rolePermissions.length }} quyền kế thừa
              </span>
            </span>
          </label>
          <p
            v-if="!rolesQuery.isLoading.value && !roles.length"
            class="p-6 text-center text-sm text-muted-foreground"
          >
            Không có vai trò phù hợp.
          </p>
        </div>
      </ScrollArea>
      <p v-if="roleError" class="text-sm text-destructive">{{ roleError }}</p>
    </TabsContent>

    <TabsContent value="permissions" class="space-y-3">
      <template
        v-if="showPermissions && can(ADMIN_PERMISSIONS.STAFF_ASSIGN_PERMISSION)"
      >
        <p class="text-sm text-muted-foreground">
          Chỉ chọn quyền cần cộng thêm. Quyền đã có từ vai trò không được gửi
          thành quyền trực tiếp.
        </p>
        <div class="relative p-1">
          <Search
            class="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground"
          />
          <Input
            v-model="permissionSearch"
            class="pl-9"
            placeholder="Tìm quyền hoặc tài nguyên..."
            :disabled="disabled"
          />
        </div>
        <ScrollArea class="h-72 rounded-lg border pr-3">
          <div class="space-y-2 p-2">
            <p
              v-if="permissionQuery.isLoading.value"
              class="p-4 text-sm text-muted-foreground"
            >
              Đang tải quyền...
            </p>
            <p
              v-else-if="permissionQuery.isError.value"
              class="p-4 text-sm text-destructive"
            >
              Không thể tải danh mục quyền.
            </p>
            <Collapsible
              v-for="[resource, permissions] in permissionGroups"
              v-else
              :key="resource"
              :default-open="true"
              class="rounded-md border"
            >
              <CollapsibleTrigger
                class="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  {{ formatPermissionResource(resource) }} ({{
                    permissions.length
                  }})
                </span>
                <ChevronDown
                  class="size-4 transition-transform [[data-state=closed]_&]:-rotate-90"
                />
              </CollapsibleTrigger>
              <CollapsibleContent class="border-t">
                <label
                  v-for="permission in permissions"
                  :key="permission.id"
                  class="flex items-start gap-3 p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    :model-value="
                      permissionIds.includes(permission.id) ||
                      inheritedPermissionIds.has(permission.id)
                    "
                    :disabled="
                      disabled ||
                      inheritedPermissionIds.has(permission.id) ||
                      isDangerousPermission(permission.code)
                    "
                    @update:model-value="
                      togglePermission(permission.id, $event === true)
                    "
                  />
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-2">
                      <span class="text-sm font-medium">{{
                        permission.name
                      }}</span>
                      <Badge
                        v-if="inheritedPermissionIds.has(permission.id)"
                        variant="secondary"
                      >
                        Có từ vai trò
                      </Badge>
                      <Badge
                        v-else-if="isDangerousPermission(permission.code)"
                        variant="outline"
                      >
                        Không thể ủy quyền
                      </Badge>
                    </span>
                    <span class="block text-xs text-muted-foreground">{{
                      permission.code
                    }}</span>
                    <span
                      v-if="permission.description"
                      class="mt-1 block text-xs text-muted-foreground"
                    >
                      {{ permission.description }}
                    </span>
                  </span>
                </label>
              </CollapsibleContent>
            </Collapsible>
            <p
              v-if="
                !permissionQuery.isLoading.value && !permissionGroups.length
              "
              class="p-6 text-center text-sm text-muted-foreground"
            >
              Không có quyền phù hợp.
            </p>
          </div>
        </ScrollArea>
      </template>
      <p
        v-else
        class="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground"
      >
        Quyền bổ sung không áp dụng trong thao tác này.
      </p>
      <p v-if="permissionError" class="text-sm text-destructive">
        {{ permissionError }}
      </p>
    </TabsContent>
  </Tabs>
</template>
