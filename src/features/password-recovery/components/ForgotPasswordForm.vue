<script setup lang="ts">
import { ArrowLeft, Mail } from "@lucide/vue";
import { computed, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { toast } from "vue-sonner";
import type { ForgotPasswordDto } from "@/api/generated/models";
import TurnstileWidget from "@/components/common/TurnstileWidget.vue";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import AuthBrand from "@/components/client/auth/AuthBrand.vue";
import { requestPasswordReset } from "@/features/password-recovery/api/password-recovery-api";
import { forgotPasswordSchema } from "@/features/password-recovery/schemas/password-recovery.schema";
import {
  passwordRecoveryErrorCode,
  passwordRecoveryErrorMessage,
} from "@/features/password-recovery/utils/password-recovery-errors";
import { env } from "@/lib/env";

const FORGOT_PASSWORD_TOAST_ID = "forgot-password-result";
const GENERIC_SUCCESS_MESSAGE =
  "Nếu email phù hợp với tài khoản Bookora, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";

const email = ref("");
const isSubmitting = ref(false);
const successMessage = ref<string | null>(null);
const globalError = ref<string | null>(null);
const googleAccountError = ref<string | null>(null);
const hasServerEmailError = ref(false);
const turnstileToken = ref("");
const turnstileError = ref<string | null>(null);
const turnstileWidget = ref<InstanceType<typeof TurnstileWidget> | null>(null);
const fieldErrors = reactive({ email: null as string | null });

const hasTurnstileConfigurationError = computed(
  () => env.turnstileEnabled && env.turnstileSiteKey.length === 0,
);

watch(email, (value) => {
  if (hasServerEmailError.value) {
    fieldErrors.email = null;
    hasServerEmailError.value = false;
  }
  googleAccountError.value = null;
  const result = forgotPasswordSchema.shape.email.safeParse(value);
  if (result.success) {
    fieldErrors.email = null;
    globalError.value = null;
  }
});

function handleTurnstileVerified(token: string): void {
  turnstileToken.value = token;
  turnstileError.value = null;
}

function resetTurnstile(message: string): void {
  turnstileToken.value = "";
  turnstileError.value = message;
  turnstileWidget.value?.reset();
}

function validateForm(): ForgotPasswordDto | null {
  globalError.value = null;
  turnstileError.value = null;

  const result = forgotPasswordSchema.safeParse({ email: email.value });
  if (!result.success) {
    fieldErrors.email = result.error.issues[0]?.message ?? "Email không hợp lệ.";
    return null;
  }

  fieldErrors.email = null;
  return {
    email: result.data.email,
    ...(turnstileToken.value ? { turnstileToken: turnstileToken.value } : {}),
  };
}

async function submitForgotPassword(): Promise<void> {
  if (isSubmitting.value || successMessage.value) return;
  const payload = validateForm();
  if (!payload) return;

  if (hasTurnstileConfigurationError.value) {
    turnstileError.value =
      "Thiếu cấu hình xác minh bảo mật. Vui lòng thử lại sau.";
    return;
  }
  if (env.turnstileEnabled && !turnstileToken.value) {
    turnstileError.value = "Vui lòng hoàn tất xác minh bảo mật.";
    return;
  }

  isSubmitting.value = true;
  try {
    const response = await requestPasswordReset(payload);
    successMessage.value = response.message || GENERIC_SUCCESS_MESSAGE;
    toast.success(successMessage.value, { id: FORGOT_PASSWORD_TOAST_ID });
  } catch (error: unknown) {
    const code = passwordRecoveryErrorCode(error);
    const message = passwordRecoveryErrorMessage(error);
    turnstileToken.value = "";
    turnstileWidget.value?.reset();
    if (code === "PASSWORD_RESET_EMAIL_NOT_FOUND") {
      fieldErrors.email = message;
      hasServerEmailError.value = true;
      toast.error(message, { id: FORGOT_PASSWORD_TOAST_ID });
      return;
    }
    if (code === "PASSWORD_RESET_UNSUPPORTED_GOOGLE_PROVIDER") {
      googleAccountError.value = message;
      return;
    }
    globalError.value = message;
    resetTurnstile(
      message.includes("xác minh")
        ? message
        : "Vui lòng xác minh lại trước khi gửi yêu cầu.",
    );
    toast.error(message, { id: FORGOT_PASSWORD_TOAST_ID });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section
    class="min-h-0 bg-white"
    aria-labelledby="customer-forgot-password-heading"
  >
    <div
      class="mx-auto flex min-h-full w-full max-w-[480px] flex-col justify-center px-6 py-10 sm:px-8 md:px-10"
    >
      <AuthBrand />

      <div class="mt-6">
        <h1
          id="customer-forgot-password-heading"
          class="text-[1.875rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--bookora-auth-ink)]"
        >
          Quên mật khẩu?
        </h1>
        <p class="mt-2 text-sm leading-6 text-[var(--bookora-auth-muted)]">
          Nhập email tài khoản. Thời hạn sử dụng liên kết sẽ được ghi rõ trong
          email.
        </p>
      </div>

      <Alert
        v-if="successMessage"
        class="mt-6 border-[var(--bookora-green)]/30 bg-[var(--bookora-green)]/5"
      >
        <AlertTitle>Kiểm tra hộp thư của bạn</AlertTitle>
        <AlertDescription>{{ successMessage }}</AlertDescription>
      </Alert>

      <form
        v-else
        class="mt-6 flex flex-col gap-3"
        novalidate
        @submit.prevent="submitForgotPassword"
      >
        <p
          v-if="globalError"
          role="alert"
          class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ globalError }}
        </p>

        <Alert
          v-if="googleAccountError"
          variant="destructive"
          class="break-words"
        >
          <AlertTitle>Không hỗ trợ mật khẩu Bookora</AlertTitle>
          <AlertDescription>{{ googleAccountError }}</AlertDescription>
          <Button as-child variant="outline" class="mt-4 w-full sm:w-auto">
            <RouterLink :to="{ name: 'customer-login' }">
              Đăng nhập với Google
            </RouterLink>
          </Button>
        </Alert>

        <Field class="gap-1">
          <FieldLabel for="forgot-password-email">Email</FieldLabel>
          <div class="relative">
            <Mail
              aria-hidden="true"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
            />
            <Input
              id="forgot-password-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="Nhập email của bạn"
              class="h-11 rounded-lg bg-white pl-10"
              :aria-invalid="Boolean(fieldErrors.email)"
              :aria-describedby="
                fieldErrors.email ? 'forgot-password-email-error' : undefined
              "
            />
          </div>
          <div id="forgot-password-email-error" class="min-h-[18px] break-words">
            <FieldError
              :errors="[fieldErrors.email ?? undefined]"
              class="text-xs leading-[18px]"
            />
          </div>
        </Field>

        <TurnstileWidget
          ref="turnstileWidget"
          action="password-reset"
          :disabled="hasTurnstileConfigurationError"
          @verified="handleTurnstileVerified"
          @expired="
            resetTurnstile(
              'Phiên xác minh đã hết hạn. Vui lòng xác minh lại.',
            )
          "
          @error="
            resetTurnstile('Xác minh bảo mật thất bại. Vui lòng thử lại.')
          "
        />
        <p
          v-if="turnstileError"
          role="alert"
          class="text-xs text-destructive"
        >
          {{ turnstileError }}
        </p>

        <Button
          type="submit"
          :disabled="isSubmitting"
          class="h-11 rounded-lg bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
        >
          {{ isSubmitting ? "Đang gửi..." : "Gửi liên kết đặt lại mật khẩu" }}
        </Button>
      </form>

      <RouterLink
        :to="{ name: 'customer-login' }"
        class="mt-6 inline-flex items-center gap-2 self-start text-sm font-medium text-[var(--bookora-green)] hover:underline"
      >
        <ArrowLeft aria-hidden="true" class="size-4" />
        Quay lại đăng nhập
      </RouterLink>
    </div>
  </section>
</template>
