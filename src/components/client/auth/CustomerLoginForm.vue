<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole, Mail } from "@lucide/vue";
import { useQueryClient } from "@tanstack/vue-query";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import type { LoginDto } from "@/api/generated/models";
import { AuthLoginBody } from "@/api/generated/zod/auth/auth";
import { syncAuthMeQuery } from "@/api/query-cache";
import TurnstileWidget from "@/components/common/TurnstileWidget.vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  getCustomerAuthErrorMessage,
  getGoogleAuthErrorMessage,
  startGoogleAuth,
} from "@/features/auth/customer-auth";
import { env } from "@/lib/env";
import { customerLandingRouteForUserType, safeRedirectForUser } from "@/router";
import { useAuthStore } from "@/stores/auth.store";
import AuthBrand from "./AuthBrand.vue";
import GoogleAuthButton from "./GoogleAuthButton.vue";

type LoginField = "email" | "password";

const REMEMBERED_EMAIL_KEY = "bookora.remembered_email";
const LOGIN_ERROR_TOAST_ID = "customer-login-auth-error";
const authStore = useAuthStore();
const queryClient = useQueryClient();
const route = useRoute();
const router = useRouter();
const email = ref("");
const password = ref("");
const rememberMe = ref(false);
const showPassword = ref(false);
const isSubmitting = ref(false);
const globalError = ref<string | null>(null);
const turnstileToken = ref("");
const turnstileError = ref<string | null>(null);
const turnstileWidget = ref<InstanceType<typeof TurnstileWidget> | null>(null);
const fieldErrors = reactive<Record<LoginField, string | null>>({
  email: null,
  password: null,
});

const hasTurnstileConfigurationError = computed(
  () => env.turnstileEnabled && env.turnstileSiteKey.length === 0,
);

function clearCredentialError(field: LoginField): void {
  fieldErrors[field] = null;
  globalError.value = null;
}

watch(email, () => clearCredentialError("email"));
watch(password, () => clearCredentialError("password"));

onMounted(() => {
  try {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      email.value = rememberedEmail;
      rememberMe.value = true;
    }
  } catch {
    // Storage is optional UX only.
  }

  globalError.value = getGoogleAuthErrorMessage(route.query.error);
  if (globalError.value) {
    toast.error(globalError.value, { id: LOGIN_ERROR_TOAST_ID });
  }
  if (route.query.registered === "1")
    toast.success("Đăng ký thành công. Vui lòng đăng nhập.");

  if (route.query.error || route.query.registered) {
    const { error: _error, registered: _registered, ...query } = route.query;
    void router.replace({ path: route.path, query }).catch(() => undefined);
  }
});

function handleTurnstileVerified(token: string): void {
  turnstileToken.value = token;
  turnstileError.value = null;
}

function resetTurnstile(message: string): void {
  turnstileToken.value = "";
  turnstileError.value = message;
  turnstileWidget.value?.reset?.();
  toast.error(message, { id: LOGIN_ERROR_TOAST_ID });
}

function validateLogin(): LoginDto | null {
  fieldErrors.email = null;
  fieldErrors.password = null;
  globalError.value = null;
  turnstileError.value = null;

  const payload: LoginDto = {
    email: email.value.trim(),
    password: password.value,
    ...(turnstileToken.value ? { turnstileToken: turnstileToken.value } : {}),
  };
  const result = AuthLoginBody.safeParse(payload);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
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
    return null;
  }

  return result.data;
}

