<script setup lang="ts">
import axios from "axios";
import { nextTick, reactive, ref, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { LoaderCircle } from "@lucide/vue";
import { toast } from "vue-sonner";
import type { ErrorResponseDto } from "@/api/generated/models";
import { useBranchStore } from "@/stores/branch.store";
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
import { createStaff } from "../api/staff-api";
import { staffKeys } from "../api/staff-query-keys";
import { staffCreateSchema } from "../schemas/staff-create.schema";
import type { StaffCreateForm } from "../schemas/staff-create.schema";
import { normalizeFieldErrors } from "../utils/staff-form-errors";
import StaffAccessSelector from "./StaffAccessSelector.vue";

type Field = keyof StaffCreateForm;
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();
const branchStore = useBranchStore();
const queryClient = useQueryClient();
const submitting = ref(false);
const rootError = ref("");
const form = reactive<StaffCreateForm>(emptyForm());
const errors = reactive<Partial<Record<Field, string>>>({});
const fieldOrder: Field[] = [
  "fullName",
  "email",
  "phone",
  "password",
  "confirmPassword",
  "roleIds",
  "permissionIds",
];

function emptyForm(): StaffCreateForm {
  return {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    roleIds: [],
    permissionIds: [],
  };
}

function reset(): void {
  Object.assign(form, emptyForm());
  Object.keys(errors).forEach((key) => delete errors[key as Field]);
  rootError.value = "";
  submitting.value = false;
}
watch(
  () => props.open,
  (open) => {
    if (open) reset();
  },
);

function validateField(field: Field): void {
  const result = staffCreateSchema.safeParse(form);
  const issue = result.success
    ? undefined
    : result.error.issues.find(({ path }) => path[0] === field);
  if (issue) errors[field] = issue.message;
  else delete errors[field];
}

function updateAccess(
  field: "roleIds" | "permissionIds",
  value: string[],
): void {
  form[field] = value;
  rootError.value = "";
  if (field === "roleIds") validateField(field);
  else delete errors[field];
}

async function focusFirstError(): Promise<void> {
  await nextTick();
  const field = fieldOrder.find((item) => errors[item]);
  if (field) document.getElementById(`staff-create-${field}`)?.focus();
}

function applyIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
): void {
  Object.keys(errors).forEach((key) => delete errors[key as Field]);
  issues.forEach((issue) => {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      fieldOrder.includes(field as Field) &&
      !errors[field as Field]
    ) {
      errors[field as Field] = issue.message;
    }
  });
}

function mapServerError(error: unknown): void {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) {
    rootError.value = "Không thể tạo nhân viên. Vui lòng thử lại.";
    return;
  }
  const response = error.response;
  const fieldErrors = normalizeFieldErrors(
    response?.data.errors,
    fieldOrder,
  );
  Object.assign(errors, fieldErrors);
  if (response?.status === 409) errors.email = "Email này đã được sử dụng.";
  if (Object.keys(fieldErrors).length || response?.status === 409) {
    rootError.value = "";
    return;
  }
  rootError.value =
    response?.status === 403
      ? "Bạn không có quyền tạo nhân viên tại chi nhánh này."
      : (response?.data.message ??
        "Không thể tạo nhân viên. Vui lòng thử lại.");
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  rootError.value = "";
  const result = staffCreateSchema.safeParse(form);
  if (!result.success) {
    applyIssues(result.error.issues);
    await focusFirstError();
    return;
  }
  const branchId = branchStore.selectedBranchId;
  if (!branchId) return;
  submitting.value = true;
  try {
    await createStaff({
      fullName: result.data.fullName,
      email: result.data.email,
      ...(result.data.phone ? { phone: result.data.phone } : {}),
      password: result.data.password,
      roleIds: result.data.roleIds,
      ...(result.data.permissionIds.length
        ? { permissionIds: result.data.permissionIds }
        : {}),
    });
    await queryClient.invalidateQueries({
      queryKey: staffKeys.lists(branchId),
    });
    await queryClient.invalidateQueries({
      queryKey: [...staffKeys.scoped(branchId), "candidates"],
    });
    toast.success("Tạo nhân viên thành công.");
    emit("update:open", false);
  } catch (error) {
    mapServerError(error);
    await focusFirstError();
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
        <DialogTitle>Tạo tài khoản nhân viên mới</DialogTitle>
        <DialogDescription
          >Tạo tài khoản và phân công tại
          {{ branchStore.selectedBranch?.name }}. Vai trò và quyền không áp dụng
          cho chi nhánh khác.</DialogDescription
        >
      </DialogHeader>
      <ScrollArea class="min-h-0 px-5 sm:px-6">
        <form
          id="staff-create-form"
          class="space-y-6 px-1 py-5"
          novalidate
          @submit.prevent="submit"
        >
          <div
            v-if="rootError"
            role="alert"
            class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {{ rootError }}
          </div>
          <section class="space-y-4">
            <h3 class="font-medium">Thông tin tài khoản</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2 sm:col-span-2">
                <Label for="staff-create-fullName">Họ và tên</Label
                ><Input
                  id="staff-create-fullName"
                  v-model="form.fullName"
                  autocomplete="name"
                  :disabled="submitting"
                  :aria-invalid="Boolean(errors.fullName)"
                  @input="validateField('fullName')"
                />
                <p v-if="errors.fullName" class="text-sm text-destructive">
                  {{ errors.fullName }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="staff-create-email">Email</Label
                ><Input
                  id="staff-create-email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  :disabled="submitting"
                  :aria-invalid="Boolean(errors.email)"
                  @input="validateField('email')"
                />
                <p v-if="errors.email" class="text-sm text-destructive">
                  {{ errors.email }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="staff-create-phone">Số điện thoại</Label
                ><Input
                  id="staff-create-phone"
                  v-model="form.phone"
                  type="tel"
                  autocomplete="tel"
                  :disabled="submitting"
                  :aria-invalid="Boolean(errors.phone)"
                  @input="validateField('phone')"
                />
                <p v-if="errors.phone" class="text-sm text-destructive">
                  {{ errors.phone }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="staff-create-password">Mật khẩu</Label
                ><Input
                  id="staff-create-password"
                  v-model="form.password"
                  type="password"
                  autocomplete="new-password"
                  :disabled="submitting"
                  :aria-invalid="Boolean(errors.password)"
                  @input="validateField('password')"
                />
                <p v-if="errors.password" class="text-sm text-destructive">
                  {{ errors.password }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="staff-create-confirmPassword"
                  >Xác nhận mật khẩu</Label
                ><Input
                  id="staff-create-confirmPassword"
                  v-model="form.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  :disabled="submitting"
                  :aria-invalid="Boolean(errors.confirmPassword)"
                  @input="validateField('confirmPassword')"
                />
                <p
                  v-if="errors.confirmPassword"
                  class="text-sm text-destructive"
                >
                  {{ errors.confirmPassword }}
                </p>
              </div>
            </div>
          </section>
          <section :id="'staff-create-roleIds'" tabindex="-1" class="space-y-2">
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
      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6">
        <Button
          type="button"
          variant="outline"
          :disabled="submitting"
          @click="emit('update:open', false)"
          >Hủy</Button
        >
        <Button type="submit" form="staff-create-form" :disabled="submitting"
          ><LoaderCircle
            v-if="submitting"
            class="mr-2 size-4 animate-spin"
          />Tạo nhân viên</Button
        >
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
