<script setup lang="ts">
import axios from "axios";
import { computed, nextTick, reactive, ref, watch } from "vue";
import { LoaderCircle, TriangleAlert } from "@lucide/vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { toast } from "vue-sonner";
import type { ErrorResponseDto } from "@/api/generated/models";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { roleKeys } from "@/features/roles/api/role-query-keys";
import {
  createPermission,
  getPermission,
  updatePermission,
} from "../api/permission-api";
import { permissionKeys } from "../api/permission-query-keys";
import {
  emptyPermissionForm,
  permissionToForm,
  toCreatePermissionPayload,
  toUpdatePermissionPayload,
} from "../adapters/permission-form.adapter";
import { permissionFormSchema } from "../schemas/permission-form.schema";
import type {
  Permission,
  PermissionFormMode,
  PermissionFormState,
} from "../types";

const props = defineProps<{
  open: boolean;
  mode: PermissionFormMode;
  permission?: Permission | null;
}>();
const emit = defineEmits<{ "update:open": [open: boolean]; saved: [] }>();
const queryClient = useQueryClient();
const form = reactive<PermissionFormState>(emptyPermissionForm());
const errors = reactive<Partial<Record<keyof PermissionFormState, string>>>({});
const isSubmitting = ref(false);
const formError = ref("");
const formFieldIds: Record<keyof PermissionFormState, string> = {
  code: "permission-code",
  name: "permission-name",
  resource: "permission-resource",
  action: "permission-action",
  guardName: "permission-guard",
  description: "permission-description",
};
const detailQuery = useQuery({
  queryKey: computed(() => permissionKeys.detail(props.permission?.id ?? "")),
  queryFn: ({ signal }) => getPermission(props.permission!.id, signal),
  enabled: computed(
    () =>
      props.open && props.mode === "update" && Boolean(props.permission?.id),
  ),
});
const currentPermission = computed(
  () => detailQuery.data.value?.data ?? props.permission ?? null,
);
const totalUsage = computed(() => {
  const count = detailQuery.data.value?.data._count;
  return count
    ? count.rolePermissions +
        count.userPermissions +
        count.userBranchPermissions
    : 0;
});

function reset(): void {
  Object.assign(
    form,
    props.mode === "update" && currentPermission.value
      ? permissionToForm(currentPermission.value)
      : emptyPermissionForm(),
  );
  Object.keys(errors).forEach(
    (key) => delete errors[key as keyof PermissionFormState],
  );
  formError.value = "";
  isSubmitting.value = false;
}
watch(
  () => [
    props.open,
    props.mode,
    props.permission?.id,
    detailQuery.data.value?.data.updatedAt,
  ],
  reset,
  { immediate: true },
);

