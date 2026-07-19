<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { ChevronDown, LoaderCircle, Search } from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  StaffAssignmentPermissionMappingResponseDto,
  StaffAssignmentRoleResponseDto,
  UpsertUserPermissionDtoEffect,
} from "@/api/generated/models";
import { useBranchStore } from "@/stores/branch.store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isDangerousPermission } from "@/features/permissions/utils/dangerous-permissions";
import {
  formatPermissionResource,
  formatPermissionState,
} from "@/features/permissions/utils/permission-labels";
import {
  listStaffPermissionCatalog,
  removeStaffPermission,
  upsertStaffPermission,
} from "../api/staff-api";
import { staffKeys } from "../api/staff-query-keys";
import { staffErrorMessage } from "../utils/staff-error-messages";

type State = "INHERIT" | UpsertUserPermissionDtoEffect;
type Status = "ALL" | State;

const props = defineProps<{
  open: boolean;
  staffId: string;
  branchName: string;
  roles: StaffAssignmentRoleResponseDto[];
  overrides: StaffAssignmentPermissionMappingResponseDto[];
}>();
const emit = defineEmits<{ "update:open": [boolean]; changed: [] }>();
const branchStore = useBranchStore();
const search = ref("");
const status = ref<Status>("ALL");
const pendingId = ref("");
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const query = useQuery({
  queryKey: computed(() =>
    staffKeys.permissionCatalog(branchId.value, {
      page: 1,
      limit: 100,
    }),
  ),
  queryFn: ({ signal }) =>
    listStaffPermissionCatalog({ page: 1, limit: 100 }, signal),
  enabled: computed(() => props.open && Boolean(branchId.value)),
});
const overrideMap = computed(
  () =>
    new Map(props.overrides.map((item) => [item.permission.id, item.effect])),
);
const inheritedMap = computed(() => {
  const map = new Map<string, string[]>();
  props.roles.forEach((role) => {
    role.rolePermissions.forEach((grant) => {
      map.set(grant.permission.id, [
        ...(map.get(grant.permission.id) ?? []),
        role.name,
      ]);
    });
  });
  return map;
});
const rows = computed(() =>
  (query.data.value?.data ?? []).filter((permission) => {
    const state = overrideMap.value.get(permission.id) ?? "INHERIT";
    const needle = search.value.trim().toLocaleLowerCase("vi");
    return (
      (status.value === "ALL" || status.value === state) &&
      (!needle ||
        `${permission.name} ${permission.code} ${permission.resource} ${permission.description ?? ""}`
          .toLocaleLowerCase("vi")
          .includes(needle))
    );
  }),
);
const groups = computed(() => {
  const grouped = new Map<string, typeof rows.value>();
  rows.value.forEach((permission) => {
    const current = grouped.get(permission.resource) ?? [];
    current.push(permission);
    grouped.set(permission.resource, current);
  });
  return [...grouped.entries()];
});

function stateOf(id: string): State {
  return overrideMap.value.get(id) ?? "INHERIT";
}

function effective(id: string): string {
  const direct = overrideMap.value.get(id);
  if (direct === "DENY") return "Bị từ chối trực tiếp";
  if (direct === "ALLOW") {
    return inheritedMap.value.has(id)
      ? "Được cấp trực tiếp và kế thừa"
      : "Được cấp bổ sung";
  }
  return inheritedMap.value.has(id) ? "Được kế thừa" : "Không có quyền";
}

function permissionSource(id: string): string {
  if (overrideMap.value.has(id)) return "Nguồn: Cấp trực tiếp";
  const roles = inheritedMap.value.get(id);
  return roles?.length
    ? `Nguồn: Vai trò ${roles.join(", ")}`
    : "Nguồn: Không có";
}

