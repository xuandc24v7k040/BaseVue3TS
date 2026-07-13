<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "@lucide/vue";
import { computed, reactive, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import type { RegisterDto } from "@/api/generated/models";
import { AuthRegisterBody } from "@/api/generated/zod/auth/auth";
import { registerCustomer } from "@/api/modules/auth.api";
import TurnstileWidget from "@/components/common/TurnstileWidget.vue";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  getCustomerAuthErrorMessage,
  startGoogleAuth,
} from "@/features/auth/customer-auth";
import { env } from "@/lib/env";
import AuthBrand from "./AuthBrand.vue";
import GoogleAuthButton from "./GoogleAuthButton.vue";

type RegisterField = "fullName" | "email" | "password" | "confirmPassword";

const REGISTER_ERROR_TOAST_ID = "customer-register-auth-error";
const router = useRouter();
const fullName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isSubmitting = ref(false);
const globalError = ref<string | null>(null);
const turnstileToken = ref("");
const turnstileError = ref<string | null>(null);
const turnstileWidget = ref<InstanceType<typeof TurnstileWidget> | null>(null);
const fieldErrors = reactive<Record<RegisterField, string | null>>({
  fullName: null,
  email: null,
  password: null,
  confirmPassword: null,
});

const hasTurnstileConfigurationError = computed(
  () => env.turnstileEnabled && env.turnstileSiteKey.length === 0,
);

function clearFormError(field: RegisterField): void {
  fieldErrors[field] = null;
  globalError.value = null;
}

watch(fullName, () => clearFormError("fullName"));
watch(email, () => clearFormError("email"));
watch(password, () => {
  clearFormError("password");
  fieldErrors.confirmPassword = null;
});
watch(confirmPassword, () => clearFormError("confirmPassword"));

function handleTurnstileVerified(token: string): void {
  turnstileToken.value = token;
  turnstileError.value = null;
}

function resetTurnstile(message: string): void {
  turnstileToken.value = "";
  turnstileError.value = message;
  turnstileWidget.value?.reset?.();
  toast.error(message, { id: REGISTER_ERROR_TOAST_ID });
}

function validateRegistration(): RegisterDto | null {
  for (const field of Object.keys(fieldErrors) as RegisterField[])
    fieldErrors[field] = null;
  globalError.value = null;
  turnstileError.value = null;

  const payload: RegisterDto = {
    fullName: fullName.value.trim(),
    email: email.value.trim(),
    password: password.value,
    ...(turnstileToken.value ? { turnstileToken: turnstileToken.value } : {}),
  };
  const result = AuthRegisterBody.safeParse(payload);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === "fullName" && !fieldErrors.fullName) {
        fieldErrors.fullName = fullName.value.trim()
          ? "Họ và tên cần ít nhất 2 ký tự."
          : "Vui lòng nhập họ và tên.";
      }
      if (field === "email" && !fieldErrors.email) {
        fieldErrors.email = email.value.trim()
          ? "Email không đúng định dạng."
          : "Vui lòng nhập email.";
      }
      if (field === "password" && !fieldErrors.password) {
        fieldErrors.password = password.value
          ? "Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số."
          : "Vui lòng nhập mật khẩu.";
      }
    }
  }

  if (!confirmPassword.value)
    fieldErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  else if (confirmPassword.value !== password.value)
    fieldErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";

  return result.success && !fieldErrors.confirmPassword ? result.data : null;
}

