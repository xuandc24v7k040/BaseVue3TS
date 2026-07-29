<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole, RefreshCw } from "@lucide/vue";
import { useQueryClient } from "@tanstack/vue-query";
import axios from "axios";
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { clearAuthSensitiveQueries } from "@/api/query-cache";
import { clearCsrfToken } from "@/api/http/csrf-manager";
import AuthBrand from "@/components/client/auth/AuthBrand.vue";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  submitPasswordReset,
  validatePasswordResetToken,
} from "@/features/password-recovery/api/password-recovery-api";
import { resetPasswordSchema } from "@/features/password-recovery/schemas/password-recovery.schema";
import {
  passwordRecoveryErrorMessage,
  resetLinkFailureState,
  type ResetLinkFailureState,
} from "@/features/password-recovery/utils/password-recovery-errors";
import { clearSessionHint } from "@/features/auth/session-hint";
import { useAuthStore } from "@/stores/auth.store";

type ValidationState =
  | "loading"
  | "valid"
  | "network-error"
  | ResetLinkFailureState;
type ResetField = "newPassword" | "confirmPassword";

const RESET_PASSWORD_TOAST_ID = "reset-password-result";
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const authStore = useAuthStore();
const token = ref("");
const validationState = ref<ValidationState>("loading");
const newPassword = ref("");
const confirmPassword = ref("");
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const isSubmitting = ref(false);
const globalError = ref<string | null>(null);
const fieldErrors = reactive<Record<ResetField, string | null>>({
  newPassword: null,
  confirmPassword: null,
});
let validationController: AbortController | null = null;

const unavailableCopy = computed(() => {
  const messages: Record<Exclude<ValidationState, "loading" | "valid">, string> =
    {
      expired:
        "Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.",
      used: "Liên kết này đã được sử dụng.",
      revoked:
        "Liên kết này không còn hiệu lực. Vui lòng yêu cầu liên kết mới.",
      invalid: "Liên kết đặt lại mật khẩu không hợp lệ.",
      "network-error":
        "Không thể kiểm tra liên kết lúc này. Vui lòng kiểm tra kết nối và thử lại.",
    };
  if (validationState.value === "loading" || validationState.value === "valid")
    return null;
  return messages[validationState.value];
});

watch(newPassword, (value) => {
  const result = resetPasswordSchema.shape.newPassword.safeParse(value);
  if (result.success) {
    fieldErrors.newPassword = null;
    globalError.value = null;
  }
  if (confirmPassword.value && confirmPassword.value === value)
    fieldErrors.confirmPassword = null;
});

watch(confirmPassword, (value) => {
  if (value && value === newPassword.value) {
    fieldErrors.confirmPassword = null;
    globalError.value = null;
  }
});

async function validateToken(rawToken: string): Promise<void> {
  validationController?.abort();
  validationController = new AbortController();
  token.value = rawToken;
  globalError.value = null;

  if (!rawToken) {
    validationState.value = "invalid";
    return;
  }

  validationState.value = "loading";
  try {
    await validatePasswordResetToken(rawToken, validationController.signal);
    validationState.value = "valid";
  } catch (error: unknown) {
    if (axios.isCancel(error)) return;
    validationState.value =
      resetLinkFailureState(error) ?? ("network-error" as const);
  }
}

watch(
  () => route.query.token,
  (rawToken) => {
    const nextToken = typeof rawToken === "string" ? rawToken : "";
    void validateToken(nextToken);
  },
  { immediate: true },
);

onBeforeUnmount(() => validationController?.abort());

function validateForm(): { newPassword: string; confirmPassword: string } | null {
  const result = resetPasswordSchema.safeParse({
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  });
  if (result.success) {
    fieldErrors.newPassword = null;
    fieldErrors.confirmPassword = null;
    return result.data;
  }

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      (field === "newPassword" || field === "confirmPassword") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return null;
}