async function validateField(field: keyof PermissionFormState): Promise<void> {
  const fieldsToValidate: (keyof PermissionFormState)[] = [field];
  if ((field === "resource" || field === "action") && errors.code)
    fieldsToValidate.push("code");
  if (
    !fieldsToValidate.some((candidate) => errors[candidate]) &&
    !formError.value
  )
    return;
  await nextTick();
  const result = permissionFormSchema.safeParse(form);
  for (const candidate of fieldsToValidate) {
    const issue = result.success
      ? undefined
      : result.error.issues.find((item) => item.path[0] === candidate);
    if (issue) errors[candidate] = issue.message;
    else delete errors[candidate];
  }
  const rootIssue = result.success
    ? undefined
    : result.error.issues.find((item) => item.path.length === 0);
  formError.value = rootIssue?.message ?? "";
}
function applyValidationErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): void {
  Object.keys(errors).forEach(
    (key) => delete errors[key as keyof PermissionFormState],
  );
  formError.value = "";
  issues.forEach((issue) => {
    const field = issue.path[0];
    if (issue.path.length === 0 && !formError.value) {
      formError.value = issue.message;
    } else if (
      typeof field === "string" &&
      field in form &&
      !errors[field as keyof PermissionFormState]
    )
      errors[field as keyof PermissionFormState] = issue.message;
  });
}
async function focusFirstInvalidField(): Promise<void> {
  const firstField = Object.keys(errors)[0] as
    keyof PermissionFormState | undefined;
  if (!firstField) return;
  await nextTick();
  const element = document.getElementById(formFieldIds[firstField]);
  element?.scrollIntoView({ block: "nearest" });
  element?.focus();
}
async function mapServerErrors(error: unknown): Promise<boolean> {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return false;
  const messages: Record<keyof PermissionFormState, string> = {
    code: "Mã quyền không hợp lệ.",
    name: "Tên quyền không hợp lệ.",
    resource: "Tài nguyên không hợp lệ.",
    action: "Hành động không hợp lệ.",
    guardName: "Guard không hợp lệ.",
    description: "Mô tả không hợp lệ.",
  };
  Object.entries(error.response?.data.errors ?? {}).forEach(([field]) => {
    if (field in form)
      errors[field as keyof PermissionFormState] =
        messages[field as keyof PermissionFormState];
  });
  if (error.response?.status === 409) errors.code = "Mã quyền đã tồn tại.";
  const hasFieldErrors = Object.keys(errors).length > 0;
  if (hasFieldErrors) await focusFirstInvalidField();
  return hasFieldErrors;
}
async function submit(): Promise<void> {
  if (isSubmitting.value) return;
  formError.value = "";
  const result = permissionFormSchema.safeParse(form);
  if (!result.success) {
    applyValidationErrors(result.error.issues);
    await focusFirstInvalidField();
    return;
  }
  isSubmitting.value = true;
  try {
    if (props.mode === "create") {
      await createPermission(toCreatePermissionPayload(result.data));
      await queryClient.invalidateQueries({ queryKey: roleKeys.details() });
      toast.success("Đã tạo quyền.");
    } else if (currentPermission.value) {
      const payload = toUpdatePermissionPayload(
        result.data,
        currentPermission.value,
      );
      if (Object.keys(payload).length === 0) {
        toast.info("Không có thay đổi để lưu.");
        return;
      }
      await updatePermission(currentPermission.value.id, payload);
      await queryClient.invalidateQueries({
        queryKey: permissionKeys.detail(currentPermission.value.id),
      });
      toast.success("Đã cập nhật quyền.");
    }
    await queryClient.invalidateQueries({ queryKey: permissionKeys.lists() });
    emit("saved");
    emit("update:open", false);
  } catch (error) {
    const hasFieldErrors = await mapServerErrors(error);
    const message = axios.isAxiosError<ErrorResponseDto>(error)
      ? error.response?.data.message
      : undefined;
    formError.value = message || "Không thể lưu quyền. Vui lòng thử lại.";
    toast.error(
      hasFieldErrors
        ? "Vui lòng kiểm tra các trường được đánh dấu."
        : formError.value,
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"
    ><DialogContent
      class="grid max-h-[90dvh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0"
      ><DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6"
        ><DialogTitle>{{
          mode === "create" ? "Tạo quyền" : "Cập nhật quyền"
        }}</DialogTitle
        ><DialogDescription>{{
          mode === "create"
            ? "Tạo quyền tùy chỉnh. Việc gán quyền vào vai trò thuộc giai đoạn riêng."
            : "Chỉnh sửa thông tin quyền trong danh mục toàn hệ thống."
        }}</DialogDescription></DialogHeader
      >
      <div class="min-h-0 overflow-hidden">
        <ScrollArea class="h-full"
          ><form
            id="permission-form"
            class="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6"
            novalidate
            @submit.prevent="submit"
          >
            <div
              v-if="formError"
              role="alert"
              class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2"
            >
              {{ formError }}
            </div>
            <div
              v-if="mode === 'update' && totalUsage > 0"
              class="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm sm:col-span-2"
            >
              <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Quyền đang có {{ totalUsage }} mapping. Thay đổi mã, tài nguyên
                hoặc hành động có thể ảnh hưởng phân quyền.
              </p>
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="permission-code">Mã quyền</Label
              ><Input
                id="permission-code"
                v-model="form.code"
                autocomplete="off"
                :aria-invalid="Boolean(errors.code)"
                @input="validateField('code')"
              />
              <p
                v-if="errors.code"
                role="alert"
                class="text-sm text-destructive"
              >
                {{ errors.code }}
              </p>
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="permission-name">Tên quyền</Label
              ><Input
                id="permission-name"
                v-model="form.name"
                :aria-invalid="Boolean(errors.name)"
                @input="validateField('name')"
              />
              <p
                v-if="errors.name"
                role="alert"
                class="text-sm text-destructive"
              >
                {{ errors.name }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="permission-resource">Tài nguyên</Label
              ><Input
                id="permission-resource"
                v-model="form.resource"
                :aria-invalid="Boolean(errors.resource)"
                @input="validateField('resource')"
              />
              <p
                v-if="errors.resource"
                role="alert"
                class="text-sm text-destructive"
              >
                {{ errors.resource }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="permission-action">Hành động</Label
              ><Input
                id="permission-action"
                v-model="form.action"
                :aria-invalid="Boolean(errors.action)"
                @input="validateField('action')"
              />
              <p
                v-if="errors.action"
                role="alert"
                class="text-sm text-destructive"
              >
                {{ errors.action }}
              </p>
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="permission-guard">Guard</Label
              ><Input
                id="permission-guard"
                v-model="form.guardName"
                readonly
                aria-readonly="true"
                class="bg-muted"
              />
              <p class="text-xs text-muted-foreground">
                Contract hiện chỉ hỗ trợ guard web.
              </p>
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="permission-description">Mô tả</Label
              ><textarea
                id="permission-description"
                v-model="form.description"
                rows="4"
                class="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                @input="validateField('description')"
              />
              <p
                v-if="errors.description"
                role="alert"
                class="text-sm text-destructive"
              >
                {{ errors.description }}
              </p>
            </div>
          </form></ScrollArea
        >
      </div>
      <DialogFooter
        class="flex-col-reverse border-t bg-background px-5 py-4 sm:flex-row sm:px-6"
        ><Button
          type="button"
          variant="outline"
          class="w-full sm:w-auto"
          :disabled="isSubmitting"
          @click="emit('update:open', false)"
          >Hủy</Button
        ><Button
          form="permission-form"
          type="submit"
          class="w-full sm:w-auto"
          :disabled="isSubmitting || detailQuery.isFetching.value"
          ><LoaderCircle
            v-if="isSubmitting"
            class="mr-2 h-4 w-4 animate-spin"
          />{{ mode === "create" ? "Tạo quyền" : "Lưu thay đổi" }}</Button
        ></DialogFooter
      >
    </DialogContent></Dialog
  >
</template>