async function submitRegistration(): Promise<void> {
  if (isSubmitting.value) return;
  const payload = validateRegistration();
  if (!payload) return;

  if (hasTurnstileConfigurationError.value) {
    turnstileError.value = "Thiếu cấu hình Turnstile. Vui lòng thử lại sau.";
    toast.error(turnstileError.value, { id: REGISTER_ERROR_TOAST_ID });
    return;
  }
  if (env.turnstileEnabled && !turnstileToken.value) {
    turnstileError.value = "Vui lòng hoàn tất xác minh bảo mật.";
    toast.error(turnstileError.value, { id: REGISTER_ERROR_TOAST_ID });
    return;
  }

  isSubmitting.value = true;
  try {
    await registerCustomer(payload);
    turnstileWidget.value?.reset?.();
    await router.replace({
      name: "customer-login",
      query: { registered: "1" },
    });
  } catch (error: unknown) {
    const mapped = getCustomerAuthErrorMessage(error, "register");
    if (mapped.placement === "turnstile") resetTurnstile(mapped.message);
    else {
      globalError.value = mapped.message;
      turnstileToken.value = "";
      turnstileWidget.value?.reset?.();
      toast.error(mapped.message, { id: REGISTER_ERROR_TOAST_ID });
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section
    class="auth-register-panel min-h-0 bg-white"
    aria-labelledby="customer-register-heading"
  >
    <div
      class="auth-register-content mx-auto flex w-full max-w-[480px] flex-col px-6 py-7 sm:px-8 md:px-10 md:py-8"
    >
      <AuthBrand />

      <div class="mt-4">
        <h1
          id="customer-register-heading"
          class="text-[1.875rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--bookora-auth-ink)]"
        >
          Tạo tài khoản mới
        </h1>
        <p class="mt-1.5 text-sm text-[var(--bookora-auth-muted)]">
          Tham gia Bookora và bắt đầu hành trình của bạn.
        </p>
      </div>

      <form
        class="auth-register-form mt-3 flex flex-col gap-2"
        novalidate
        @submit.prevent="submitRegistration"
      >
        <GoogleAuthButton
          label="Đăng ký với Google"
          :disabled="isSubmitting"
          @click="startGoogleAuth"
        />

        <div class="flex items-center gap-3" aria-hidden="true">
          <Separator class="flex-1" />
          <span class="text-xs text-[var(--bookora-auth-muted)]">hoặc</span>
          <Separator class="flex-1" />
        </div>

        <div data-error-slot="global" class="h-[70px] sm:h-[52px]">
          <p
            v-if="globalError"
            role="alert"
            class="rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-[18px] text-destructive"
          >
            {{ globalError }}
          </p>
        </div>

        <div data-register-fields class="flex min-w-0 flex-col gap-2">
          <Field class="min-w-0 gap-1">
            <FieldLabel for="customer-register-name">Họ và tên</FieldLabel>
            <div class="relative min-w-0 w-full">
              <UserRound
                aria-hidden="true"
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
              />
              <Input
                id="customer-register-name"
                v-model="fullName"
                autocomplete="name"
                placeholder="Nhập họ và tên"
                class="h-11 w-full min-w-0 rounded-lg bg-white pl-10"
                :aria-invalid="Boolean(fieldErrors.fullName)"
              />
            </div>
            <div data-error-slot="fullName" class="min-h-[18px]">
              <FieldError
                :errors="[fieldErrors.fullName ?? undefined]"
                class="text-xs leading-[18px]"
              />
            </div>
          </Field>

          <Field class="min-w-0 gap-1">
            <FieldLabel for="customer-register-email">Email</FieldLabel>
            <div class="relative min-w-0 w-full">
              <Mail
                aria-hidden="true"
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
              />
              <Input
                id="customer-register-email"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="Nhập email"
                class="h-11 w-full min-w-0 rounded-lg bg-white pl-10"
                :aria-invalid="Boolean(fieldErrors.email)"
              />
            </div>
            <div data-error-slot="email" class="min-h-[18px]">
              <FieldError
                :errors="[fieldErrors.email ?? undefined]"
                class="text-xs leading-[18px]"
              />
            </div>
          </Field>
        </div>

        <Field class="gap-1">
          <FieldLabel for="customer-register-password">Mật khẩu</FieldLabel>
          <div class="relative">
            <LockKeyhole
              aria-hidden="true"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
            />
            <Input
              id="customer-register-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Tạo mật khẩu (tối thiểu 8 ký tự)"
              class="h-11 rounded-lg bg-white px-10"
              :aria-invalid="Boolean(fieldErrors.password)"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-11 w-11 text-[var(--bookora-auth-muted)] hover:bg-transparent"
              :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" aria-hidden="true" class="size-4" />
              <Eye v-else aria-hidden="true" class="size-4" />
            </Button>
          </div>
          <div data-error-slot="password" class="min-h-[18px]">
            <FieldError
              :errors="[fieldErrors.password ?? undefined]"
              class="text-xs leading-[18px]"
            />
          </div>
        </Field>

        <Field class="gap-1">
          <FieldLabel for="customer-register-confirm-password"
            >Xác nhận mật khẩu</FieldLabel
          >
          <div class="relative">
            <LockKeyhole
              aria-hidden="true"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
            />
            <Input
              id="customer-register-confirm-password"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Nhập lại mật khẩu"
              class="h-11 rounded-lg bg-white px-10"
              :aria-invalid="Boolean(fieldErrors.confirmPassword)"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-11 w-11 text-[var(--bookora-auth-muted)] hover:bg-transparent"
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
          <div data-error-slot="confirmPassword" class="min-h-[18px]">
            <FieldError
              :errors="[fieldErrors.confirmPassword ?? undefined]"
              class="text-xs leading-[18px]"
            />
          </div>
        </Field>

        <TurnstileWidget
          ref="turnstileWidget"
          class="max-w-full"
          action="register"
          :disabled="hasTurnstileConfigurationError"
          @verified="handleTurnstileVerified"
          @expired="
            resetTurnstile('Phiên xác minh đã hết hạn. Vui lòng xác minh lại.')
          "
          @error="
            resetTurnstile('Xác minh bảo mật thất bại. Vui lòng thử lại.')
          "
        />
        <div data-error-slot="turnstile" class="min-h-[18px]">
          <p
            v-if="turnstileError"
            role="alert"
            class="text-xs leading-[18px] text-destructive"
          >
            {{ turnstileError }}
          </p>
        </div>

        <Button
          type="submit"
          :disabled="isSubmitting"
          class="h-11 w-full rounded-lg bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
          >{{ isSubmitting ? "Đang đăng ký..." : "Đăng ký" }}</Button
        >

        <p
          class="text-center mt-2 text-[13px] text-[var(--bookora-auth-muted)] sm:text-sm"
        >
          Đã có tài khoản?
          <RouterLink
            to="/login"
            class="font-semibold text-[var(--bookora-green)] hover:underline"
            >Đăng nhập ngay</RouterLink
          >
        </p>
      </form>
    </div>
  </section>
</template>

<style scoped>
@media (min-width: 1024px) and (max-height: 800px) {
  .auth-register-content {
    padding-block: 1.5rem;
  }

  .auth-register-content h1 {
    font-size: 1.75rem;
  }

  .auth-register-form {
    gap: 0.375rem;
  }
}
</style>
