<script setup lang="ts">
import axios from "axios";
import { nextTick, reactive, ref, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { LoaderCircle } from "@lucide/vue";
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
import { createBranchAdmin } from "../api/branch-admin-api";
import { branchAdminKeys } from "../api/branch-admin-query-keys";
import { toCreateBranchAdminPayload } from "../adapters/branch-admin-form.adapter";
import { branchAdminCreateSchema } from "../schemas/branch-admin-create.schema";
import type { BranchAdminCreateField, BranchAdminCreateForm } from "../types";
import BranchAdminBranchSelector from "./BranchAdminBranchSelector.vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  created: [id: string];
}>();
const queryClient = useQueryClient();
const submitting = ref(false);
const rootError = ref("");
const form = reactive<BranchAdminCreateForm>(emptyForm());
const errors = reactive<Partial<Record<BranchAdminCreateField, string>>>({});
const fieldOrder: BranchAdminCreateField[] = [
  "fullName",
  "email",
  "phone",
  "password",
  "confirmPassword",
  "branchIds",
];

function emptyForm(): BranchAdminCreateForm {
  return {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    branchIds: [],
  };
}

function reset(): void {
  Object.assign(form, emptyForm());
  fieldOrder.forEach((field) => delete errors[field]);
  rootError.value = "";
  submitting.value = false;
}

watch(
  () => props.open,
  (open) => {
    if (open) reset();
  },
);

function validateField(field: BranchAdminCreateField): void {
  const result = branchAdminCreateSchema.safeParse(form);
  const issue = result.success
    ? undefined
    : result.error.issues.find((item) => item.path[0] === field);
  if (issue) errors[field] = issue.message;
  else delete errors[field];
}

function updateText(
  field: Exclude<BranchAdminCreateField, "branchIds">,
  value: string | number,
): void {
  form[field] = String(value);
  rootError.value = "";
  if (errors[field]) validateField(field);
  if (field === "password" && errors.confirmPassword)
    validateField("confirmPassword");
}

function updateBranches(value: string[]): void {
  form.branchIds = value;
  rootError.value = "";
  if (errors.branchIds) validateField("branchIds");
}

async function focusFirstError(): Promise<void> {
  await nextTick();
  const field = fieldOrder.find((item) => errors[item]);
  if (!field) return;
  document.getElementById(`branch-admin-create-${field}`)?.focus();
}

function mapServerError(error: unknown): void {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) {
    rootError.value = "Không thể tạo quản trị viên. Vui lòng thử lại.";
    return;
  }
  const response = error.response;
  const serverErrors = response?.data.errors;
  if (serverErrors) {
    for (const [field, messages] of Object.entries(serverErrors)) {
      if (fieldOrder.includes(field as BranchAdminCreateField)) {
        const target = field as BranchAdminCreateField;
        errors[target] =
          target === "email"
            ? "Email không hợp lệ hoặc đã được sử dụng."
            : target === "branchIds"
              ? "Danh sách chi nhánh không hợp lệ."
              : (messages[0] ?? "Dữ liệu không hợp lệ.");
      }
    }
  }
  if (response?.status === 409 && !errors.email)
    errors.email = "Email này đã được sử dụng.";
  rootError.value =
    response?.status === 403
      ? "Bạn không có quyền tạo quản trị viên chi nhánh."
      : serverErrors || response?.status === 409
        ? ""
        : "Không thể tạo quản trị viên. Vui lòng thử lại.";
}