async function setState(permissionId: string, next: State): Promise<void> {
  if (pendingId.value || stateOf(permissionId) === next) return;
  pendingId.value = permissionId;
  try {
    if (next === "INHERIT") {
      await removeStaffPermission(props.staffId, permissionId);
    } else {
      await upsertStaffPermission(props.staffId, permissionId, {
        effect: next,
      });
    }
    toast.success(
      next === "INHERIT"
        ? "Đã đưa quyền về trạng thái kế thừa."
        : `Đã đặt quyền trực tiếp: ${formatPermissionState(next)}.`,
    );
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
      class="grid max-h-[92dvh] w-[calc(100vw-1.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-4xl"
    >
      <DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>Quản lý quyền hạn</DialogTitle>
        <DialogDescription>
          Kế thừa / Cho phép / Từ chối chỉ áp dụng tại {{ branchName }}.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea class="min-h-0 px-4 sm:px-6">
        <div class="space-y-4 py-5">
          <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <div class="relative p-1">
              <Search
                class="pointer-events-none absolute left-4 top-3.5 size-4 text-muted-foreground"
              />
              <Input
                v-model="search"
                class="pl-9"
                placeholder="Tìm quyền hoặc tài nguyên"
              />
            </div>
            <Select
              :model-value="status"
              @update:model-value="status = ($event ?? 'ALL') as Status"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Mọi trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Mọi trạng thái</SelectItem>
                <SelectItem value="INHERIT">Kế thừa</SelectItem>
                <SelectItem value="ALLOW">Cho phép</SelectItem>
                <SelectItem value="DENY">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p v-if="query.isLoading.value" class="text-sm text-muted-foreground">
            Đang tải danh mục quyền...
          </p>
          <Collapsible
            v-for="[resource, permissions] in groups"
            :key="resource"
            :default-open="true"
            class="rounded-lg border"
          >
            <CollapsibleTrigger
              class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                >{{ formatPermissionResource(resource) }} ({{
                  permissions.length
                }})</span
              >
              <ChevronDown class="size-4 [[data-state=closed]_&]:-rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent class="space-y-3 border-t p-3">
              <article
                v-for="permission in permissions"
                :key="permission.id"
                class="space-y-3 rounded-lg border p-4"
              >
                <div
                  class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p class="font-medium">{{ permission.name }}</p>
                    <p class="break-all text-xs text-muted-foreground">
                      {{ permission.code }}
                    </p>
                    <p
                      v-if="permission.description"
                      class="mt-1 text-xs text-muted-foreground"
                    >
                      {{ permission.description }}
                    </p>
                  </div>
                  <Badge
                    :variant="
                      effective(permission.id).includes('từ chối')
                        ? 'destructive'
                        : 'secondary'
                    "
                  >
                    {{ effective(permission.id) }}
                  </Badge>
                </div>
                <p class="text-xs text-muted-foreground">
                  {{ permissionSource(permission.id) }}
                </p>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    v-for="option in ['INHERIT', 'ALLOW', 'DENY'] as State[]"
                    :key="option"
                    type="button"
                    size="sm"
                    :variant="
                      stateOf(permission.id) === option
                        ? option === 'DENY'
                          ? 'destructive'
                          : 'default'
                        : 'outline'
                    "
                    :disabled="
                      Boolean(pendingId) ||
                      isDangerousPermission(permission.code)
                    "
                    @click="setState(permission.id, option)"
                  >
                    <LoaderCircle
                      v-if="
                        pendingId === permission.id &&
                        stateOf(permission.id) !== option
                      "
                      class="mr-1 size-3 animate-spin"
                    />
                    {{ formatPermissionState(option) }}
                  </Button>
                </div>
                <p
                  v-if="isDangerousPermission(permission.code)"
                  class="text-xs text-amber-700"
                >
                  Quyền nhạy cảm này không thể được cấp hoặc từ chối trực tiếp.
                </p>
              </article>
            </CollapsibleContent>
          </Collapsible>
          <p
            v-if="!query.isLoading.value && !groups.length"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            Không có quyền phù hợp bộ lọc.
          </p>
        </div>
      </ScrollArea>
      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6">
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