async function submitLogin(): Promise<void> {
  if (isSubmitting.value) return;
  const payload = validateLogin();
  if (!payload) return;

  if (hasTurnstileConfigurationError.value) {
    turnstileError.value = "Thiếu cấu hình Turnstile. Vui lòng thử lại sau.";
    toast.error(turnstileError.value, { id: LOGIN_ERROR_TOAST_ID });
    return;
  }
  if (env.turnstileEnabled && !turnstileToken.value) {
    turnstileError.value = "Vui lòng hoàn tất xác minh bảo mật.";
    toast.error(turnstileError.value, { id: LOGIN_ERROR_TOAST_ID });
    return;
  }

  isSubmitting.value = true;
  try {
    const user = await authStore.login(payload);
    syncAuthMeQuery(queryClient, user);

    try {
      if (rememberMe.value)
        localStorage.setItem(REMEMBERED_EMAIL_KEY, payload.email);
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Storage is optional UX only.
    }

    await router.replace(
      safeRedirectForUser(
        router,
        route.query.returnTo ?? route.query.redirect,
        user.type,
      ) ??
        customerLandingRouteForUserType(user.type),
    );
  } catch (error: unknown) {
    const mapped = getCustomerAuthErrorMessage(error, "login");
    if (mapped.placement === "turnstile") resetTurnstile(mapped.message);
    else {
      globalError.value = mapped.message;
      turnstileToken.value = "";
      turnstileWidget.value?.reset?.();
      toast.error(mapped.message, { id: LOGIN_ERROR_TOAST_ID });
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section
    class="auth-form-panel min-h-0 bg-white"
    aria-labelledby="customer-login-heading"
  >
    <div
      class="auth-login-content mx-auto flex min-h-full w-full max-w-[480px] flex-col justify-center px-6 py-7 sm:px-8 md:px-10 md:py-5"
    >
      <AuthBrand class="auth-login-brand" />

      <div class="auth-login-heading mt-3">
        <h1
          id="customer-login-heading"
          class="text-[1.875rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--bookora-auth-ink)]"
        >
          Chào mừng trở lại!
        </h1>
        <p class="mt-1.5 text-sm text-[var(--bookora-auth-muted)]">
          Đăng nhập để tiếp tục hành trình cùng Bookora.
        </p>
      </div>

      <form
        class="auth-login-form mt-2 flex flex-col gap-0.5"
        novalidate
        @submit.prevent="submitLogin"
      >
        <GoogleAuthButton
          label="Đăng nhập với Google"
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

        <Field class="gap-1">
          <FieldLabel for="customer-login-email">Email</FieldLabel>
          <div class="relative">
            <Mail
              aria-hidden="true"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
            />
            <Input
              id="customer-login-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="Nhập email của bạn"
              class="h-11 rounded-lg bg-white pl-10"
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

        <Field class="gap-1">
          <FieldLabel for="customer-login-password">Mật khẩu</FieldLabel>
          <div class="relative">
            <LockKeyhole
              aria-hidden="true"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]"
            />
            <Input
              id="customer-login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Nhập mật khẩu"
              class="h-11 rounded-lg bg-white px-10"
              :aria-invalid="Boolean(fieldErrors.password)"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-11 w-11 text-[var(--bookora-auth-muted)] hover:bg-transparent hover:text-[var(--bookora-green)]"
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

        <div
          class="flex items-center justify-between gap-4 text-[13px] sm:text-sm"
        >
          <label
            for="customer-login-remember"
            class="flex cursor-pointer items-center gap-2 text-[var(--bookora-auth-ink)]"
          >
            <Checkbox id="customer-login-remember" v-model="rememberMe" />
            <span>Ghi nhớ email</span>
          </label>
          <RouterLink
            to="/forgot-password"
            class="font-medium text-[var(--bookora-green)] hover:underline"
            >Quên mật khẩu?</RouterLink
          >
        </div>

        <TurnstileWidget
          ref="turnstileWidget"
          class="max-w-full"
          action="login"
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
        >
          {{ isSubmitting ? "Đang đăng nhập..." : "Đăng nhập" }}
        </Button>

        <p
          class="mb-2 mt-3 text-center text-[13px] text-[var(--bookora-auth-muted)] sm:text-sm"
        >
          Chưa có tài khoản?
          <RouterLink
            to="/register"
            class="font-semibold text-[var(--bookora-green)] hover:underline"
            >Đăng ký ngay</RouterLink
          >
        </p>
      </form>
    </div>
  </section>
</template>

<style scoped>
@media (min-width: 1024px) and (max-height: 800px) {
  .auth-login-heading h1 {
    font-size: 1.75rem;
  }

  .auth-login-brand :deep(svg) {
    width: 2.25rem;
    height: 2.25rem;
  }
}
</style>
