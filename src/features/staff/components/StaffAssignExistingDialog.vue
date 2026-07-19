<script setup lang="ts">
import axios from "axios";
import { computed, reactive, ref, watch } from "vue";
import { useDebounce } from "@vueuse/core";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  UserRound,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  ErrorResponseDto,
  StaffCandidatesParams,
} from "@/api/generated/models";
import { useBranchStore } from "@/stores/branch.store";
import { useAuthStore } from "@/stores/auth.store";
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
import { assignExistingStaff, listStaffCandidates } from "../api/staff-api";
import { staffKeys } from "../api/staff-query-keys";
import { assignExistingStaffSchema } from "../schemas/staff-create.schema";
import type { AssignExistingStaffForm } from "../schemas/staff-create.schema";
import { normalizeFieldErrors } from "../utils/staff-form-errors";
import StaffAccessSelector from "./StaffAccessSelector.vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();
const branchStore = useBranchStore();
const authStore = useAuthStore();
const queryClient = useQueryClient();
const search = ref("");
const debouncedSearch = useDebounce(search, 400);
const page = ref(1);
const submitting = ref(false);
const rootError = ref("");
const errors = reactive<Partial<Record<keyof AssignExistingStaffForm, string>>>(
  {},
);
const form = reactive<AssignExistingStaffForm>({
  userId: "",
  roleIds: [],
  permissionIds: [],
});
const params = computed<StaffCandidatesParams>(() => ({
  page: page.value,
  limit: 10,
  ...(debouncedSearch.value.trim()
    ? { search: debouncedSearch.value.trim() }
    : {}),
}));
const branchId = computed(() => branchStore.selectedBranchId ?? "");
const candidatesQuery = useQuery({
  queryKey: computed(() => staffKeys.candidates(branchId.value, params.value)),
  queryFn: ({ signal }) => listStaffCandidates(params.value, signal),
  enabled: computed(
    () =>
      props.open &&
      authStore.user?.isSuperAdmin === true &&
      Boolean(branchId.value),
  ),
  placeholderData: (previous) => previous,
});
const candidates = computed(() => candidatesQuery.data.value?.data ?? []);
const meta = computed(() => candidatesQuery.data.value?.meta);

watch(debouncedSearch, () => {
  page.value = 1;
});
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    search.value = "";
    page.value = 1;
    Object.assign(form, { userId: "", roleIds: [], permissionIds: [] });
    Object.keys(errors).forEach(
      (key) => delete errors[key as keyof AssignExistingStaffForm],
    );
    rootError.value = "";
  },
);

function selectCandidate(id: string): void {
  form.userId = id;
  delete errors.userId;
  rootError.value = "";
}

function updateAccess(
  field: "roleIds" | "permissionIds",
  value: string[],
): void {
  form[field] = value;
  rootError.value = "";
  if (field === "roleIds") applyValidationField(field);
  else delete errors[field];
}

function applyValidationField(field: keyof AssignExistingStaffForm): void {
  const result = assignExistingStaffSchema.safeParse(form);
  const issue = result.success
    ? undefined
    : result.error.issues.find(({ path }) => path[0] === field);
  if (issue) errors[field] = issue.message;
  else delete errors[field];
}

function applyValidation(): boolean {
  const result = assignExistingStaffSchema.safeParse(form);
  Object.keys(errors).forEach(
    (key) => delete errors[key as keyof AssignExistingStaffForm],
  );
  if (result.success) return true;
  result.error.issues.forEach((issue) => {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      !errors[field as keyof AssignExistingStaffForm]
    ) {
      errors[field as keyof AssignExistingStaffForm] = issue.message;
    }
  });
  return false;
}