async function submit(): Promise<void> {
  if (submitting.value) return;
  rootError.value = "";
  const result = branchAdminCreateSchema.safeParse(form);
  if (!result.success) {
    fieldOrder.forEach((field) => delete errors[field]);
    for (const issue of result.error.issues) {
      const field = issue.path[0] as BranchAdminCreateField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
    toast.error("Vui lòng kiểm tra lại thông tin quản trị viên.");
    await focusFirstError();
    return;
  }

  submitting.value = true;
  try {
    const response = await createBranchAdmin(
      toCreateBranchAdminPayload(result.data),
    );
    await queryClient.invalidateQueries({ queryKey: branchAdminKeys.lists() });
    toast.success("Đã tạo quản trị viên chi nhánh.");
    emit("update:open", false);
    emit("created", response.data.id);
  } catch (error) {
    mapServerError(error);
    await focusFirstError();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent
      class="grid max-h-[90dvh] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle>Thêm quản trị viên chi nhánh</DialogTitle>
        <DialogDescription
          >Tạo tài khoản nội bộ và phân công vào ít nhất một chi nhánh đang hoạt
          động.</DialogDescription
        >
      </DialogHeader>
      <ScrollArea
        class="min-h-0 w-full min-w-0 max-w-full overflow-hidden px-5 sm:px-6"
      >
        <form
          id="branch-admin-create-form"
          class="w-full min-w-0 max-w-full space-y-5 px-1 py-5"
          @submit.prevent="submit"
        >
          <div
            v-if="rootError"
            class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            {{ rootError }}
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2 sm:col-span-2">
              <Label for="branch-admin-create-fullName">Họ và tên</Label
              ><Input
                id="branch-admin-create-fullName"
                autocomplete="name"
                :model-value="form.fullName"
                :aria-invalid="Boolean(errors.fullName)"
                :disabled="submitting"
                @update:model-value="(value) => updateText('fullName', value)"
              />
              <p v-if="errors.fullName" class="text-sm text-destructive">
                {{ errors.fullName }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="branch-admin-create-email">Email</Label
              ><Input
                id="branch-admin-create-email"
                type="email"
                autocomplete="email"
                :model-value="form.email"
                :aria-invalid="Boolean(errors.email)"
                :disabled="submitting"
                @update:model-value="(value) => updateText('email', value)"
              />
              <p v-if="errors.email" class="text-sm text-destructive">
                {{ errors.email }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="branch-admin-create-phone">Số điện thoại</Label
              ><Input
                id="branch-admin-create-phone"
                type="tel"
                autocomplete="tel"
                :model-value="form.phone"
                :aria-invalid="Boolean(errors.phone)"
                :disabled="submitting"
                @update:model-value="(value) => updateText('phone', value)"
                @blur="validateField('phone')"
              />
              <p v-if="errors.phone" class="text-sm text-destructive">
                {{ errors.phone }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="branch-admin-create-password">Mật khẩu</Label
              ><Input
                id="branch-admin-create-password"
                type="password"
                autocomplete="new-password"
                :model-value="form.password"
                :aria-invalid="Boolean(errors.password)"
                :disabled="submitting"
                @update:model-value="(value) => updateText('password', value)"
              />
              <p v-if="errors.password" class="text-sm text-destructive">
                {{ errors.password }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="branch-admin-create-confirmPassword"
                >Xác nhận mật khẩu</Label
              ><Input
                id="branch-admin-create-confirmPassword"
                type="password"
                autocomplete="new-password"
                :model-value="form.confirmPassword"
                :aria-invalid="Boolean(errors.confirmPassword)"
                :disabled="submitting"
                @update:model-value="
                  (value) => updateText('confirmPassword', value)
                "
              />
              <p v-if="errors.confirmPassword" class="text-sm text-destructive">
                {{ errors.confirmPassword }}
              </p>
            </div>
          </div>
          <div
            id="branch-admin-create-branchIds"
            tabindex="-1"
            :aria-invalid="Boolean(errors.branchIds)"
          >
            <BranchAdminBranchSelector
              :model-value="form.branchIds"
              :disabled="submitting"
              @update:model-value="updateBranches"
            />
            <p v-if="errors.branchIds" class="mt-2 text-sm text-destructive">
              {{ errors.branchIds }}
            </p>
          </div>
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
        <Button
          type="submit"
          form="branch-admin-create-form"
          :disabled="submitting"
          ><LoaderCircle
            v-if="submitting"
            class="mr-2 h-4 w-4 animate-spin"
          />Tạo quản trị viên</Button
        >
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