async function submitResetPassword(): Promise<void> {
  if (isSubmitting.value || validationState.value !== "valid") return;
  const form = validateForm();
  if (!form) return;

  isSubmitting.value = true;
  globalError.value = null;
  try {
    await submitPasswordReset({
      token: token.value,
      newPassword: form.newPassword,
    });
    clearCsrfToken();
    clearSessionHint();
    authStore.setAnonymous();
    clearAuthSensitiveQueries(queryClient);
    toast.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.", {
      id: RESET_PASSWORD_TOAST_ID,
    });
    await router.replace({ name: "customer-login" });
  } catch (error: unknown) {
    const linkState = resetLinkFailureState(error);
    if (linkState) {
      validationState.value = linkState;
      return;
    }
    globalError.value = passwordRecoveryErrorMessage(error);
    toast.error(globalError.value, { id: RESET_PASSWORD_TOAST_ID });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section
    class="min-h-0 bg-white"
    aria-labelledby="customer-reset-password-heading"
  >
    <div
      class="mx-auto flex min-h-full w-full max-w-[480px] flex-col justify-center px-6 py-10 sm:px-8 md:px-10"
    >
      <AuthBrand />

      <div class="mt-6">
        <h1
          id="customer-reset-password-heading"
          class="text-[1.875rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--bookora-auth-ink)]"
        >
          Đặt lại mật khẩu
        </h1>
        <p class="mt-2 text-sm leading-6 text-[var(--bookora-auth-muted)]">
          Tạo mật khẩu mới gồm ít nhất 8 ký tự, có chữ và số.
        </p>
      </div>

      <div
        v-if="validationState === 'loading'"
        class="mt-7 space-y-4"
        aria-label="Đang kiểm tra liên kết"
      >
        <Skeleton class="h-11 w-full" />
        <Skeleton class="h-11 w-full" />
        <Skeleton class="h-11 w-full" />
      </div>

      <Alert
        v-else-if="validationState !== 'valid'"
        variant="destructive"
        class="mt-7"
      >
        <AlertTitle>Không thể sử dụng liên kết</AlertTitle>
        <AlertDescription>{{ unavailableCopy }}</AlertDescription>
        <div class="mt-4 flex flex-wrap gap-3">
          <Button
            v-if="validationState === 'network-error'"
            type="button"
            variant="outline"
            @click="validateToken(token)"
          >
            <RefreshCw aria-hidden="true" class="mr-2 size-4" />
            Thử lại
          </Button>
          <Button as-child variant="outline">
            <RouterLink :to="{ name: 'customer-forgot-password' }">
              Yêu cầu liên kết mới
            </RouterLink>
          </Button>
        </div>
      </Alert>

      <form
        v-else
        class="mt-6 flex flex-col gap-3"
        novalidate
        @submit.prevent="submitResetPassword"
      >
        <p
          v-if="globalError"
          role="alert"
          class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ globalError }}
        </p>

        <Field class="gap-1">
          <FieldLabel for="reset-password-new">Mật khẩu mới</FieldLabel>
          <div class="relative">
            <LockKeyhole
              aria-hidden="true"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
            />
            <Input
              id="reset-password-new"
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              autocomplete="new-password"
              class="h-11 rounded-lg bg-white px-10"
              placeholder="Nhập mật khẩu mới"
              :aria-invalid="Boolean(fieldErrors.newPassword)"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
              :aria-label="
                showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'
              "
              @click="showNewPassword = !showNewPassword"
            >
              <EyeOff v-if="showNewPassword" aria-hidden="true" class="size-4" />
              <Eye v-else aria-hidden="true" class="size-4" />
            </Button>
          </div>
          <div class="min-h-[18px]">
            <FieldError
              :errors="[fieldErrors.newPassword ?? undefined]"
              class="text-xs leading-[18px]"
            />
          </div>
        </Field>

        <Field class="gap-1">
          <FieldLabel for="reset-password-confirm">
            Xác nhận mật khẩu
          </FieldLabel>
          <div class="relative">
            <LockKeyhole
              aria-hidden="true"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
            />
            <Input
              id="reset-password-confirm"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              class="h-11 rounded-lg bg-white px-10"
              placeholder="Nhập lại mật khẩu mới"
              :aria-invalid="Boolean(fieldErrors.confirmPassword)"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
              :aria-label="
                showConfirmPassword
                  ? 'Ẩn mật khẩu xác nhận'
                  : 'Hiện mật khẩu xác nhận'
              "
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <EyeOff
                v-if="showConfirmPassword"
                aria-hidden="true"
                class="size-4"
              />
              <Eye v-else aria-hidden="true" class="size-4" />
            </Button>
          </div>
          <div class="min-h-[18px]">
            <FieldError
              :errors="[fieldErrors.confirmPassword ?? undefined]"
              class="text-xs leading-[18px]"
            />
          </div>
        </Field>

        <Button
          type="submit"
          :disabled="isSubmitting"
          class="h-11 rounded-lg bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
        >
          {{ isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu" }}
        </Button>
      </form>

      <RouterLink
        :to="{ name: 'customer-login' }"
        class="mt-6 self-start text-sm font-medium text-[var(--bookora-green)] hover:underline"
      >
        Quay lại đăng nhập
      </RouterLink>
    </div>
  </section>
</template>