async function submit(): Promise<void> {
  if (submitting.value || !applyValidation() || !branchId.value) {
    return;
  }
  submitting.value = true;
  rootError.value = "";
  try {
    await assignExistingStaff(form.userId, {
      roleIds: form.roleIds,
      ...(form.permissionIds.length
        ? { permissionIds: form.permissionIds }
        : {}),
    });
    await queryClient.invalidateQueries({
      queryKey: staffKeys.lists(branchId.value),
    });
    await queryClient.invalidateQueries({
      queryKey: [...staffKeys.scoped(branchId.value), "candidates"],
    });
    toast.success("Đã thêm nhân sự vào chi nhánh.");
    emit("update:open", false);
  } catch (error) {
    if (
      axios.isAxiosError<ErrorResponseDto>(error) &&
      error.response?.status === 409
    ) {
      rootError.value =
        "Tài khoản vừa được phân công tại chi nhánh này. Danh sách đã được tải lại.";
      form.userId = "";
      await candidatesQuery.refetch();
    } else if (axios.isAxiosError<ErrorResponseDto>(error)) {
      const fieldErrors = normalizeFieldErrors(error.response?.data.errors, [
        "userId",
        "roleIds",
        "permissionIds",
      ] as const);
      Object.assign(errors, fieldErrors);
      rootError.value = Object.keys(fieldErrors).length
        ? ""
        : (error.response?.data.message ??
          "Không thể thêm nhân sự vào chi nhánh.");
    } else {
      rootError.value = axios.isAxiosError<ErrorResponseDto>(error)
        ? (error.response?.data.message ??
          "Không thể thêm nhân sự vào chi nhánh.")
        : "Không thể thêm nhân sự vào chi nhánh.";
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="grid max-h-[90dvh] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-4xl"
    >
      <DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>Thêm nhân sự nội bộ hiện có</DialogTitle>
        <DialogDescription
          >Chọn tài khoản nội bộ chưa được phân công tại
          {{ branchStore.selectedBranch?.name }}, sau đó gán vai trò nhân
          viên.</DialogDescription
        >
      </DialogHeader>
      <ScrollArea class="min-h-0 px-5 sm:px-6">
        <form
          id="staff-assign-existing-form"
          class="space-y-6 px-1 py-5"
          @submit.prevent="submit"
        >
          <div
            v-if="rootError"
            role="alert"
            class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {{ rootError }}
          </div>
          <section class="space-y-3">
            <div class="relative">
              <Search
                class="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"
              /><Input
                v-model="search"
                class="pl-9"
                placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
              />
            </div>
            <div
              id="staff-existing-userId"
              tabindex="-1"
              class="rounded-lg border"
            >
              <div
                v-if="candidatesQuery.isLoading.value"
                class="p-6 text-sm text-muted-foreground"
              >
                Đang tải tài khoản nội bộ...
              </div>
              <div
                v-else-if="candidatesQuery.isError.value"
                class="p-6 text-sm text-destructive"
              >
                Không thể tải danh sách ứng viên.
                <Button
                  type="button"
                  variant="link"
                  @click="candidatesQuery.refetch()"
                  >Thử lại</Button
                >
              </div>
              <div
                v-else-if="!candidates.length"
                class="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground"
              >
                <UserRound class="size-8" />
                <p>Không tìm thấy tài khoản phù hợp.</p>
              </div>
              <button
                v-for="candidate in candidates"
                :key="candidate.id"
                type="button"
                class="flex w-full items-start gap-3 border-b p-3 text-left last:border-b-0 hover:bg-muted/50"
                @click="selectCandidate(candidate.id)"
              >
                <span
                  class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border"
                  :class="
                    form.userId === candidate.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : ''
                  "
                  ><Check v-if="form.userId === candidate.id" class="size-3"
                /></span>
                <span class="min-w-0 flex-1"
                  ><span class="block truncate font-medium">{{
                    candidate.fullName || "Chưa cập nhật họ tên"
                  }}</span
                  ><span class="block truncate text-sm text-muted-foreground"
                    >{{ candidate.email
                    }}<template v-if="candidate.phone">
                      · {{ candidate.phone }}</template
                    ></span
                  ><span
                    class="text-xs"
                    :class="
                      candidate.isActive
                        ? 'text-emerald-700'
                        : 'text-destructive'
                    "
                    >{{
                      candidate.isActive
                        ? "Tài khoản hoạt động"
                        : "Tài khoản đang khóa"
                    }}
                    · {{ candidate.assignmentCount }} phân công khác</span
                  ></span
                >
              </button>
            </div>
            <p v-if="errors.userId" class="text-sm text-destructive">
              {{ errors.userId }}
            </p>
            <div
              v-if="meta && meta.lastPage > 1"
              class="flex items-center justify-between text-sm"
            >
              <span>Trang {{ meta.page }}/{{ meta.lastPage }}</span>
              <div class="flex gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  :disabled="!meta.hasPreviousPage"
                  @click="page--"
                  ><ChevronLeft class="size-4" /></Button
                ><Button
                  type="button"
                  size="icon"
                  variant="outline"
                  :disabled="!meta.hasNextPage"
                  @click="page++"
                  ><ChevronRight class="size-4"
                /></Button>
              </div>
            </div>
          </section>
          <section class="space-y-2">
            <h3 class="font-medium">
              Phân quyền tại {{ branchStore.selectedBranch?.name }}
            </h3>
            <StaffAccessSelector
              :role-ids="form.roleIds"
              :permission-ids="form.permissionIds"
              :disabled="submitting"
              :role-error="errors.roleIds"
              @update:role-ids="updateAccess('roleIds', $event)"
              @update:permission-ids="updateAccess('permissionIds', $event)"
            />
          </section>
        </form>
      </ScrollArea>
      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6"
        ><Button
          type="button"
          variant="outline"
          :disabled="submitting"
          @click="emit('update:open', false)"
          >Hủy</Button
        ><Button
          type="submit"
          form="staff-assign-existing-form"
          :disabled="submitting"
          ><LoaderCircle
            v-if="submitting"
            class="mr-2 size-4 animate-spin"
          />Thêm vào chi nhánh</Button
        ></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
